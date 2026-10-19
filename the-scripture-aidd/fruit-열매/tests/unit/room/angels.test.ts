// TASK-021-6 · FR-075 · FR-035 · FR-028 — 천사 5종 소환 판정: 봉인·연습 모드 거부·게이지·쿨다운·서버 측 효과 검사.
import { describe, expect, it } from 'vitest';
import { angelsAllowed, performAngel, resolveAngel } from '../../../worker/src/room/angels.ts';
import { tryApplySpirit } from '../../../worker/src/room/interference.ts';
import { createRoomState, type PlayerState } from '../../../worker/src/room/room-state.ts';
import { spiritsById } from '../../../worker/src/content.ts';

function player(faith = 100): PlayerState {
  const room = createRoomState({
    roomId: 'r', mode: 'random', botLevel: null, createdAt: 0,
    roster: [{ slot: 1, guestId: 'g1', nickname: 'a', heroId: 'david', isBot: false, botLevel: null, rating: 1000, roundsPlayed: 0, lossStreak: 0 }],
  });
  room.players[0].faith.faith = faith;
  return room.players[0];
}
const BOARD_EMPTY = '0'.repeat(200);
const BOARD_WITH_GARBAGE = '0'.repeat(190) + '8888808888';

describe('천사 소환 판정', () => {
  it('angel_* 정의 조회와 알 수 없는 ID 거부', () => {
    expect(resolveAngel('angel_michael')?.cost).toBe(80);
    expect(performAngel(player(), 'angel_nobody', false, 0)).toEqual({ ok: false, code: 'INVALID_SKILL' });
  });

  it('연습 모드는 천사 불가 (OQ #4)', () => {
    expect(angelsAllowed(true)).toBe(false);
    expect(performAngel(player(), 'angel_gabriel', true, 0)).toEqual({ ok: false, code: 'NOT_ALLOWED_IN_MODE' });
  });

  it('바사 왕국의 군주 봉인 중 → ANGEL_SEALED + 남은 ms', () => {
    const p = player();
    tryApplySpirit(p.interference, spiritsById.get('prince_of_persia')!, 2, 0);
    expect(performAngel(p, 'angel_gabriel', false, 6000)).toEqual({ ok: false, code: 'ANGEL_SEALED', retryAfterMs: 15000 });
    expect(p.faith.faith).toBe(100);
  });

  it('게이지 부족·쿨다운 거부', () => {
    const p = player(25);
    expect(performAngel(p, 'angel_gabriel', false, 0)).toEqual({ ok: false, code: 'FAITH_INSUFFICIENT' });
    expect(performAngel(p, 'angel_ministering_spirits', false, 0).ok).toBe(true);
    expect(performAngel(p, 'angel_ministering_spirits', false, 4000)).toEqual({ ok: false, code: 'COOLDOWN', retryAfterMs: 6000 });
  });
});

describe('서버 측 효과', () => {
  it('미가엘: 진행 중 dragon 해제 + 다음 1회 상쇄 장전', () => {
    const p = player();
    tryApplySpirit(p.interference, spiritsById.get('dragon')!, 2, 0);
    const r = performAngel(p, 'angel_michael', false, 100);
    expect(r.ok && r.ended.map((e) => e.spiritId)).toEqual(['dragon']);
    expect(p.armor.wards.michael).toBe(1);
    expect(p.faith.faith).toBe(20);
    expect(r.ok && r.effect).toMatchObject({ kind: 'angel', id: 'michael', targetSlot: 1, verseRef: 'Jude 1:9' });
  });

  it('그룹: 대기 쓰레기 2줄 태움', () => {
    const p = player();
    p.pendingGarbage = 5;
    const r = performAngel(p, 'angel_cherubim', false, 0);
    expect(r.ok && r.offsetRows).toBe(2);
    expect(p.pendingGarbage).toBe(3);
  });

  it('스랍: deception·control·speed·board 저주 해제, 시야(vision)는 유지', () => {
    const p = player();
    tryApplySpirit(p.interference, spiritsById.get('jezebel')!, 2, 0);
    tryApplySpirit(p.interference, spiritsById.get('unclean_spirit')!, 2, 0);
    const r = performAngel(p, 'angel_seraphim', false, 100);
    expect(r.ok && r.ended.map((e) => e.spiritId)).toEqual(['jezebel']);
    expect(p.interference.active.map((e) => e.spiritId)).toEqual(['unclean_spirit']);
  });

  it('섬기는 영들: 보드에 쓰레기 줄이 있으면 클라이언트가 제거, 없으면 대기 큐 1줄', () => {
    const a = player();
    a.pendingGarbage = 2;
    a.lastBoard = BOARD_WITH_GARBAGE;
    performAngel(a, 'angel_ministering_spirits', false, 0);
    expect(a.pendingGarbage).toBe(2);
    const b = player();
    b.pendingGarbage = 2;
    b.lastBoard = BOARD_EMPTY;
    const r = performAngel(b, 'angel_ministering_spirits', false, 0);
    expect(b.pendingGarbage).toBe(1);
    expect(r.ok && r.effect.action).toEqual({ type: 'removeGarbageRow', rows: 1 });
  });
});
