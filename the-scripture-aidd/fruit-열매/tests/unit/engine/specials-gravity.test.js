// TASK-010-6 · FR-010 · FR-036 · FR-044~047 · D-14 · FR-075 — C-SPECIAL 굴림 수열·중력 곡선 단위 테스트.
import { describe, expect, it } from 'vitest';
import balance from '../../../content/balance.json';
import { createSpecialRoller, specialCellCode, specialFromCode } from '../../../client/js/engine/specials.js';
import { cellsPerSecond, effectiveCellsPerSecond } from '../../../client/js/engine/gravity.js';
import { deriveSeed, mulberry32 } from '../../../client/js/engine/rng.js';
import { ARMOR_IDS } from '../../../client/js/net/protocol.js';

const rollMany = (opts, count, state = {}) => {
  const roller = createSpecialRoller({ specials: balance.specials, ...opts });
  return Array.from({ length: count }, (_, n) => roller.roll({ n, ...state }));
};

describe('specials.js — C-SPECIAL (devguide §7.3)', () => {
  it('같은 시드는 같은 결과 (서버 재계산 가능 — D-14)', () => {
    const a = rollMany({ seed: 777, mode: 'random', stage: 2 }, 300, { combo: 2, stackHeight: 5 });
    const b = rollMany({ seed: 777, mode: 'random', stage: 2 }, 300, { combo: 2, stackHeight: 5 });
    expect(a).toEqual(b);
  });

  it('블록마다 굴림 2회 소비 — u1·u2를 직접 재계산해 일치', () => {
    const seed = 2718281828;
    const rand = mulberry32(deriveSeed(seed, balance.specials.seedXor));
    const out = rollMany({ seed, mode: 'practice', stage: 2 }, 200, { stackHeight: 0 });
    out.forEach((res) => {
      const u1 = rand();
      const u2 = rand();
      const pJ = balance.specials.jericho.base;
      const pM = balance.specials.manna.lowChance;
      const expected = u1 < pJ ? 'jericho' : u1 < pJ + pM ? 'manna' : null;
      expect(res?.kind ?? null).toBe(expected);
      if (res) expect(res.cellIndex).toBe(Math.floor(u2 * 4));
    });
  });

  it('말씀 칸 간격은 7~12 (대전·stage ≥ 1)', () => {
    const out = rollMany({ seed: 42, mode: 'bot', stage: 1 }, 400);
    const words = out.map((r, n) => (r?.kind === 'word' ? n : -1)).filter((n) => n >= 0);
    expect(words.length).toBeGreaterThan(25);
    expect(words[0]).toBeGreaterThanOrEqual(7);
    expect(words[0]).toBeLessThanOrEqual(12);
    for (let i = 1; i < words.length; i += 1) {
      expect(words[i] - words[i - 1]).toBeGreaterThanOrEqual(7);
      expect(words[i] - words[i - 1]).toBeLessThanOrEqual(12);
    }
    expect(out.some((r) => r?.kind === 'jericho' || r?.kind === 'manna')).toBe(false); // stage 1은 말씀만
  });

  it('연습 모드는 말씀·갑주 없음, stage 0 대전은 갑주만', () => {
    const practice = rollMany({ seed: 5, mode: 'practice', stage: 2 }, 500);
    expect(practice.some((r) => r?.kind === 'word' || r?.kind === 'armor')).toBe(false);
    const stage0 = rollMany({ seed: 5, mode: 'random', stage: 0 }, 2000).filter(Boolean);
    expect(stage0.every((r) => r.kind === 'armor' && ARMOR_IDS.includes(r.armorId))).toBe(true);
    const rate = stage0.length / 2000;
    expect(rate).toBeGreaterThan(0.025);
    expect(rate).toBeLessThan(0.055);
  });

  it('위기일수록 만나 확률 상승 (FR-046)', () => {
    const count = (state) => rollMany({ seed: 9, mode: 'practice', stage: 2 }, 3000, state).filter((r) => r?.kind === 'manna').length;
    expect(count({ inDanger: true })).toBeGreaterThan(count({ stackHeight: 0 }) * 3);
  });

  it('n 순서 위반은 RangeError, 셀 코드 왕복', () => {
    const roller = createSpecialRoller({ seed: 1, mode: 'random', stage: 2, specials: balance.specials });
    expect(() => roller.roll({ n: 1 })).toThrow(RangeError);
    expect(specialCellCode('armor', 'shield_of_faith')).toBe('g');
    expect(specialFromCode('g')).toEqual({ kind: 'armor', armorId: 'shield_of_faith' });
    expect(specialFromCode('a')).toEqual({ kind: 'word' });
    expect(specialFromCode('1')).toBeNull();
  });
});

describe('gravity.js — 낙하 곡선 (FR-010, data-ark §8.8.8)', () => {
  const g = balance.gravity;
  it('0초 1.0, 120초 4.0, 이후 지수 가속, 상한 20', () => {
    expect(cellsPerSecond(0, g)).toBeCloseTo(1.0);
    expect(cellsPerSecond(60000, g)).toBeCloseTo(2.5);
    expect(cellsPerSecond(120000, g)).toBeCloseTo(4.0);
    expect(cellsPerSecond(180000, g)).toBeCloseTo(4.0 * 1.012 ** 60);
    expect(cellsPerSecond(3600000, g)).toBe(20);
  });

  it('소프트 드롭 ×20, 바람 ×2', () => {
    expect(effectiveCellsPerSecond(0, g, { softDrop: true })).toBeCloseTo(20);
    expect(effectiveCellsPerSecond(0, g, { multiplier: 2 })).toBeCloseTo(2);
  });
});
