// TASK-010-6 · FR-003 · FR-004 · FR-011 · FR-015 · FR-025 · FR-029 · FR-044 · FR-075 — 엔진 상태 기계 단위 테스트.
import { describe, expect, it } from 'vitest';
import balance from '../../../content/balance.json';
import { createGame } from '../../../client/js/engine/game.js';
import { createBag } from '../../../client/js/engine/bag.js';
import { absoluteCells } from '../../../client/js/engine/pieces.js';

const newGame = (opts = {}) => {
  const g = createGame({ seed: 1234, mode: 'practice', stage: 0, rules: balance, ...opts });
  g.start();
  return g;
};
/** 첫 블록이 type인 시드 찾기 */
const seedWithFirst = (type) => {
  for (let s = 1; s < 10000; s += 1) if (createBag(s).next() === type) return s;
  throw new Error('seed not found');
};
const fillRows = (rows, hole) => (grid, meta) => {
  const next = grid.map((row) => row.slice());
  for (const r of rows) next[r] = next[r].map((_, c) => (c === hole ? '0' : '8'));
  return { grid: next, meta };
};

describe('game.js — 출현·이동·회전·드롭 (FR-003)', () => {
  it('start 시 첫 블록이 보드 맨 위 가운데에 출현', () => {
    const g = newGame();
    const { active } = g.snapshot();
    expect(active.rot).toBe(0);
    expect(Math.min(...absoluteCells(active).map(([r]) => r))).toBe(0);
    expect(g.drainEvents()[0].type).toBe('spawn');
  });

  it('벽에서 이동 실패, 하드 드롭은 고정 후 다음 블록', () => {
    const g = newGame();
    let moved = 0;
    while (g.move(-1)) moved += 1;
    expect(moved).toBeGreaterThan(0);
    expect(g.move(-1)).toBe(false);
    g.drainEvents();
    g.hardDrop();
    const types = g.drainEvents().map((e) => e.type);
    expect(types).toEqual(['hardDrop', 'lock', 'spawn']);
    expect(g.snapshot().pieceCount).toBe(1);
    expect(g.snapshot().score).toBeGreaterThan(0);
  });

  it('고스트는 바닥까지 떨어진 자세', () => {
    const g = newGame();
    const { ghost } = g.snapshot();
    expect(Math.max(...absoluteCells(ghost).map(([r]) => r))).toBe(19);
  });

  it('중력 + 고정 지연 500ms 후 고정', () => {
    const g = newGame();
    g.setSoftDrop(true);
    for (let i = 0; i < 100 && g.snapshot().active.y !== g.snapshot().ghost.y; i += 1) g.tick(20);
    g.setSoftDrop(false);
    expect(g.drainEvents().some((e) => e.type === 'softDrop')).toBe(true);
    g.drainEvents();
    g.tick(400);
    expect(g.snapshot().pieceCount).toBe(0);
    g.tick(150);
    expect(g.snapshot().pieceCount).toBe(1);
  });

  it('홀드는 낙하당 1회, 두 번째 홀드에서 꺼내 온다', () => {
    const g = newGame();
    const first = g.snapshot().active.type;
    expect(g.hold()).toBe(true);
    expect(g.hold()).toBe(false);
    expect(g.snapshot().hold).toBe(first);
    g.hardDrop();
    expect(g.hold()).toBe(true);
    expect(g.snapshot().active.type).toBe(first);
  });

  it('같은 시드·같은 조작은 같은 결과 (결정적)', () => {
    const play = () => {
      const g = newGame({ seed: 99 });
      for (let i = 0; i < 30; i += 1) { g.move(i % 3 - 1); g.rotate(1); g.hardDrop(); }
      return g.snapshot();
    };
    const a = play();
    const b = play();
    expect(a.grid).toEqual(b.grid);
    expect(a.score).toBe(b.score);
  });
});

describe('game.js — 줄 삭제·쓰레기·Top-out (FR-004·FR-025)', () => {
  it('우물에 세로 I → 테트리스 clear 사건', () => {
    const g = newGame({ seed: seedWithFirst(1) });
    g.applyBoardOp(fillRows([16, 17, 18, 19], 9));
    expect(g.rotate(1)).toBe(true);
    while (g.move(1));
    g.drainEvents();
    g.hardDrop();
    const clear = g.drainEvents().find((e) => e.type === 'clear');
    expect(clear).toMatchObject({ lines: 4, combo: 0, b2b: false, tspin: false, pieceCount: 1, specials: [] });
    expect(g.snapshot().grid.flat().every((c) => c === '0')).toBe(true);
  });

  it('대기 쓰레기는 다음 비삭제 고정 때 삽입, garbageIn 누적', () => {
    const g = newGame();
    g.queueGarbage(2, 0);
    g.queueGarbage(1, 5);
    expect(g.snapshot().pendingGarbage).toBe(3);
    expect(g.reducePending(1)).toBe(1);
    g.hardDrop();
    const s = g.snapshot();
    expect(s.garbageIn).toBe(2);
    expect(s.pendingGarbage).toBe(0);
    expect(s.grid[19][5]).toBe('0');
  });

  it('베드로 무효 중에는 쓰레기가 올라오지 않는다 (FR-016)', () => {
    const g = newGame();
    g.queueGarbage(3, 0);
    g.setGarbageBlocked(true);
    g.hardDrop();
    expect(g.snapshot().garbageIn).toBe(0);
    g.setGarbageBlocked(false);
    g.hardDrop();
    expect(g.snapshot().garbageIn).toBe(3);
  });

  it('쓰레기에 밀려 천장을 넘으면 topout', () => {
    const g = newGame();
    g.queueGarbage(20, 0);
    g.hardDrop();
    const ev = g.drainEvents();
    expect(ev.some((e) => e.type === 'topout')).toBe(true);
    expect(g.toppedOut).toBe(true);
    expect(g.hardDrop()).toBe(false);
  });

  it('납 줄: 4줄 삭제 후 소멸, 스랍으로 즉시 제거 (FR-029)', () => {
    const g = newGame();
    g.insertLeadRow(4);
    expect(g.snapshot().leadRows).toEqual([{ row: 19, clearsLeft: 4 }]);
    expect(g.removeLeadRows()).toBe(1);
    expect(g.snapshot().leadRows).toEqual([]);
  });

  it('말씀 칸: 대전 stage 1에서 7~12번째 블록에 붙고 고정하면 셀 코드 a', () => {
    const g = newGame({ mode: 'bot', stage: 1, seed: 4242 });
    let wordSpawn = null;
    for (let i = 0; i < 14 && !wordSpawn; i += 1) {
      wordSpawn = g.drainEvents().find((e) => e.type === 'spawn' && e.special?.kind === 'word') ?? null;
      if (!wordSpawn) g.hardDrop();
    }
    expect(wordSpawn).not.toBeNull();
    expect(wordSpawn.n).toBeGreaterThanOrEqual(7);
    g.hardDrop();
    expect(g.snapshot().grid.flat()).toContain('a');
  });

  it('착지 힌트는 현재 블록의 자세를 돌려준다 (FR-015)', () => {
    const g = newGame();
    const hint = g.landingHint();
    expect(hint.type).toBe(g.snapshot().active.type);
    expect(g.landingHint()).toBe(hint);
  });
});
