// TASK-011-4 · FR-027~031 · FR-035 · FR-037 · FR-075 — 영 효과 클라이언트 상태·만료 단위 테스트.
import { describe, expect, it } from 'vitest';
import { createInterference } from '../../../client/js/battle/interference-client.js';
import { createEmptyGrid } from '../../../client/js/engine/encode.js';

const seq = (values) => { let i = 0; return () => values[i++ % values.length]; };
const attack = (spiritId, extra = {}) => ({ spiritId, garbage: 1, holeColumn: 0, duration: 6000, params: {}, ...extra });

describe('interference-client — 시간형 효과 만료 (FR-031)', () => {
  it('지속 시간이 지나면 expire가 spiritId를 돌려준다', () => {
    const it0 = createInterference({ rand: seq([0.1]) });
    it0.applySpirit(attack('jezebel'), 1000);
    expect(it0.isReversed(6999)).toBe(true);
    expect(it0.expire(6999)).toEqual([]);
    expect(it0.expire(7000)).toEqual(['jezebel']);
    expect(it0.isReversed(7000)).toBe(false);
  });

  it('attack.duration이 0이면 정의 지속 시간을 쓴다, 같은 효과는 겹치지 않고 교체', () => {
    const it0 = createInterference();
    it0.applySpirit(attack('unclean_spirit', { duration: 0 }), 0);
    it0.applySpirit(attack('unclean_spirit', { duration: 0 }), 1000);
    const list = it0.activeList(1000);
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual({ spiritId: 'unclean_spirit', category: 'vision', remainingMs: 3000, clearsLeft: null });
  });

  it('spiritEnd·범주 해제 (스랍·갑주)', () => {
    const it0 = createInterference();
    it0.applySpirit(attack('jezebel'), 0);
    it0.applySpirit(attack('lying_spirit'), 0);
    it0.applySpirit(attack('beelzebub'), 0);
    expect(it0.clearCategories(['deception', 'control']).sort()).toEqual(['jezebel', 'lying_spirit']);
    expect(it0.end('beelzebub')).toBe(true);
    expect(it0.end('beelzebub')).toBe(false);
    expect(it0.activeList(0)).toEqual([]);
  });
});

describe('interference-client — 조작·표시 효과 (FR-027~030)', () => {
  it('바람: 중력 ×2, 1000ms마다 서버 방향으로 1칸', () => {
    const it0 = createInterference();
    it0.applySpirit(attack('prince_of_the_air', { params: { direction: 'left' } }), 0);
    expect(it0.gravityMultiplier(10)).toBe(2);
    expect(it0.windPushes(999)).toEqual([]);
    expect(it0.windPushes(2100)).toEqual([-1, -1]);
    expect(it0.windPushes(2500)).toEqual([]);
    expect(it0.gravityMultiplier(6000)).toBe(1);
  });

  it('광명의 천사: 1500ms 위장 후 좌우 반전', () => {
    const it0 = createInterference();
    it0.applySpirit(attack('angel_of_light'), 0);
    expect(it0.isReversed(1000)).toBe(false);
    expect(it0.isReversed(1500)).toBe(true);
    expect(it0.isReversed(6000)).toBe(false);
  });

  it('미리보기 숨김·가짜 미리보기', () => {
    const it0 = createInterference({ rand: seq([0.99, 0.0]) });
    it0.applySpirit(attack('deaf_dumb_spirit', { duration: 5000 }), 0);
    expect(it0.isNextHidden(100)).toBe(true);
    const liar = createInterference({ rand: seq([0.0]) });
    liar.applySpirit(attack('lying_spirit'), 0);
    expect(liar.nextView([3, 4, 5], 10)).toEqual([1, 1, 1]);
    expect(liar.nextView([3, 4, 5], 6000)).toEqual([3, 4, 5]);
  });

  it('점치는 귀신: 고스트가 ±2열 어긋난다 (막히면 반대쪽)', () => {
    const it0 = createInterference({ rand: seq([0.9]) }); // 방향 +
    it0.applySpirit(attack('divination_spirit'), 0);
    const grid = createEmptyGrid();
    const active = { type: 3, rot: 0, x: 3, y: 0 };
    const real = { ...active, y: 18 };
    expect(it0.ghostView(grid, active, real, 10)).toEqual({ type: 3, rot: 0, x: 5, y: 18 });
    const edge = { type: 3, rot: 0, x: 7, y: 0 };
    expect(it0.ghostView(grid, edge, { ...edge, y: 18 }, 10)).toEqual({ type: 3, rot: 0, x: 5, y: 18 });
  });

  it('아바돈·악은 보드 요청을 돌려주고, 납 줄은 줄 단위로 남는다', () => {
    const it0 = createInterference();
    expect(it0.applySpirit(attack('abaddon', { duration: 0, params: { columns: [1, 4, 8] } }), 0).board)
      .toEqual({ type: 'locustHoles', columns: [1, 4, 8] });
    expect(it0.activeList(0)).toEqual([]);
    expect(it0.applySpirit(attack('wickedness', { duration: 0, params: { clearsToExpire: 4 } }), 0).board)
      .toEqual({ type: 'leadRow', rows: 1, clearsToExpire: 4 });
    expect(it0.activeList(99999, [{ row: 19, clearsLeft: 3 }])).toEqual([{ spiritId: 'wickedness', category: 'board', remainingMs: null, clearsLeft: 3 }]);
    expect(it0.syncLeadRows(1)).toEqual([]);
    expect(it0.syncLeadRows(0)).toEqual(['wickedness']);
  });

  it('알 수 없는 영은 무시', () => {
    expect(createInterference().applySpirit(attack('not_a_spirit'), 0)).toBeNull();
  });
});
