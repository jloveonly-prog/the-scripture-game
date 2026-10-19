// TASK-020-4 · FR-075 · FR-032 · R-02~R-07 — 불가능한 진행 거부 검사.
import { describe, expect, it } from 'vitest';
import { checkClear, checkState, checkTopout, createProgressLedger, type ClearReport } from '../../../worker/src/room/progress-guard.ts';

const report = (over: Partial<ClearReport>): ClearReport => ({ seq: 1, lines: 1, combo: 0, b2b: false, tspin: false, pieceCount: 5, ...over });

describe('checkClear', () => {
  it('R-02 seq 역행·중복 → SEQ_REJECTED', () => {
    const l = createProgressLedger(0, 10);
    expect(checkClear(l, report({ seq: 10 }), 100)).toEqual({ ok: false, code: 'SEQ_REJECTED', rule: 'R-02' });
    expect(checkClear(l, report({ seq: 11 }), 100).ok).toBe(true);
  });

  it('R-03 pieceCount는 직전 clear보다 커야 한다', () => {
    const l = createProgressLedger(0);
    expect(checkClear(l, report({ seq: 1, pieceCount: 5 }), 100).ok).toBe(true);
    expect(checkClear(l, report({ seq: 2, pieceCount: 5 }), 200)).toMatchObject({ ok: false, code: 'PROGRESS_REJECTED', rule: 'R-03' });
  });

  it('R-04 칸 보존: 누적 줄 × 10 ≤ pieceCount × 4 + garbageIn × 9', () => {
    const l = createProgressLedger(0);
    expect(checkClear(l, report({ lines: 4, pieceCount: 9 }), 100)).toMatchObject({ rule: 'R-04' });
    expect(checkClear(l, report({ lines: 4, pieceCount: 10 }), 100).ok).toBe(true);
    const g = createProgressLedger(0);
    expect(checkState(g, 1, 2).ok).toBe(true);
    expect(checkClear(g, report({ seq: 2, lines: 2, pieceCount: 1 }), 100).ok).toBe(true); // 20 ≤ 4 + 18
  });

  it('R-05 최근 5초 pieceCount 증가 ≤ 100', () => {
    const l = createProgressLedger(0);
    expect(checkClear(l, report({ pieceCount: 101 }), 1000)).toMatchObject({ rule: 'R-05' });
    expect(checkClear(l, report({ pieceCount: 100 }), 1000).ok).toBe(true);
    // 5초 뒤에는 창이 옮겨가 다시 100개까지 허용
    expect(checkClear(l, report({ seq: 2, pieceCount: 199 }), 7000).ok).toBe(true);
    expect(checkClear(l, report({ seq: 3, pieceCount: 260 }), 8000)).toMatchObject({ rule: 'R-05' });
  });

  it('R-06 콤보 일관성: 연속 블록이면 직전 + 1, 아니면 0', () => {
    const l = createProgressLedger(0);
    expect(checkClear(l, report({ seq: 1, pieceCount: 5, combo: 1 }), 100)).toMatchObject({ rule: 'R-06' });
    expect(checkClear(l, report({ seq: 2, pieceCount: 5, combo: 0 }), 100).ok).toBe(true);
    expect(checkClear(l, report({ seq: 3, pieceCount: 6, combo: 0 }), 200)).toMatchObject({ rule: 'R-06' });
    expect(checkClear(l, report({ seq: 4, pieceCount: 6, combo: 1 }), 200).ok).toBe(true);
    expect(checkClear(l, report({ seq: 5, pieceCount: 9, combo: 2 }), 300)).toMatchObject({ rule: 'R-06' });
    expect(checkClear(l, report({ seq: 6, pieceCount: 9, combo: 0 }), 300).ok).toBe(true);
  });

  it('R-07 B2B는 직전 삭제가 테트리스·T-Spin일 때만', () => {
    const l = createProgressLedger(0);
    expect(checkClear(l, report({ seq: 1, lines: 4, pieceCount: 10, b2b: true }), 100)).toMatchObject({ rule: 'R-07' });
    expect(checkClear(l, report({ seq: 2, lines: 4, pieceCount: 10 }), 100).ok).toBe(true);
    expect(checkClear(l, report({ seq: 3, lines: 4, pieceCount: 20, b2b: true }), 200).ok).toBe(true);
    expect(checkClear(l, report({ seq: 4, lines: 1, pieceCount: 30 }), 300).ok).toBe(true);
    expect(checkClear(l, report({ seq: 5, lines: 2, pieceCount: 40, b2b: true, tspin: true }), 400)).toMatchObject({ rule: 'R-07' });
  });

  it('거부되면 장부는 바뀌지 않는다', () => {
    const l = createProgressLedger(0);
    checkClear(l, report({ lines: 4, pieceCount: 9 }), 100);
    expect(l).toMatchObject({ lastSeq: 0, totalLines: 0, lastClearPieceCount: -1 });
  });
});

describe('checkState · checkTopout', () => {
  it('state: seq 역행·garbageIn 역행은 조용히 버리고, 통과하면 garbageIn 증가분을 돌려준다', () => {
    const l = createProgressLedger(0);
    expect(checkState(l, 1, 0)).toEqual({ ok: true, garbageDelta: 0 });
    expect(checkState(l, 2, 3)).toEqual({ ok: true, garbageDelta: 3 });
    expect(checkState(l, 2, 4)).toEqual({ ok: false });
    expect(checkState(l, 3, 1)).toEqual({ ok: false });
  });

  it('topout: seq 역행 → SEQ_REJECTED, pieceCount < 직전 clear → PROGRESS_REJECTED', () => {
    const l = createProgressLedger(0);
    checkClear(l, report({ seq: 5, pieceCount: 20 }), 100);
    expect(checkTopout(l, 5, 30)).toMatchObject({ code: 'SEQ_REJECTED' });
    expect(checkTopout(l, 6, 19)).toMatchObject({ code: 'PROGRESS_REJECTED' });
    expect(checkTopout(l, 6, 20)).toEqual({ ok: true });
  });

  it('seq는 라운드가 바뀌어도 소켓 단위로 이어진다', () => {
    expect(createProgressLedger(5000, 42)).toMatchObject({ lastSeq: 42, samples: [{ at: 5000, pieceCount: 0 }] });
  });
});
