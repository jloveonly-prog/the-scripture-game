// TASK-023-5 · FR-075 · FR-006 · FR-008 · FR-024~026 · FR-039 · FR-064 · R-14 — 분배·clear 처리 순서·중계 화이트리스트·봇 구동 검사.
import { describe, expect, it, vi } from 'vitest';
import type { RosterEntry } from '../../../worker/src/env.ts';
import { createRoomState, type RoomContext } from '../../../worker/src/room/room-state.ts';
import { createRoomTimers } from '../../../worker/src/room/timers.ts';
import { handleReady, onRoundGo } from '../../../worker/src/room/round-flow.ts';
import { onBotTick, onSpiritsTimer, routeMessage } from '../../../worker/src/room/message-router.ts';
import { acquireArmor } from '../../../worker/src/room/armor.ts';

type Sent = { slot: number; type: string; data?: Record<string, any>; error?: Record<string, any> };
const human = (slot: 1 | 2): RosterEntry => ({
  slot, guestId: `guest-${slot}-0000-0000`, nickname: `P${slot}`, heroId: slot === 1 ? 'david' : 'peter', isBot: false, botLevel: null,
  rating: 1000, roundsPlayed: 0, lossStreak: 0,
});
const botEntry: RosterEntry = { slot: 2, guestId: null, nickname: null, heroId: 'paul', isBot: true, botLevel: 'easy', rating: null, roundsPlayed: 0, lossStreak: 0 };
const EMPTY = '0'.repeat(200);
const DANGER = '1' + '0'.repeat(199);

function makeRoom(opts: { bot?: boolean; start?: boolean; rand?: number } = {}) {
  const sent: Sent[] = [];
  const bot = {
    tick: vi.fn((): Array<{ type: 'state' | 'clear' | 'topout'; data: Record<string, unknown> }> => []),
    receiveAttack: vi.fn(), applyEffect: vi.fn(), freeze: vi.fn(), resume: vi.fn(), toppedOut: false,
  };
  const room = createRoomState({
    roomId: 'room-1', mode: opts.bot ? 'bot' : 'random', botLevel: opts.bot ? 'easy' : null, createdAt: 0,
    roster: [human(1), opts.bot ? botEntry : human(2)],
  });
  for (const p of room.players) { p.joined = true; p.connected = true; }
  const deps = {
    send: (slot: 1 | 2, frame: string) => sent.push({ slot, ...JSON.parse(frame) }),
    closeAll: vi.fn(), timers: createRoomTimers(() => undefined), rand: () => opts.rand ?? 0.3, randomSeed: () => 777,
    createBot: vi.fn(() => bot), planBotQuizAnswer: vi.fn(() => ({ choice: 0 as const, delayMs: 1 })),
    recordMatch: vi.fn(async () => ({ saved: true, slots: { 1: {} as any, 2: {} as any } })), recordPractice: vi.fn(), roomClosed: vi.fn(), log: vi.fn(),
  };
  const ctx = { room, deps } as unknown as RoomContext;
  if (opts.start !== false) {
    handleReady(ctx, 1, 0);
    if (!opts.bot) handleReady(ctx, 2, 0);
    onRoundGo(ctx, 3000);
    sent.length = 0;
  }
  return { ctx, sent, bot, deps, of: (type: string, slot?: number) => sent.filter((m) => m.type === type && (slot === undefined || m.slot === slot)) };
}
const clearMsg = (over: Record<string, unknown> = {}) => ({ seq: 1, lines: 2, combo: 0, b2b: false, tspin: false, pieceCount: 10, specials: [], ...over });

