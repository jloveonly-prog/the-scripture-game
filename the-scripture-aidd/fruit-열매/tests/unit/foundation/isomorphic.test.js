// TASK-007 · FR-001 · FR-005 · FR-006 · FR-055 · FR-075 — 기반 공용 동형 모듈(rng·pieces·encode·danger) 단위 테스트.
import { describe, expect, it } from 'vitest';
import { SPECIAL_SEED_XOR, deriveSeed, mulberry32, nextInt, pick, shuffleInPlace } from '../../../client/js/engine/rng.js';
import { PIECES, PIECE_TYPES, absoluteCells, pieceByType } from '../../../client/js/engine/pieces.js';
import { cellAt, createEmptyGrid, decodeBoard, encodeBoard, isValidBoardString } from '../../../client/js/engine/encode.js';
import { isBoardStringInDanger, isInDanger, stackHeight } from '../../../client/js/engine/danger.js';

describe('rng.js — mulberry32 (D-13)', () => {
  it('같은 시드는 같은 수열, 다른 시드는 다른 수열', () => {
    const a = mulberry32(2718281828);
    const b = mulberry32(2718281828);
    const c = mulberry32(1);
    const seqA = Array.from({ length: 8 }, () => a());
    expect(Array.from({ length: 8 }, () => b())).toEqual(seqA);
    expect(Array.from({ length: 8 }, () => c())).not.toEqual(seqA);
    for (const v of seqA) expect(v >= 0 && v < 1).toBe(true);
  });

  it('도우미: nextInt 범위·pick·섞기·특수 칸 파생 시드', () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 200; i += 1) {
      const n = nextInt(rand, 0, 9);
      expect(n >= 0 && n <= 9).toBe(true);
    }
    expect(['x']).toContain(pick(rand, ['x']));
    expect(shuffleInPlace(rand, [1, 2, 3, 4, 5, 6, 7]).slice().sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(deriveSeed(0, SPECIAL_SEED_XOR)).toBe(0x5eedc0de);
    expect(() => pick(rand, [])).toThrow(RangeError);
  });
});

describe('pieces.js — SRS 모양 (CODE-009)', () => {
  it('7종 × 회전 4개, 각 4칸, 셀 코드 1~7', () => {
    PIECE_TYPES.forEach((name, i) => {
      const piece = PIECES[name];
      expect(piece.type).toBe(i + 1);
      expect(piece.code).toBe(String(i + 1));
      expect(piece.cells).toHaveLength(4);
      for (const rot of piece.cells) expect(rot).toHaveLength(4);
    });
    expect(pieceByType(8)).toBeNull();
  });

  it('출현 자세(x=3)는 보드 3~6열 안에 놓인다', () => {
    for (let type = 1; type <= 7; type += 1) {
      for (const [, col] of absoluteCells({ type, rot: 0, x: 3, y: 0 })) expect(col >= 3 && col <= 6).toBe(true);
    }
  });
});

describe('encode.js · danger.js (FR-006, FR-055)', () => {
  it('격자 ↔ 200자 문자열 왕복, 형식 오류 거부', () => {
    const grid = createEmptyGrid();
    grid[19][0] = '8';
    grid[3][9] = 'g';
    const board = encodeBoard(grid);
    expect(isValidBoardString(board)).toBe(true);
    expect(decodeBoard(board)).toEqual(grid);
    expect(cellAt(board, 19, 0)).toBe('8');
    expect(cellAt(board, 20, 0)).toBeNull();
    expect(isValidBoardString('0'.repeat(199))).toBe(false);
    expect(() => decodeBoard('z'.repeat(200))).toThrow(RangeError);
  });

  it('상단 4줄에 고정 칸이 있으면 위기, 쌓인 높이 계산', () => {
    const grid = createEmptyGrid();
    expect(isInDanger(grid)).toBe(false);
    expect(stackHeight(grid)).toBe(0);
    grid[8][4] = '3';
    expect(stackHeight(grid)).toBe(12);
    expect(isInDanger(grid)).toBe(false);
    grid[3][4] = '3';
    expect(isInDanger(grid)).toBe(true);
    expect(isBoardStringInDanger(encodeBoard(grid))).toBe(true);
  });
});
