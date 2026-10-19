// TASK-021-6 · FR-075 · FR-036 · FR-037 · FR-038 — 갑주 획득·보유·사용 6종·장전 방어 순서 검사.
import { describe, expect, it } from 'vitest';
import {
  acquireArmor, applyIncomingDefenses, consumeCategoryWard, createArmorState, randomUnownedArmor, useArmor, type DefenseContext,
} from '../../../worker/src/room/armor.ts';
import { ARMOR_IDS } from '../../../client/js/net/protocol.js';
import { mulberry32 } from '../../../client/js/engine/rng.js';

const ctx = (over: Partial<DefenseContext> = {}): DefenseContext => ({
  armor: createArmorState(), garbageImmuneUntil: 0, grace: false, now: 1000, allowReflect: true, ...over,
});

describe('획득·보유 (FR-036)', () => {
  it('종류별 1개, 같은 종류 중복 획득은 보유 유지, 정렬은 CODE-006 순서', () => {
    const s = createArmorState();
    expect(acquireArmor(s, 'sword_of_the_spirit')).toBe(true);
    expect(acquireArmor(s, 'belt_of_truth')).toBe(true);
    expect(acquireArmor(s, 'belt_of_truth')).toBe(false);
    expect(acquireArmor(s, 'nope')).toBe(false);
    expect(s.owned).toEqual(['belt_of_truth', 'sword_of_the_spirit']);
  });

  it('보상용 무작위 갑주는 미보유 중에서, 6종 전부 보유면 null', () => {
    const s = createArmorState();
    for (const id of ARMOR_IDS.slice(1)) acquireArmor(s, id);
    expect(randomUnownedArmor(s, mulberry32(1))).toBe('belt_of_truth');
    acquireArmor(s, 'belt_of_truth');
    expect(randomUnownedArmor(s, mulberry32(1))).toBeNull();
  });
});

describe('사용 6종 (FR-037)', () => {
  it('미보유 → ARMOR_NOT_OWNED, 연습 → NOT_ALLOWED_IN_MODE', () => {
    const s = createArmorState();
    expect(useArmor(s, 'shield_of_faith', false)).toEqual({ ok: false, code: 'ARMOR_NOT_OWNED' });
    acquireArmor(s, 'shield_of_faith');
    expect(useArmor(s, 'shield_of_faith', true)).toEqual({ ok: false, code: 'NOT_ALLOWED_IN_MODE' });
  });

  it.each([
    ['belt_of_truth', { deception: 1, control: 1 }, ['deception', 'control']],
    ['gospel_shoes', { speed: 1 }, ['speed']],
    ['helmet_of_salvation', { vision: 1 }, ['vision']],
    ['breastplate_of_righteousness', { breastplate: true }, []],
    ['shield_of_faith', { shield: true }, []],
    ['sword_of_the_spirit', { reflect: true }, []],
  ])('%s 사용 → 소모 + 장전', (armorId, wards, clear) => {
    const s = createArmorState();
    acquireArmor(s, armorId);
    const r = useArmor(s, armorId, false);
    expect(r.ok).toBe(true);
    expect(r.ok && r.clearCategories).toEqual(clear);
    expect(s.wards).toMatchObject(wards);
    expect(s.owned).toEqual([]);
  });

  it('범주 무효 장전은 1회 소모, 해당 없는 범주(seal·board)는 무효 불가', () => {
    const s = createArmorState();
    s.wards.vision = 1;
    expect(consumeCategoryWard(s, 'vision')).toBe(true);
    expect(consumeCategoryWard(s, 'vision')).toBe(false);
    expect(consumeCategoryWard(s, 'board')).toBe(false);
  });
});

describe('받는 공격 방어 순서 (API-204 ⑥)', () => {
  it('방패: 쓰레기·영 완전 차단 (1회)', () => {
    const c = ctx();
    c.armor.wards.shield = true;
    expect(applyIncomingDefenses({ garbage: 4, spiritId: 'abaddon' }, c)).toEqual({ outcome: 'blocked', garbage: 0, spiritId: null, consumed: ['shield_of_faith'] });
    expect(c.armor.wards.shield).toBe(false);
  });

  it('검: 되돌림 — 되돌아온 공격은 다시 되돌릴 수 없음', () => {
    const c = ctx();
    c.armor.wards.reflect = true;
    expect(applyIncomingDefenses({ garbage: 2, spiritId: null }, c).outcome).toBe('reflected');
    const back = ctx({ allowReflect: false });
    back.armor.wards.reflect = true;
    expect(applyIncomingDefenses({ garbage: 2, spiritId: null }, back).outcome).toBe('normal');
    expect(back.armor.wards.reflect).toBe(true);
  });

  it('미가엘: dragon·angel_of_light 공격 1회 완전 상쇄', () => {
    const c = ctx();
    c.armor.wards.michael = 1;
    expect(applyIncomingDefenses({ garbage: 2, spiritId: 'babylon' }, c).outcome).toBe('normal');
    expect(applyIncomingDefenses({ garbage: 6, spiritId: 'dragon' }, c)).toMatchObject({ outcome: 'negated', garbage: 0, spiritId: null });
    expect(c.armor.wards.michael).toBe(0);
  });

  it('베드로 무효 → 흉배 −2 → 은혜 −1', () => {
    expect(applyIncomingDefenses({ garbage: 3, spiritId: 'legion' }, ctx({ garbageImmuneUntil: 5000 }))).toMatchObject({ garbage: 0, spiritId: 'legion', consumed: ['peter'] });
    const c = ctx({ grace: true });
    c.armor.wards.breastplate = true;
    expect(applyIncomingDefenses({ garbage: 4, spiritId: null }, c)).toMatchObject({ garbage: 1, consumed: ['breastplate_of_righteousness', 'grace'] });
    expect(c.armor.wards.breastplate).toBe(false);
  });
});
