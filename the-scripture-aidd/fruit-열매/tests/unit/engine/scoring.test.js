// TASK-010-6 · FR-004 · R-06 · R-07 · R-08 · FR-075 — 콤보·B2B·T-Spin 판정·점수 단위 테스트.
import { describe, expect, it } from 'vitest';
import { createScoringState, isTSpin, judgeLock, addDropPoints, LINE_POINTS, TSPIN_POINTS } from '../../../client/js/engine/scoring.js';
import { createEmptyGrid } from '../../../client/js/engine/encode.js';

const run = (results) => {
  let state = createScoringState();
  return results.map((r) => {
    const j = judgeLock(state, r);
    state = j.state;
    return j;
  });
};

describe('scoring.js — 콤보 (R-06)', () => {
  it('연속 삭제 블록 수 − 1, 비삭제 고정에서 0으로 끊김', () => {
    const out = run([{ lines: 1 }, { lines: 2 }, { lines: 1 }, { lines: 0 }, { lines: 1 }]);
    expect(out.map((o) => o.combo)).toEqual([0, 1, 2, 0, 0]);
    expect(out[3].comboBroken).toBe(true);
  });
});

describe('scoring.js — B2B (R-07)', () => {
  it('테트리스 → 테트리스는 B2B, 사이에 일반 삭제가 끼면 끊김', () => {
    const out = run([{ lines: 4 }, { lines: 4 }, { lines: 1 }, { lines: 4 }]);
    expect(out.map((o) => o.b2b)).toEqual([false, true, false, false]);
  });

  it('비삭제 고정은 B2B 사슬을 끊지 않는다', () => {
    const out = run([{ lines: 4 }, { lines: 0 }, { lines: 2, tspin: true }]);
    expect(out[2].b2b).toBe(true);
    expect(out[2].tspin).toBe(true);
  });

  it('T-Spin은 3줄 이하만 (R-08), 점수 배점·B2B 배율', () => {
    const [first, second] = run([{ lines: 4 }, { lines: 4 }]);
    expect(first.points).toBe(LINE_POINTS[4]);
    expect(second.points).toBe(Math.floor(LINE_POINTS[4] * 1.5) + 50);
    const [ts] = run([{ lines: 1, tspin: true }]);
    expect(ts.points).toBe(TSPIN_POINTS[1]);
    expect(run([{ lines: 4, tspin: true }])[0].tspin).toBe(false);
    expect(() => judgeLock(createScoringState(), { lines: 5 })).toThrow(RangeError);
  });

  it('드롭 배점 (소프트 1·하드 2)', () => {
    expect(addDropPoints(createScoringState(), 10, true).score).toBe(20);
    expect(addDropPoints(createScoringState(), 3, false).score).toBe(3);
  });
});

describe('scoring.js — T-Spin 3모서리 (FR-004)', () => {
  it('회전으로 넣은 T가 모서리 3개 막히면 T-Spin', () => {
    const g = createEmptyGrid();
    // T rot2(아래 향함) x=3, y=17: 상자 모서리 (17,3) (17,5) (19,3) (19,5)
    g[17][3] = '8';
    g[19][3] = '8';
    g[19][5] = '8';
    const t = { type: 3, rot: 2, x: 3, y: 17 };
    expect(isTSpin(g, t, true)).toBe(true);
    expect(isTSpin(g, t, false)).toBe(false);
    g[17][3] = '0';
    expect(isTSpin(g, t, true)).toBe(false);
    expect(isTSpin(g, { ...t, type: 6 }, true)).toBe(false);
  });

  it('벽·바닥도 막힌 모서리로 센다', () => {
    const g = createEmptyGrid();
    g[19][1] = '8';
    // T rot1 x=-1, y=17: 모서리 (17,-1)·(19,-1) 벽 + (19,1) 블록 = 3
    expect(isTSpin(g, { type: 3, rot: 1, x: -1, y: 17 }, true)).toBe(true);
  });
});
