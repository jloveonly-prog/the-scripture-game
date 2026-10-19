// TASK-012 · FR-022 · FR-075 — 봇 말씀 대결 응답 분포(정답률·응답 시간) 단위 테스트.
import { describe, expect, it } from 'vitest';
import { planBotQuizAnswer } from '../../../worker/src/room/bot/bot-quiz';
import { mulberry32 } from '../../../client/js/engine/rng.js';
import balance from '../../../content/balance.json';

const N = 4000;

describe('bot-quiz — 난이도별 정답률·응답 시간 (data-ark §8.8.10)', () => {
  for (const level of ['easy', 'normal', 'hard'] as const) {
    it(`${level}: 정답률 ≈ ${balance.bots[level].quizAccuracy}, 지연은 [min, max] 안`, () => {
      const rand = mulberry32(31337);
      const [minMs, maxMs] = balance.bots[level].quizDelayMs;
      let correct = 0;
      for (let i = 0; i < N; i += 1) {
        const answer = i % 4;
        const { choice, delayMs } = planBotQuizAnswer(level, answer, rand);
        if (choice === answer) correct += 1;
        expect([0, 1, 2, 3]).toContain(choice);
        expect(delayMs).toBeGreaterThanOrEqual(minMs);
        expect(delayMs).toBeLessThanOrEqual(maxMs);
        expect(Number.isInteger(delayMs)).toBe(true);
      }
      expect(Math.abs(correct / N - balance.bots[level].quizAccuracy)).toBeLessThan(0.03);
    });
  }

  it('어려울수록 정답률이 높다', () => {
    const rate = (level: 'easy' | 'hard') => {
      const rand = mulberry32(7);
      let c = 0;
      for (let i = 0; i < N; i += 1) if (planBotQuizAnswer(level, 2, rand).choice === 2) c += 1;
      return c / N;
    };
    expect(rate('hard')).toBeGreaterThan(rate('easy'));
  });

  it('오답은 정답이 아닌 3개 중 하나, 잘못된 입력은 RangeError', () => {
    const alwaysWrong = () => 0.999;
    expect(planBotQuizAnswer('easy', 3, alwaysWrong).choice).not.toBe(3);
    expect(() => planBotQuizAnswer('easy', 4, Math.random)).toThrow(RangeError);
    expect(() => planBotQuizAnswer('expert' as 'easy', 0, Math.random)).toThrow(RangeError);
  });
});
