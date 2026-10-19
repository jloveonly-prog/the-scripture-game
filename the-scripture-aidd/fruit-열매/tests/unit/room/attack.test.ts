// TASK-020-4 · FR-075 · FR-024 · FR-026 · FR-030 · FR-045 · REQ-017 — 공격력 표·영 소환 표·13종 도달 가능성·구멍 열·상쇄 검사.
import { describe, expect, it } from 'vitest';
import {
  computeAttack, offsetAttack, rollHoleColumn, rollSpiritParams, selectSpirit, spiritCandidates, spiritGarbage, type AttackInput,
} from '../../../worker/src/attack.ts';
import { spiritsById } from '../../../worker/src/content.ts';
import { SPIRIT_IDS } from '../../../client/js/net/protocol.js';
import { mulberry32 } from '../../../client/js/engine/rng.js';

const clear = (over: Partial<AttackInput>): AttackInput => ({ lines: 1, combo: 0, b2b: false, tspin: false, jerichoCells: 0, ...over });

describe('computeAttack (data-ark §8.8.1)', () => {
  it.each([
    [1, 0], [2, 1], [3, 2], [4, 4],
  ])('%i줄 기본 공격력 %i', (lines, power) => {
    expect(computeAttack(clear({ lines }))).toBe(power);
  });

  it('T-Spin 가산 1줄 +1 · 2줄 +2 · 3줄 +3', () => {
    expect(computeAttack(clear({ lines: 1, tspin: true }))).toBe(1);
    expect(computeAttack(clear({ lines: 2, tspin: true }))).toBe(3);
    expect(computeAttack(clear({ lines: 3, tspin: true }))).toBe(5);
  });

  it('콤보 가산 1~2 → +1 · 3~4 → +2 · 5 이상 → +3', () => {
    expect(computeAttack(clear({ lines: 2, combo: 1 }))).toBe(2);
    expect(computeAttack(clear({ lines: 2, combo: 2 }))).toBe(2);
    expect(computeAttack(clear({ lines: 2, combo: 3 }))).toBe(3);
    expect(computeAttack(clear({ lines: 2, combo: 5 }))).toBe(4);
    expect(computeAttack(clear({ lines: 2, combo: 12 }))).toBe(4);
  });

  it('B2B 테트리스 = 5 (원문 "4 이상"), B2B T-Spin +1, 일반 2줄 B2B 가산 없음', () => {
    expect(computeAttack(clear({ lines: 4, b2b: true }))).toBe(5);
    expect(computeAttack(clear({ lines: 2, tspin: true, b2b: true }))).toBe(4);
    expect(computeAttack(clear({ lines: 2, b2b: true }))).toBe(1);
  });

  it('여리고 나팔 칸 1개당 +1 (FR-045)', () => {
    expect(computeAttack(clear({ lines: 2, jerichoCells: 2 }))).toBe(3);
    expect(computeAttack(clear({ lines: 1, jerichoCells: 1 }))).toBe(1);
  });
});

