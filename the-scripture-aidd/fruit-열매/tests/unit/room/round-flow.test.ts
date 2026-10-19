// TASK-023-5 · FR-075 · FR-005 · FR-007 · FR-009 · FR-023 · FR-047 · FR-062 — 3판 2선승·이탈·동시 topout·연습 종료·입장 마감 검사.
import { describe, expect, it, vi } from 'vitest';
import type { RoomInit, RosterEntry } from '../../../worker/src/env.ts';
import { createRoomState, type RoomContext } from '../../../worker/src/room/room-state.ts';
import { createRoomTimers } from '../../../worker/src/room/timers.ts';
import {
  endPractice, handleDisconnect, handleReady, handleTopout, onJoinTimeout, onNextRound, onRoundGo,
} from '../../../worker/src/room/round-flow.ts';

type Sent = { slot: number; type: string; data?: Record<string, any>; error?: Record<string, any> };

const human = (slot: 1 | 2, over: Partial<RosterEntry> = {}): RosterEntry => ({
  slot, guestId: `guest-${slot}-0000-0000`, nickname: `P${slot}`, heroId: slot === 1 ? 'david' : 'peter', isBot: false, botLevel: null,
  rating: 1000, roundsPlayed: 0, lossStreak: 0, ...over,
});
const botEntry: RosterEntry = { slot: 2, guestId: null, nickname: null, heroId: 'paul', isBot: true, botLevel: 'hard', rating: null, roundsPlayed: 0, lossStreak: 0 };
const slotResult = { ratingDelta: 16, rating: 1016, record: { maxCombo: 1, attackPerMin: 1, quizAccuracy: 0, mode: 'random' }, growth: null, achievements: [] };

function makeCtx(mode: RoomInit['mode'], roster: RosterEntry[]) {
  const sent: Sent[] = [];
  const bot = { tick: vi.fn(() => []), receiveAttack: vi.fn(), applyEffect: vi.fn(), freeze: vi.fn(), resume: vi.fn(), toppedOut: false };
  const room = createRoomState({ roomId: 'room-1', mode, botLevel: mode === 'bot' ? 'hard' : null, createdAt: 0, roster });
  for (const p of room.players) { p.joined = true; p.connected = true; }
  let seed = 100;
  const deps = {
    send: (slot: 1 | 2, frame: string) => sent.push({ slot, ...JSON.parse(frame) }),
    closeAll: vi.fn(), timers: createRoomTimers(() => undefined), rand: () => 0.5, randomSeed: () => (seed += 1),
    createBot: vi.fn(() => bot), planBotQuizAnswer: vi.fn(() => ({ choice: 0 as const, delayMs: 1 })),
    recordMatch: vi.fn(async () => ({ saved: true, slots: { 1: slotResult, 2: { ...slotResult, ratingDelta: -16, rating: 984 } } })),
    recordPractice: vi.fn(async () => ({ saved: true, record: { maxCombo: 0, attackPerMin: 0, quizAccuracy: 0, mode: 'practice' as const, playTimeMs: 5000 }, growth: null })),
    roomClosed: vi.fn(), log: vi.fn(),
  };
  const ctx = { room, deps } as unknown as RoomContext;
  return { ctx, sent, deps, bot, of: (type: string) => sent.filter((m) => m.type === type) };
}

function begin(ctx: RoomContext, now = 0): void {
  handleReady(ctx, 1, now);
  if (ctx.room.players.length > 1 && !ctx.room.players[1].isBot) handleReady(ctx, 2, now);
  onRoundGo(ctx, now + 3000);
}