describe('state 중계 (R-14, FR-006)', () => {
  it('화이트리스트 재직렬화: garbageIn·추가 필드 제외, 역행 seq는 조용히 버림', async () => {
    const { ctx, sent, of } = makeRoom();
    await routeMessage(ctx, 1, 'state', { seq: 5, board: EMPTY, active: { type: 3, rot: 1, x: 4, y: 0, extra: 1 }, score: 120, garbageIn: 0, hack: true }, 3100);
    expect(of('opponentState')).toEqual([{ slot: 2, type: 'opponentState', success: true, data: { slot: 1, seq: 5, board: EMPTY, active: { type: 3, rot: 1, x: 4, y: 0 }, score: 120 } }]);
    sent.length = 0;
    await routeMessage(ctx, 1, 'state', { seq: 5, board: EMPTY, active: null, score: 0, garbageIn: 0 }, 3200);
    expect(sent).toEqual([]);
  });

  it('garbageIn 증가분만큼 대기 쓰레기 장부 감소 (D-16)', async () => {
    const { ctx } = makeRoom();
    ctx.room.players[0].pendingGarbage = 3;
    await routeMessage(ctx, 1, 'state', { seq: 1, board: EMPTY, active: null, score: 0, garbageIn: 2 }, 3100);
    expect(ctx.room.players[0].pendingGarbage).toBe(1);
  });
});

describe('clear 처리 순서 ①~⑧ (API-204)', () => {
  it('2줄 삭제 → 게이지 +10, 상대에게 attack(쓰레기 1·1등급 영), 보낸 쪽 attackSent·playerStatus', async () => {
    const { ctx, of } = makeRoom();
    await routeMessage(ctx, 1, 'clear', clearMsg(), 3500);
    const attack = of('attack', 2)[0];
    expect(attack.data).toMatchObject({ attackId: 1, fromSlot: 1, garbage: 1, reflected: false });
    expect(['unclean_spirit', 'deaf_dumb_spirit']).toContain(attack.data!.spiritId);
    expect(of('effect', 1).some((m) => m.data!.kind === 'attackSent')).toBe(true);
    expect(of('playerStatus', 1).at(-1)!.data!.faith).toBe(10);
    expect(ctx.room.players[1].pendingGarbage).toBe(1);
  });

  it('상쇄: 내 대기 쓰레기를 먼저 줄이고 잔여만 보낸다 (offset effect)', async () => {
    const { ctx, of } = makeRoom();
    ctx.room.players[0].pendingGarbage = 3;
    await routeMessage(ctx, 1, 'clear', clearMsg({ lines: 4 }), 3500);
    expect(of('effect', 1).find((m) => m.data!.kind === 'offset')!.data!.action).toEqual({ type: 'offset', rows: 3 });
    expect(of('attack', 2)[0].data!.garbage).toBe(1);
  });

  it('1줄 삭제(공격력 0)는 게이지만, 진행 검증 실패는 SEQ_REJECTED·PROGRESS_REJECTED', async () => {
    const { ctx, of, sent } = makeRoom();
    await routeMessage(ctx, 1, 'clear', clearMsg({ lines: 1 }), 3500);
    expect(of('attack')).toHaveLength(0);
    await routeMessage(ctx, 1, 'clear', clearMsg({ seq: 1, pieceCount: 20 }), 3600);
    expect(sent.at(-1)).toMatchObject({ type: 'error', error: { code: 'SEQ_REJECTED', ref: 'clear' } });
    await routeMessage(ctx, 1, 'clear', clearMsg({ seq: 2, pieceCount: 20, lines: 4, combo: 3 }), 3700);
    expect(sent.at(-1)).toMatchObject({ type: 'error', error: { code: 'PROGRESS_REJECTED' } });
  });

  it('카운트다운·종료 후 clear → GAME_NOT_RUNNING', async () => {
    const { ctx, sent } = makeRoom({ start: false });
    handleReady(ctx, 1, 0);
    handleReady(ctx, 2, 0);
    await routeMessage(ctx, 1, 'clear', clearMsg(), 100);
    expect(sent.at(-1)).toMatchObject({ type: 'error', error: { code: 'GAME_NOT_RUNNING', ref: 'clear' } });
  });

  it('상대 방패 → 쓰레기 0·영 없음, 상대 검 → 보낸 쪽으로 되돌아옴(reflected)', async () => {
    const shield = makeRoom();
    shield.ctx.room.players[1].armor.wards.shield = true;
    await routeMessage(shield.ctx, 1, 'clear', clearMsg({ lines: 3 }), 3500);
    expect(shield.of('attack', 2)[0].data).toMatchObject({ garbage: 0, spiritId: null });
    const sword = makeRoom();
    sword.ctx.room.players[1].armor.wards.reflect = true;
    await routeMessage(sword.ctx, 1, 'clear', clearMsg({ lines: 3 }), 3500);
    expect(sword.of('attack', 2)).toHaveLength(0);
    expect(sword.of('attack', 1)[0].data).toMatchObject({ fromSlot: 2, garbage: 2, reflected: true });
    expect(sword.of('effect').some((m) => m.data!.kind === 'reflect')).toBe(true);
  });

  it('상대 투구 장전 → 시야 영 무효(쓰레기는 적용)', async () => {
    const { ctx, of } = makeRoom();
    ctx.room.players[1].armor.wards.vision = 1;
    await routeMessage(ctx, 1, 'clear', clearMsg(), 3500);
    expect(of('attack', 2)[0].data).toMatchObject({ garbage: 1, spiritId: null });
    expect(ctx.room.players[1].armor.wards.vision).toBe(0);
  });

  it('특수 칸 위조는 PROGRESS_REJECTED (해당 칸만 무효, 공격은 정상)', async () => {
    const { ctx, of, sent } = makeRoom();
    await routeMessage(ctx, 1, 'clear', clearMsg({ specials: [{ kind: 'jericho', pieceIndex: 3 }] }), 3500);
    expect(sent.some((m) => m.type === 'error' && m.error!.code === 'PROGRESS_REJECTED')).toBe(true);
    expect(of('attack', 2)).toHaveLength(1);
  });
});

