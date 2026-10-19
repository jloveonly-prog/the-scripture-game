// TASK-010-6 · FR-003 · FR-004 · FR-014 · FR-017 · FR-025 · FR-029 · FR-045 · FR-075 — 보드 격자 조작 단위 테스트.
import { describe, expect, it } from 'vitest';
import {
  blastArea, createEmptyMeta, destroyTopBlocks, dropDistance, enumeratePlacements, findBestPlacement, fits, fullRows,
  garbageRowIndices, gridFeatures, insertGarbage, insertLeadRow, placePiece, removeBottomGarbage, removeColumnTops,
  removeRows, singleGapRows,
} from '../../../client/js/engine/board.js';
import { createEmptyGrid, encodeBoard } from '../../../client/js/engine/encode.js';

const fillRow = (grid, r, code = '8', hole = -1) => {
  grid[r] = grid[r].map((_, c) => (c === hole ? '0' : code));
  return grid;
};

describe('board.js — 충돌·고정 (FR-003)', () => {
  it('벽·바닥 밖은 충돌, 보드 위(행 < 0)는 허용', () => {
    const g = createEmptyGrid();
    expect(fits(g, { type: 3, rot: 0, x: -1, y: 0 })).toBe(false);
    expect(fits(g, { type: 3, rot: 0, x: 8, y: 0 })).toBe(false);
    expect(fits(g, { type: 3, rot: 0, x: 3, y: 19 })).toBe(false);
    expect(fits(g, { type: 3, rot: 0, x: 3, y: -1 })).toBe(true);
    expect(dropDistance(g, { type: 3, rot: 0, x: 3, y: 0 })).toBe(18);
  });

  it('placePiece는 원본을 바꾸지 않고 특수 칸 코드·meta를 남긴다', () => {
    const g = createEmptyGrid();
    const m = createEmptyMeta();
    const r = placePiece(g, m, { type: 3, rot: 0, x: 3, y: 18 }, { cell: [18, 4], code: 'a', info: { kind: 'word', pieceIndex: 7 } });
    expect(g[19][3]).toBe('0');
    expect(r.grid[18][4]).toBe('a');
    expect(r.grid[19][3]).toBe('3');
    expect(r.meta[18][4]).toEqual({ kind: 'word', pieceIndex: 7 });
    expect(r.lockOut).toBe(false);
    expect(placePiece(g, null, { type: 3, rot: 0, x: 3, y: -1 }).lockOut).toBe(true);
  });
});

describe('board.js — 줄 삭제·쓰레기·납 (FR-004·FR-025·FR-029)', () => {
  it('다 찬 줄 삭제 후 위 줄이 내려오고 meta도 따라온다', () => {
    const g = fillRow(createEmptyGrid(), 19, '1');
    g[18][0] = 'b';
    const m = createEmptyMeta();
    m[18][0] = { kind: 'jericho', pieceIndex: 3 };
    expect(fullRows(g)).toEqual([19]);
    const r = removeRows(g, m, [19]);
    expect(r.grid[19][0]).toBe('b');
    expect(r.meta[19][0]).toEqual({ kind: 'jericho', pieceIndex: 3 });
    expect(r.grid[0].every((c) => c === '0')).toBe(true);
  });

  it('납 줄은 다 차 있어도 지워지지 않는다', () => {
    const r = insertLeadRow(createEmptyGrid(), null);
    expect(r.grid[19].every((c) => c === '9')).toBe(true);
    expect(fullRows(r.grid)).toEqual([]);
  });

  it('쓰레기 줄 삽입: 구멍 열은 빈칸, 꼭대기에 블록이 밀려 나가면 overflow', () => {
    const r = insertGarbage(createEmptyGrid(), null, 2, 6);
    expect(r.grid[19][6]).toBe('0');
    expect(r.grid[18].filter((c) => c === '8')).toHaveLength(9);
    expect(r.overflow).toBe(false);
    const top = createEmptyGrid();
    top[0][0] = '1';
    expect(insertGarbage(top, null, 1, 0).overflow).toBe(true);
    expect(encodeBoard(r.grid)).toHaveLength(200);
  });

  it('맨 아래 쓰레기 줄 제거 — 부족하면 있는 만큼 (UC-009 5a)', () => {
    const g = insertGarbage(createEmptyGrid(), null, 2, 0).grid;
    expect(garbageRowIndices(g)).toEqual([19, 18]);
    const r = removeBottomGarbage(g, null, 3);
    expect(r.removed).toEqual([19, 18]);
    expect(garbageRowIndices(r.grid)).toEqual([]);
  });
});

describe('board.js — 블록 제거·폭파 (FR-014·FR-029·FR-045)', () => {
  it('다윗: 가장 높은 열 꼭대기 3개 제거, 빈 보드는 0개 (UC-009 5b)', () => {
    const g = createEmptyGrid();
    for (let r = 14; r < 20; r += 1) g[r][5] = '1';
    g[19][2] = '1';
    const r = destroyTopBlocks(g, null, 3);
    expect(r.cells).toEqual([[14, 5], [15, 5], [16, 5]]);
    expect(r.grid[17][5]).toBe('1');
    expect(destroyTopBlocks(createEmptyGrid(), null, 3).cells).toEqual([]);
  });

  it('아바돈: 지정 열의 최상단 블록 1개씩', () => {
    const g = fillRow(fillRow(createEmptyGrid(), 19), 18);
    const r = removeColumnTops(g, null, [1, 4, 8, 4, 12]);
    expect(r.cells).toEqual([[18, 1], [18, 4], [18, 8]]);
  });

  it('여리고: 3×3 폭파는 보드 안 칸만 (UC-014 E1)', () => {
    const g = fillRow(fillRow(createEmptyGrid(), 19), 18);
    const r = blastArea(g, null, [19, 0], 3);
    expect(r.cells.sort()).toEqual([[18, 0], [18, 1], [19, 0], [19, 1]].sort());
  });

  it('니어미스: 빈칸 1개짜리 줄', () => {
    const g = fillRow(fillRow(createEmptyGrid(), 19, '8', 3), 18, '8', 4);
    expect(singleGapRows(g)).toEqual([18, 19]);
  });
});

describe('board.js — 착지 후보 평가 (FR-015·FR-021)', () => {
  it('특징값: 구멍·높이 합·울퉁불퉁함', () => {
    const g = createEmptyGrid();
    g[18][0] = '1';
    expect(gridFeatures(g)).toEqual({ holes: 1, aggregateHeight: 2, bumpiness: 2, maxHeight: 2 });
  });

  it('우물이 있으면 세로 I를 우물에 넣는 자리가 최고', () => {
    const g = createEmptyGrid();
    for (let r = 16; r < 20; r += 1) fillRow(g, r, '8', 9);
    const best = findBestPlacement(g, 1);
    expect(best.rot % 2).toBe(1);
    const cells = enumeratePlacements(g, 1)[0];
    expect(cells.lines).toBe(4);
  });
});