describe('라운드 시작 (FR-005·FR-047·FR-062)', () => {
  it('사람 전원 ready → 같은 시드 start, 단계는 낮은 쪽, 은혜는 내 것만', () => {
    const { ctx, of } = makeCtx('random', [human(1, { roundsPlayed: 3 }), human(2, { roundsPlayed: 10, lossStreak: 3 })]);
    handleReady(ctx, 1, 1000);
    expect(of('start')).toHaveLength(0);
    handleReady(ctx, 2, 1000);
    const starts = of('start');
    expect(starts.map((s) => s.slot)).toEqual([1, 2]);
    expect(starts[0].data!.seed).toBe(starts[1].data!.seed);
    expect(starts[0].data).toMatchObject({ round: 1, countdown: 3000, startAt: 4000, stage: 1, grace: false, matchElapsedMs: 0, score: [0, 0] });
    expect(starts[1].data!.grace).toBe(true);
    expect(of('playerStatus')).toHaveLength(2);
    expect(ctx.room.phase).toBe('countdown');
    onRoundGo(ctx, 4000);
    expect(ctx.room.phase).toBe('playing');
    expect(ctx.deps.timers.at('autoQuiz')).toBe(94000);
  });

  it('시작 후 ready → GAME_NOT_RUNNING', () => {
    const { ctx, sent } = makeCtx('random', [human(1), human(2)]);
    begin(ctx);
    handleReady(ctx, 1, 5000);
    expect(sent.at(-1)).toMatchObject({ type: 'error', error: { code: 'GAME_NOT_RUNNING', ref: 'ready' } });
  });

  it('봇 대전: 사람 ready만으로 시작, 라운드마다 봇 생성(같은 시드·단계)', () => {
    const { ctx, deps } = makeCtx('bot', [human(1), botEntry]);
    handleReady(ctx, 1, 0);
    expect(deps.createBot).toHaveBeenCalledWith({ level: 'hard', seed: ctx.room.seed, stage: 0, startAt: 3000, matchElapsedMs: 0 });
    expect(deps.timers.has('botTick')).toBe(true);
  });
});

describe('3판 2선승 (FR-007)', () => {
  it('topout → roundEnd(상대 승) → 다음 라운드 새 시드·경과 → 2승이면 matchEnd + 기록 + 방 종료', async () => {
    const { ctx, of, deps } = makeCtx('random', [human(1), human(2)]);
    begin(ctx);
    const seed1 = ctx.room.seed;
    await handleTopout(ctx, 1, 10000);
    expect(of('roundEnd')[0].data).toMatchObject({ round: 1, winnerSlot: 2, reason: 'topout', score: [0, 1], nextRoundAt: 13000 });
    onNextRound(ctx, 13000);
    expect(ctx.room.seed).not.toBe(seed1);
    expect(of('start').at(-1)!.data).toMatchObject({ round: 2, matchElapsedMs: 13000, score: [0, 1] });
    onRoundGo(ctx, 16000);
    await handleTopout(ctx, 1, 30000);
    expect(of('roundEnd').at(-1)!.data).toMatchObject({ winnerSlot: 2, score: [0, 2], nextRoundAt: null });
    expect(deps.recordMatch).toHaveBeenCalledTimes(1);
    const outcome = deps.recordMatch.mock.calls[0][0];
    expect(outcome).toMatchObject({ mode: 'random', winnerSlot: 2, score: [0, 2], endReason: 'topout', durationMs: 27000 });
    expect(outcome.slots[0]).toMatchObject({ slot: 1, roundsDelta: 2, lossStreak: 2, isBot: false });
    expect(outcome.slots[1]).toMatchObject({ slot: 2, roundsDelta: 2, lossStreak: 0 });
    const ends = of('matchEnd');
    expect(ends.map((m) => m.slot)).toEqual([1, 2]);
    expect(ends[1].data).toMatchObject({ winnerSlot: 2, victoryVerseRef: '2 Timothy 4:7', ratingDelta: -16, saved: true });
    expect(ends[0].data!.victoryVerseRef).toBeNull();
    expect(deps.roomClosed).toHaveBeenCalledTimes(1);
    expect(deps.closeAll).toHaveBeenCalled();
    expect(ctx.room.phase).toBe('ended');
  });

  it('동시 topout: 먼저 도착한 쪽만 패배 (UC-015 E1)', async () => {
    const { ctx, of } = makeCtx('random', [human(1), human(2)]);
    begin(ctx);
    await handleTopout(ctx, 2, 9000);
    await handleTopout(ctx, 1, 9001);
    expect(of('roundEnd').filter((m) => m.slot === 1)).toHaveLength(1);
    expect(ctx.room.score).toEqual([1, 0]);
  });

  it('저장 실패여도 matchEnd는 보낸다 (saved false — UC-015 E2)', async () => {
    const { ctx, of, deps } = makeCtx('random', [human(1), human(2)]);
    deps.recordMatch.mockRejectedValueOnce(new Error('boom'));
    begin(ctx);
    ctx.room.score = [1, 0];
    await handleTopout(ctx, 2, 9000);
    expect(of('matchEnd')[0].data).toMatchObject({ saved: false, ratingDelta: null, winnerSlot: 1 });
  });
});