describe('skill · armor · 예수님 · reaction · quit', () => {
  it('skill: 게이지 부족 → FAITH_INSUFFICIENT, 충분하면 effect 양측 + playerStatus', async () => {
    const { ctx, sent, of } = makeRoom();
    await routeMessage(ctx, 1, 'skill', { skillId: 'hero_david' }, 3500);
    expect(sent.at(-1)).toMatchObject({ type: 'error', error: { code: 'FAITH_INSUFFICIENT', ref: 'skill' } });
    ctx.room.players[0].faith.faith = 50;
    await routeMessage(ctx, 1, 'skill', { skillId: 'hero_david' }, 3600);
    expect(of('effect').map((m) => [m.slot, m.data!.kind, m.data!.targetSlot])).toEqual([[1, 'hero', 2], [2, 'hero', 2]]);
    expect(ctx.room.usage).toEqual({ 'hero:david': 1 });
  });

  it('armor: 보유 갑주 사용 → effect + 소모, 미보유 → ARMOR_NOT_OWNED', async () => {
    const { ctx, sent, of } = makeRoom();
    await routeMessage(ctx, 1, 'armor', { armorId: 'shield_of_faith' }, 3500);
    expect(sent.at(-1)).toMatchObject({ error: { code: 'ARMOR_NOT_OWNED', ref: 'armor' } });
    acquireArmor(ctx.room.players[0].armor, 'shield_of_faith');
    await routeMessage(ctx, 1, 'armor', { armorId: 'shield_of_faith' }, 3600);
    expect(of('effect', 1)[0].data).toMatchObject({ kind: 'armor', id: 'shield_of_faith', verseRef: 'Ephesians 6:16' });
    expect(ctx.room.players[0].armor.wards.shield).toBe(true);
  });

  it('예수님 이벤트: 게이지 100 + 위험선 state → 경기당 1회 jesus effect', async () => {
    const { ctx, of } = makeRoom();
    ctx.room.players[0].faith.faith = 100;
    await routeMessage(ctx, 1, 'state', { seq: 1, board: DANGER, active: null, score: 0, garbageIn: 0 }, 3500);
    await routeMessage(ctx, 1, 'state', { seq: 2, board: DANGER, active: null, score: 0, garbageIn: 0 }, 3600);
    const jesus = of('effect', 1).filter((m) => m.data!.kind === 'jesus');
    expect(jesus).toHaveLength(1);
    expect(jesus[0].data).toMatchObject({ id: 'overcome_the_world', verseRef: 'John 16:33', action: { type: 'overcome' } });
    expect(ctx.room.players[0].faith.faith).toBe(100);
  });

  it('reaction: 사람 대 사람만 중계, 그 외 값 INVALID_REACTION', async () => {
    const { ctx, sent, of } = makeRoom();
    await routeMessage(ctx, 1, 'reaction', { reactionId: 'amen' }, 3500);
    expect(of('reaction', 2)[0].data).toEqual({ fromSlot: 1, reactionId: 'amen' });
    await routeMessage(ctx, 1, 'reaction', { reactionId: 'hello' }, 3600);
    expect(sent.at(-1)).toMatchObject({ error: { code: 'INVALID_REACTION' } });
    const b = makeRoom({ bot: true });
    await routeMessage(b.ctx, 1, 'reaction', { reactionId: 'halo' }, 3500);
    expect(b.of('reaction')).toHaveLength(0);
  });

  it('대전 방 quit → NOT_ALLOWED_IN_MODE, 알 수 없는 type → INVALID_MESSAGE', async () => {
    const { ctx, sent } = makeRoom();
    await routeMessage(ctx, 1, 'quit', {}, 3500);
    expect(sent.at(-1)).toMatchObject({ error: { code: 'NOT_ALLOWED_IN_MODE', ref: 'quit' } });
    await routeMessage(ctx, 1, 'teleport', {}, 3500);
    expect(sent.at(-1)).toMatchObject({ error: { code: 'INVALID_MESSAGE' } });
  });

  it('topout 메시지 → roundEnd, 두 번째 topout은 GAME_NOT_RUNNING', async () => {
    const { ctx, of, sent } = makeRoom();
    await routeMessage(ctx, 2, 'topout', { seq: 1, pieceCount: 3 }, 9000);
    await routeMessage(ctx, 1, 'topout', { seq: 1, pieceCount: 3 }, 9001);
    expect(of('roundEnd')).toHaveLength(2);
    expect(sent.at(-1)).toMatchObject({ slot: 1, error: { code: 'GAME_NOT_RUNNING', ref: 'topout' } });
  });
});

