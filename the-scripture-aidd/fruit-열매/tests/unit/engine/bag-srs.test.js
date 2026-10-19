// TASK-010-6 · FR-001 · FR-002 · FR-075 — 시드 7-bag 분포·SRS 회전·벽차기 단위 테스트.
import { describe, expect, it } from 'vitest';
import { createBag } from '../../../client/js/engine/bag.js';
import { kickTable, rotateLocalCell, tryRotate } from '../../../client/js/engine/srs.js';
import { createEmptyGrid } from '../../../client/js/engine/encode.js';
import { PIECES, PIECE_TYPES } from '../../../client/js/engine/pieces.js';

const draw = (bag, n) => Array.from({ length: n }, () => bag.next());

describe('bag.js — 시드 7-bag (FR-001)', () => {
  it('같은 시드는 같은 순서, 다른 시드는 다른 순서', () => {
    expect(draw(createBag(2718281828), 70)).toEqual(draw(createBag(2718281828), 70));
    expect(draw(createBag(1), 70)).not.toEqual(draw(createBag(2), 70));
  });

  it('7개씩 끊으면 항상 1~7 한 벌 (분포 균등)', () => {
    const seq = draw(createBag(12345), 700);
    for (let i = 0; i < seq.length; i += 7) expect(seq.slice(i, i + 7).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const counts = seq.reduce((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {});
    for (let t = 1; t <= 7; t += 1) expect(counts[t]).toBe(100);
  });

  it('peek은 꺼내지 않는다', () => {
    const bag = createBag(99);
    const peeked = bag.peek(7);
    expect(draw(bag, 7)).toEqual(peeked);
  });

  it('잘못된 시드는 RangeError', () => {
    expect(() => createBag(-1)).toThrow(RangeError);
    expect(() => createBag(1.5)).toThrow(RangeError);
  });
});

describe('srs.js — SRS 회전·벽차기 (FR-002)', () => {
  const T = 3;
  const I = 1;
  const O = 2;

  it('빈 보드 회전은 제자리(kickIndex 0)', () => {
    const r = tryRotate(createEmptyGrid(), { type: T, rot: 0, x: 3, y: 5 }, 1);
    expect(r).toEqual({ active: { type: T, rot: 1, x: 3, y: 5 }, kickIndex: 0 });
  });

  it('왼쪽 벽에 붙은 세로 I를 돌리면 벽차기로 밀려난다', () => {
    // rot 3(L) 세로 I: 상자 열 1 → x = -1이면 보드 열 0
    const r = tryRotate(createEmptyGrid(), { type: I, rot: 3, x: -1, y: 5 }, 1);
    expect(r).not.toBeNull();
    expect(r.kickIndex).toBeGreaterThan(0);
    expect(r.active.rot).toBe(0);
    expect(r.active.x).toBeGreaterThanOrEqual(0);
  });

  it('모든 후보가 막히면 null (EVT-03)', () => {
    const grid = createEmptyGrid().map((row) => row.map(() => '8'));
    for (const [r, c] of [[5, 3], [6, 3], [6, 4], [6, 5]]) grid[r][c] = '0'; // T rot0 모양만 비움 (x=3, y=5)
    expect(tryRotate(grid, { type: T, rot: 0, x: 3, y: 5 }, 1)).toBeNull();
  });

  it('O는 벽차기 없이 같은 자리', () => {
    expect(kickTable(O, 0, 1)).toEqual([[0, 0]]);
    expect(tryRotate(createEmptyGrid(), { type: O, rot: 0, x: 3, y: 0 }, -1).active).toEqual({ type: O, rot: 3, x: 3, y: 0 });
  });

  it('JLSTZ·I 벽차기 표는 방향마다 후보 5개', () => {
    for (const type of [1, 3, 4, 5, 6, 7]) {
      for (let rot = 0; rot < 4; rot += 1) {
        expect(kickTable(type, rot, 1)).toHaveLength(5);
        expect(kickTable(type, rot, -1)).toHaveLength(5);
      }
    }
  });

  it('특수 칸 위치 추적: 회전한 칸은 새 자세의 블록 칸 안에 있다', () => {
    for (const name of PIECE_TYPES) {
      const type = PIECE_TYPES.indexOf(name) + 1;
      const piece = PIECES[name];
      for (let rot = 0; rot < 4; rot += 1) {
        for (const dir of [1, -1]) {
          const to = (rot + dir + 4) % 4;
          for (const cell of piece.cells[rot]) {
            const moved = rotateLocalCell(type, cell, dir);
            expect(piece.cells[to].some(([r, c]) => r === moved[0] && c === moved[1])).toBe(true);
          }
        }
      }
    }
  });
});
