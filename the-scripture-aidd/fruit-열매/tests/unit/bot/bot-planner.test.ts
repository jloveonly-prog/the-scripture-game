// TASK-012 · FR-021 · FR-075 — 봇 착지 평가·조작 선택·보드 진행 단위 테스트.
import { describe, expect, it } from 'vitest';
import { nextStep, planPlacement } from '../../../worker/src/room/bot/bot-planner';
import { createBotPlayer, type BotOutput } from '../../../worker/src/room/bot/bot-player';
import { createEmptyGrid, isValidBoardString } from '../../../client/js/engine/encode.js';
import { mulberry32 } from '../../../client/js/engine/rng.js';

const wellGrid = () => {
  const g = createEmptyGrid();
  for (let r = 16; r < 20; r += 1) g[r] = g[r].map((_, c) => (c === 9 ? '0' : '8'));
  return g;
};
const run = (level: 'easy' | 'normal' | 'hard', untilMs: number, startAt = 1000) => {
  const bot = createBotPlayer({ level, seed: 2718281828, stage: 0, startAt, matchElapsedMs: 0 });
  const out: BotOutput[] = [];
  for (let t = 0; t <= untilMs && !bot.toppedOut; t += 50) out.push(...bot.tick(t));
  return { bot, out };
};

describe('bot-planner — 착지 평가 (data-ark §8.8.10)', () => {
  it('실수 없으면 우물에 세로 I (테트리스)', () => {
    const p = planPlacement(wellGrid(), 1, 0, mulberry32(1));
    expect(p).not.toBeNull();
    expect(p!.lines).toBe(4);
    expect(p!.rot % 2).toBe(1);
  });

  it('실수(mistakeRate 1)는 차선 후보 중에서 고른다', () => {
    const best = planPlacement(wellGrid(), 1, 0, mulberry32(1))!;
    for (let s = 1; s <= 20; s += 1) {
      const p = planPlacement(wellGrid(), 1, 1, mulberry32(s))!;
      expect(p.score).toBeLessThanOrEqual(best.score);
      expect([p.rot, p.x, p.y]).not.toEqual([best.rot, best.x, best.y]);
    }
  });

  it('다음 조작: 회전 먼저(가까운 방향) → 좌우 → 드롭', () => {
    const at = { type: 3, rot: 0, x: 3, y: 0 };
    expect(nextStep(at, { ...at, rot: 3 })).toBe('rotateCcw');
    expect(nextStep(at, { ...at, rot: 2 })).toBe('rotateCw');
    expect(nextStep(at, { ...at, x: 6 })).toBe('right');
    expect(nextStep(at, { ...at, x: 0 })).toBe('left');
    expect(nextStep(at, at)).toBe('drop');
  });
});

describe('bot-player — 보드 진행 (devguide §7.4)', () => {
  it('startAt 전에는 출력 없음, 이후 state 12Hz·seq 엄격 증가', () => {
    const { out } = run('hard', 11000);
    const states = out.filter((o) => o.type === 'state');
    expect(states.length).toBeGreaterThanOrEqual(110);
    expect(states.length).toBeLessThanOrEqual(125);
    const seqs = out.map((o) => o.data.seq as number);
    for (let i = 1; i < seqs.length; i += 1) expect(seqs[i]).toBeGreaterThan(seqs[i - 1]);
    expect(seqs[0]).toBe(1);
    expect(isValidBoardString(states[0].data.board)).toBe(true);
  });

  it('어려움 봇은 60초 동안 블록을 놓고 줄을 지운다 (clear 필드 = API-204)', () => {
    const { out } = run('hard', 61000);
    const clears = out.filter((o) => o.type === 'clear');
    expect(clears.length).toBeGreaterThan(3);
    expect(Object.keys(clears[0].data).sort()).toEqual(['b2b', 'combo', 'lines', 'pieceCount', 'seq', 'specials', 'tspin']);
  });

  it('쉬움은 어려움보다 느리다 (생각·조작 간격)', () => {
    const pieces = (level: 'easy' | 'hard') => {
      const { out } = run(level, 31000);
      const last = out.filter((o) => o.type === 'state').at(-1)!;
      return (last.data.board as string).replace(/0/g, '').length + 10 * out.filter((o) => o.type === 'clear').reduce((n, o) => n + (o.data.lines as number), 0);
    };
    expect(pieces('hard')).toBeGreaterThan(pieces('easy'));
  });

  it('정지 중에는 출력 없음, 쓰레기 공격은 보드로 올라오고 넘치면 topout', () => {
    const bot = createBotPlayer({ level: 'normal', seed: 5, stage: 0, startAt: 0, matchElapsedMs: 0 });
    bot.tick(0);
    bot.freeze(100);
    expect(bot.tick(500)).toEqual([]);
    bot.resume(600);
    expect(bot.tick(650).some((o) => o.type === 'state')).toBe(true);
    bot.receiveAttack({ garbage: 25, holeColumn: 3, spiritId: null, duration: 0, params: {} });
    const out: BotOutput[] = [];
    for (let t = 700; t < 20000 && !bot.toppedOut; t += 50) out.push(...bot.tick(t));
    expect(bot.toppedOut).toBe(true);
    expect(out.at(-1)!.type).toBe('topout');
    expect(bot.tick(30000)).toEqual([]);
  });

  it('다윗 물맷돌·아바돈은 봇 보드를 바꾼다', () => {
    const bot = createBotPlayer({ level: 'hard', seed: 5, stage: 0, startAt: 0, matchElapsedMs: 0 });
    bot.tick(0);
    bot.receiveAttack({ garbage: 2, holeColumn: 0, spiritId: 'abaddon', duration: 0, params: { columns: [5] } });
    expect(() => bot.applyEffect({ kind: 'hero', id: 'hero_david', action: { type: 'destroyTopBlocks', count: 3 } })).not.toThrow();
    expect(() => createBotPlayer({ level: 'nope' as 'easy', seed: 1, stage: 0, startAt: 0, matchElapsedMs: 0 })).toThrow(RangeError);
  });
});
