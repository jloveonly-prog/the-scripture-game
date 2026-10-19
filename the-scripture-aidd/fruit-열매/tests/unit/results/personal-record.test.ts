// TASK-031-3 · FR-066 · FR-075 · REQ-017 — 개인 기록 집계·성장 수치·연습 기록
import { describe, expect, it, vi } from 'vitest';
import { buildPersonalRecord, computeGrowth, quizAccuracy } from '../../../worker/src/results/personal-record';
import { recordPracticeOutcome } from '../../../worker/src/results/record-match';
import { StoreError } from '../../../worker/src/store/store';
import type { SlotStats, Store } from '../../../worker/src/store/store';

const stats = (over: Partial<SlotStats> = {}): SlotStats => ({
  maxCombo: 7, linesCleared: 40, tetrises: 2, attackSent: 30, attackPerMin: 12.44, quizCorrect: 2, quizAnswered: 3,
  skillsUsed: 2, angelsUsed: 1, armorUsed: 0, jesusEvent: false, ...over,
});

describe('개인 기록 (FR-066)', () => {
  it('최대 콤보·분당 공격(소수 1자리)·퀴즈 정답률(소수 2자리)', () => {
    expect(buildPersonalRecord(stats(), 'random')).toEqual({ maxCombo: 7, attackPerMin: 12.4, quizAccuracy: 0.67, mode: 'random' });
  });

  it('퀴즈 응답 0회면 정답률 0', () => {
    expect(quizAccuracy({ quizCorrect: 0, quizAnswered: 0 })).toBe(0);
  });

  it('연습은 playTimeMs 포함', () => {
    expect(buildPersonalRecord(stats(), 'practice', 61000)).toMatchObject({ mode: 'practice', playTimeMs: 61000 });
    expect(buildPersonalRecord(stats(), 'bot', 61000)).not.toHaveProperty('playTimeMs');
  });
});

describe('성장 수치 (FR-066 — 직전 기록 대비)', () => {
  it('첫 기록이면 null', () => {
    expect(computeGrowth(buildPersonalRecord(stats(), 'random'), null)).toBeNull();
  });

  it('이번 − 직전 (부동소수 오차 없이 반올림)', () => {
    const prev = { maxCombo: 5, attackPerMin: 11.1, quizAccuracy: 0.17, mode: 'bot' as const };
    expect(computeGrowth(buildPersonalRecord(stats(), 'random'), prev)).toEqual({ maxCombo: 2, attackPerMin: 1.3, quizAccuracy: 0.5 });
  });
});

describe('recordPracticeOutcome', () => {
  it('직전 기록 대비 성장 + saved:true', async () => {
    const store = { recordPractice: vi.fn(async () => ({ previousRecord: { maxCombo: 6, attackPerMin: 0, quizAccuracy: 0, mode: 'practice' } })) };
    const res = await recordPracticeOutcome(store as unknown as Store, { guestId: 'g1', roundsDelta: 1, stats: stats({ attackPerMin: 0, quizAnswered: 0 }), playTimeMs: 1000 });
    expect(res).toEqual({ saved: true, record: { maxCombo: 7, attackPerMin: 0, quizAccuracy: 0, mode: 'practice', playTimeMs: 1000 },
      growth: { maxCombo: 1, attackPerMin: 0, quizAccuracy: 0 } });
  });

  it('저장 실패는 던지지 않고 saved:false', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const store = { recordPractice: vi.fn(async () => { throw new StoreError('STORE_UNAVAILABLE'); }) };
    const res = await recordPracticeOutcome(store as unknown as Store, { guestId: 'g1', roundsDelta: 1, stats: stats(), playTimeMs: 1000 });
    expect(res.saved).toBe(false);
    expect(res.growth).toBeNull();
  });
});