describe('봇 구동 (FR-021, devguide §7.4) · 영 종료 타이머', () => {
  it('봇 state → 사람에게 opponentState, 봇 clear → 같은 판정으로 사람에게 attack', async () => {
    const { ctx, bot, of, deps } = makeRoom({ bot: true });
    bot.tick.mockReturnValueOnce([
      { type: 'state', data: { seq: 1, board: EMPTY, active: null, score: 10, garbageIn: 0 } },
      { type: 'clear', data: clearMsg({ seq: 2, lines: 4 }) },
    ]);
    await onBotTick(ctx, 3500);
    expect(of('opponentState', 1)[0].data).toMatchObject({ slot: 2, seq: 1, score: 10 });
    expect(of('attack', 1)[0].data).toMatchObject({ fromSlot: 2, garbage: 4 });
    expect(deps.timers.at('botTick')).toBe(3550);
  });

  it('사람 공격은 bot.receiveAttack, 다윗 스킬은 bot.applyEffect', async () => {
    const { ctx, bot } = makeRoom({ bot: true });
    await routeMessage(ctx, 1, 'clear', clearMsg({ lines: 3 }), 3500);
    expect(bot.receiveAttack).toHaveBeenCalledWith(expect.objectContaining({ garbage: 2 }));
    ctx.room.players[0].faith.faith = 100;
    await routeMessage(ctx, 1, 'skill', { skillId: 'hero_david' }, 3600);
    expect(bot.applyEffect).toHaveBeenCalledWith({ kind: 'hero', id: 'hero_david', action: { type: 'destroyTopBlocks', count: 3 } });
  });

  it('봇 tick 예외 → BOT_FAILURE 후 방 종료', async () => {
    const { ctx, bot, sent, deps } = makeRoom({ bot: true });
    bot.tick.mockImplementationOnce(() => { throw new Error('bot crashed'); });
    await onBotTick(ctx, 3500);
    expect(sent.at(-1)).toMatchObject({ slot: 1, error: { code: 'BOT_FAILURE' } });
    expect(deps.closeAll).toHaveBeenCalled();
  });

  it('영 효과 만료 → spiritEnd effect', async () => {
    const { ctx, of } = makeRoom();
    await routeMessage(ctx, 1, 'clear', clearMsg(), 3500);
    const { spiritId, duration } = of('attack', 2)[0].data!;
    onSpiritsTimer(ctx, 3500 + duration);
    expect(of('effect', 2).find((m) => m.data!.kind === 'spiritEnd')!.data).toMatchObject({ id: spiritId, targetSlot: 2, bySlot: 1 });
  });
});