describe('악한 영 등급 결정 (data-ark §8.8.2 · FR-026)', () => {
  it('2줄 → 1등급, 3줄 → 2등급, 1줄 → 영 없음', () => {
    expect(spiritCandidates(clear({ lines: 2 }), false)).toEqual(['unclean_spirit', 'deaf_dumb_spirit']);
    expect(spiritCandidates(clear({ lines: 3 }), false)).toEqual(['legion', 'lying_spirit', 'divination_spirit']);
    expect(spiritCandidates(clear({ lines: 1, combo: 3 }), false)).toEqual([]);
  });

  it('테트리스 → 공중 권세 잡은 자/아바돈, 테트리스 + 콤보 3 → 4등급', () => {
    expect(spiritCandidates(clear({ lines: 4 }), false)).toEqual(['prince_of_the_air', 'abaddon']);
    expect(spiritCandidates(clear({ lines: 4, combo: 3 }), false)).toEqual(['abaddon', 'jezebel', 'wickedness']);
  });

  it('B2B 테트리스 → 4~5등급, 연속 B2B 테트리스 → 보스 dragon', () => {
    expect(spiritCandidates(clear({ lines: 4, b2b: true }), false)).toEqual(['abaddon', 'jezebel', 'wickedness', 'babylon', 'angel_of_light']);
    expect(spiritCandidates(clear({ lines: 4, b2b: true }), true)).toEqual(['dragon']);
  });

  it('T-Spin·콤보 등급 상승: T-Spin 1줄 → 2등급, T-Spin 2줄 + 콤보 3 → 3등급, T-Spin 3줄 + 콤보 → 4등급', () => {
    expect(spiritCandidates(clear({ lines: 1, tspin: true }), false)).toEqual(['legion', 'lying_spirit', 'divination_spirit']);
    expect(spiritCandidates(clear({ lines: 2, tspin: true, combo: 3 }), false)).toEqual(['beelzebub', 'prince_of_the_air', 'prince_of_persia']);
    expect(spiritCandidates(clear({ lines: 3, tspin: true }), false)).toEqual(['beelzebub', 'prince_of_the_air', 'prince_of_persia']);
    expect(spiritCandidates(clear({ lines: 3, tspin: true, combo: 4 }), false)).toEqual(['abaddon', 'jezebel', 'wickedness']);
  });

  it('보스를 제외한 13종 전부 대전에서 소환 가능 (FR-026 도달 가능성)', () => {
    const inputs: AttackInput[] = [];
    for (const lines of [1, 2, 3, 4]) {
      for (const tspin of lines <= 3 ? [false, true] : [false]) {
        for (const b2b of [false, true]) for (const combo of [0, 1, 3, 5]) inputs.push(clear({ lines, tspin, b2b, combo }));
      }
    }
    const reachable = new Set<string>();
    for (const input of inputs) for (const id of spiritCandidates(input, false)) reachable.add(id);
    const nonBoss = SPIRIT_IDS.filter((id: string) => spiritsById.get(id)?.grade !== 'boss');
    expect(nonBoss).toHaveLength(13);
    for (const id of nonBoss) expect(reachable.has(id)).toBe(true);
    expect(reachable.has('dragon')).toBe(false);
  });

  it('selectSpirit은 후보 중 균등 무작위 (서버 난수), 후보 없으면 null', () => {
    const rand = mulberry32(7);
    const seen = new Set<string | null>();
    for (let i = 0; i < 200; i += 1) seen.add(selectSpirit(clear({ lines: 3 }), false, rand));
    expect([...seen].sort()).toEqual(['divination_spirit', 'legion', 'lying_spirit']);
    expect(selectSpirit(clear({ lines: 1 }), false, rand)).toBeNull();
  });
});

describe('구멍 열·영 매개변수·보스 쓰레기·상쇄', () => {
  it('holeColumn은 0~9 정수이고 전 범위가 나온다', () => {
    const rand = mulberry32(99);
    const cols = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const c = rollHoleColumn(rand);
      expect(Number.isInteger(c) && c >= 0 && c <= 9).toBe(true);
      cols.add(c);
    }
    expect(cols.size).toBe(10);
  });

  it('wind 방향·locustHoles 열(서로 다른 3열)을 서버가 굴린다', () => {
    const rand = mulberry32(3);
    const wind = rollSpiritParams(spiritsById.get('prince_of_the_air')!, rand);
    expect(['left', 'right']).toContain(wind.direction);
    expect(wind.gravityMultiplier).toBe(2);
    const locust = rollSpiritParams(spiritsById.get('abaddon')!, rand);
    const columns = locust.columns as number[];
    expect(columns).toHaveLength(3);
    expect(new Set(columns).size).toBe(3);
    expect(rollSpiritParams(spiritsById.get('wickedness')!, rand)).toEqual({ rows: 1, clearsToExpire: 4 });
  });

  it('용(dragon) 쓰레기 = max(공격력, 6), 그 밖은 그대로', () => {
    expect(spiritGarbage('dragon', 5)).toBe(6);
    expect(spiritGarbage('dragon', 9)).toBe(9);
    expect(spiritGarbage('abaddon', 4)).toBe(4);
    expect(spiritGarbage(null, 2)).toBe(2);
  });

  it('상쇄: 대기 큐를 먼저 줄이고 잔여만 보낸다 (FR-025)', () => {
    expect(offsetAttack(4, 3)).toEqual({ used: 3, residual: 1, pending: 0 });
    expect(offsetAttack(2, 5)).toEqual({ used: 2, residual: 0, pending: 3 });
    expect(offsetAttack(0, 5)).toEqual({ used: 0, residual: 0, pending: 5 });
  });
});