describe('이탈 (FR-009, UC-016)', () => {
  it('진행 중 이탈 → 남은 쪽 승리 reason disconnect, 이탈자 패배 기록', async () => {
    const { ctx, of, deps } = makeCtx('invite', [human(1), human(2)]);
    begin(ctx);
    await handleDisconnect(ctx, 2, 20000);
    expect(deps.recordMatch.mock.calls[0][0]).toMatchObject({ winnerSlot: 1, endReason: 'disconnect' });
    expect(of('matchEnd').map((m) => m.slot)).toEqual([1, 2]);
  });

  it('봇 대전에서 사람 이탈 → 봇 승리로 기록', async () => {
    const { ctx, deps } = makeCtx('bot', [human(1), botEntry]);
    begin(ctx);
    await handleDisconnect(ctx, 1, 20000);
    expect(deps.recordMatch.mock.calls[0][0]).toMatchObject({ mode: 'bot', winnerSlot: 2, endReason: 'disconnect' });
  });

  it('시작 전 이탈 → 남은 쪽에 OPPONENT_LEFT 후 방 무효 (기록 없음)', async () => {
    const { ctx, sent, deps } = makeCtx('random', [human(1), human(2)]);
    await handleDisconnect(ctx, 1, 100);
    expect(sent).toEqual([expect.objectContaining({ slot: 2, type: 'error', error: expect.objectContaining({ code: 'OPPONENT_LEFT' }) })]);
    expect(deps.recordMatch).not.toHaveBeenCalled();
    expect(deps.roomClosed).toHaveBeenCalled();
  });

  it('두 사람 모두 끊기면 무효 (UC-016 E1)', async () => {
    const { ctx, deps } = makeCtx('random', [human(1), human(2)]);
    begin(ctx);
    ctx.room.players[0].connected = false;
    await handleDisconnect(ctx, 2, 5000);
    expect(deps.recordMatch).not.toHaveBeenCalled();
    expect(ctx.room.closed).toBe(true);
  });

  it('입장 마감 15초: 들어온 쪽에 OPPONENT_LEFT', () => {
    const { ctx, sent } = makeCtx('random', [human(1), human(2)]);
    ctx.room.players[1].joined = false;
    ctx.room.players[1].connected = false;
    onJoinTimeout(ctx);
    expect(sent).toEqual([expect.objectContaining({ slot: 1, error: expect.objectContaining({ code: 'OPPONENT_LEFT' }) })]);
    expect(ctx.room.closed).toBe(true);
  });
});

describe('연습 (FR-023)', () => {
  it('topout·quit → 진행 기록만 저장, matchEnd mode practice winnerSlot null', async () => {
    const { ctx, of, deps } = makeCtx('practice', [human(1)]);
    begin(ctx);
    expect(of('start')[0].data!.stage).toBe(0);
    await endPractice(ctx, 'practiceEnd', 8000);
    expect(deps.recordPractice).toHaveBeenCalledWith(expect.objectContaining({ guestId: 'guest-1-0000-0000', roundsDelta: 1, playTimeMs: 5000 }));
    expect(of('matchEnd')[0].data).toMatchObject({ mode: 'practice', winnerSlot: null, reason: 'practiceEnd', ratingDelta: null, saved: true });
    expect(deps.recordMatch).not.toHaveBeenCalled();
    const t = makeCtx('practice', [human(1)]);
    begin(t.ctx);
    await handleTopout(t.ctx, 1, 9000);
    expect(t.of('matchEnd')[0].data!.reason).toBe('topout');
    expect(t.of('roundEnd')).toHaveLength(0);
  });
});
