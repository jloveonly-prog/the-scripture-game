// TASK-021-6 · FR-075 · FR-033 · FR-034 · FR-062 — 믿음 게이지 충전·차감·쿨다운, 은혜 보정 검사.
import { describe, expect, it } from 'vitest';
import { addFaith, checkSpend, cooldownSnapshot, createFaithState, faithGainForClear, shiftCooldowns, spendFaith } from '../../../worker/src/room/faith.ts';
import { applyGraceFaith, applyGraceGarbage, isGraceActive, nextLossStreak } from '../../../worker/src/room/grace.ts';

describe('믿음 게이지 (FR-033)', () => {
  it('줄 삭제 충전 1줄 5 · 2줄 10 · 3줄 15 · 4줄 20, T-Spin +5', () => {
    expect([1, 2, 3, 4].map((lines) => faithGainForClear(lines, false, false))).toEqual([5, 10, 15, 20]);
    expect(faithGainForClear(2, true, false)).toBe(15);
  });

  it('은혜 중 충전 ×1.15 내림', () => {
    expect(faithGainForClear(4, false, true)).toBe(23);
    expect(faithGainForClear(1, false, true)).toBe(5);
  });

  it('상한 100에서 멈춘다', () => {
    const s = createFaithState();
    expect(addFaith(s, 90)).toBe(90);
    expect(addFaith(s, 25)).toBe(10);
    expect(s.faith).toBe(100);
  });
});

describe('차감·쿨다운 (FR-034)', () => {
  it('게이지 부족 → FAITH_INSUFFICIENT, 사용 후 쿨다운 → COOLDOWN + 남은 ms', () => {
    const s = createFaithState();
    addFaith(s, 40);
    expect(checkSpend(s, 'hero_david', 50, 0)).toEqual({ ok: false, code: 'FAITH_INSUFFICIENT' });
    addFaith(s, 20);
    expect(checkSpend(s, 'hero_david', 50, 0)).toEqual({ ok: true });
    spendFaith(s, 'hero_david', 50, 20000, 1000);
    expect(s.faith).toBe(10);
    expect(checkSpend(s, 'hero_david', 0, 9000)).toEqual({ ok: false, code: 'COOLDOWN', retryAfterMs: 12000 });
    expect(checkSpend(s, 'hero_david', 0, 21000)).toEqual({ ok: true });
  });

  it('쿨다운 표는 위인 스킬 1개 + 천사 5개 (항목별 독립)', () => {
    const s = createFaithState();
    spendFaith(s, 'angel_gabriel', 0, 15000, 0);
    const snap = cooldownSnapshot(s, 'paul', 5000);
    expect(Object.keys(snap)).toEqual(['hero_paul', 'angel_michael', 'angel_gabriel', 'angel_cherubim', 'angel_seraphim', 'angel_ministering_spirits']);
    expect(snap.angel_gabriel).toBe(10000);
    expect(snap.hero_paul).toBe(0);
  });

  it('말씀 대결 정지만큼 진행 중 쿨다운을 미룬다', () => {
    const s = createFaithState();
    spendFaith(s, 'hero_peter', 0, 25000, 0);
    shiftCooldowns(s, 13000, 5000);
    expect(s.cooldownUntil.hero_peter).toBe(38000);
  });
});

describe('은혜 (FR-062)', () => {
  it('연속 3판 패배부터 적용', () => {
    expect(isGraceActive(2)).toBe(false);
    expect(isGraceActive(3)).toBe(true);
  });

  it('받는 쓰레기 −1 (최소 0), 충전 ×1.15 내림', () => {
    expect(applyGraceGarbage(4, true)).toBe(3);
    expect(applyGraceGarbage(0, true)).toBe(0);
    expect(applyGraceGarbage(4, false)).toBe(4);
    expect(applyGraceFaith(10, true)).toBe(11);
    expect(applyGraceFaith(10, false)).toBe(10);
  });

  it('라운드를 이기면 연속 패배 0, 지면 +1', () => {
    expect(nextLossStreak(3, true)).toBe(0);
    expect(nextLossStreak(3, false)).toBe(4);
  });
});
