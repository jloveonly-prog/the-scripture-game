// TASK-021-4 · FR-036 · FR-037 · FR-038 · REQ-009 · R-10 · OQ #8 — 전신갑주 획득·보유(종류별 1)·사용 6종·장전 방어 판정.
// 단일 책임: 갑주 보유 목록과 장전 방어(wards — devguide §7.12)를 관리하고, 받는 공격 1회에 방어 순서를 적용한다.
import { ARMOR_IDS } from '../../../client/js/net/protocol.js';
import { angelsById, armorById, type ActionDef, type ArmorDef } from '../content';
import { applyGraceGarbage } from './grace';

/** devguide §7.12 playerStatus.wards */
export interface Wards {
  vision: number; deception: number; control: number; speed: number;
  shield: boolean; reflect: boolean; breastplate: boolean; michael: number;
}
export type WardCategory = 'vision' | 'deception' | 'control' | 'speed';
const WARD_CATEGORIES: readonly WardCategory[] = ['vision', 'deception', 'control', 'speed'];

export interface ArmorState { owned: string[]; wards: Wards }

export type UseArmorResult =
  | { ok: true; armor: ArmorDef; clearCategories: string[] }
  | { ok: false; code: 'ARMOR_NOT_OWNED' | 'NOT_ALLOWED_IN_MODE' };

/** 받는 공격 1회 (방어 적용 전) */
export interface IncomingAttack { garbage: number; spiritId: string | null }
export interface DefenseContext { armor: ArmorState; garbageImmuneUntil: number; grace: boolean; now: number; allowReflect: boolean }
export interface DefenseOutcome {
  outcome: 'blocked' | 'reflected' | 'negated' | 'normal';
  garbage: number;
  spiritId: string | null;
  /** 소모된 방어 (연출·로그용): shield_of_faith · sword_of_the_spirit · michael · peter · breastplate_of_righteousness · grace */
  consumed: string[];
}

export function createArmorState(): ArmorState {
  return {
    owned: [],
    wards: { vision: 0, deception: 0, control: 0, speed: 0, shield: false, reflect: false, breastplate: false, michael: 0 },
  };
}

// FR-036 갑주 획득 (종류별 최대 1 — 같은 종류 중복 획득 시 보유 유지, architecture §11 #12) → 새로 얻었는가
export function acquireArmor(state: ArmorState, armorId: string): boolean {
  if (!armorById.has(armorId) || state.owned.includes(armorId)) return false;
  state.owned.push(armorId);
  state.owned.sort((a, b) => ARMOR_IDS.indexOf(a) - ARMOR_IDS.indexOf(b));
  return true;
}

// FR-041 말씀 대결 보상용: 보유하지 않은 갑주 중 무작위 1개 (6종 전부 보유면 null → 게이지 +50)
export function randomUnownedArmor(state: ArmorState, rand: () => number): string | null {
  const missing = ARMOR_IDS.filter((id: string) => !state.owned.includes(id));
  return missing.length === 0 ? null : missing[Math.floor(rand() * missing.length)];
}

function applyArmorAction(wards: Wards, action: ActionDef): string[] {
  switch (action.type) {
    case 'wardCategories': {
      const categories = (action.categories as string[]) ?? [];
      const charges = Number(action.charges ?? 0);
      for (const c of categories) if ((WARD_CATEGORIES as readonly string[]).includes(c)) wards[c as WardCategory] += charges;
      return action.clearActive ? categories : [];
    }
    case 'reduceNextGarbage': wards.breastplate = true; return [];
    case 'blockNextAttack': wards.shield = true; return [];
    case 'reflectNextAttack': wards.reflect = true; return [];
    default: throw new Error(`unknown armor action ${action.type}`);
  }
}

// FR-037 보유 갑주 1개 사용 → 소모 후 장전 (허리띠·신·투구는 진행 중 범주 효과 해제 목록을 돌려준다)
export function useArmor(state: ArmorState, armorId: string, practice: boolean): UseArmorResult {
  if (practice) return { ok: false, code: 'NOT_ALLOWED_IN_MODE' };
  const armor = armorById.get(armorId);
  if (!armor || !state.owned.includes(armorId)) return { ok: false, code: 'ARMOR_NOT_OWNED' };
  state.owned = state.owned.filter((id) => id !== armorId);
  const clear = applyArmorAction(state.wards, armor.action);
  return { ok: true, armor, clearCategories: clear };
}

// FR-037 범주 무효 장전 소모 (허리띠 deception·control, 신 speed, 투구 vision) → 영 효과 무효 여부
export function consumeCategoryWard(state: ArmorState, category: string): boolean {
  if (!(WARD_CATEGORIES as readonly string[]).includes(category)) return false;
  const key = category as WardCategory;
  if (state.wards[key] <= 0) return false;
  state.wards[key] -= 1;
  return true;
}

/** 미가엘이 상쇄하는 영 목록 (angels.json michael.action.spiritIds) */
function michaelTargets(): string[] {
  const ids = angelsById.get('michael')?.action.spiritIds;
  return Array.isArray(ids) ? (ids as string[]) : [];
}

// FR-037·FR-016·FR-035·FR-062 받는 공격 방어 순서 (API-204 ⑥): 방패 → 검 → 미가엘 → 베드로 → 흉배 → 은혜
export function applyIncomingDefenses(attack: IncomingAttack, ctx: DefenseContext): DefenseOutcome {
  const { wards } = ctx.armor;
  const consumed: string[] = [];
  if (wards.shield) {
    wards.shield = false;
    return { outcome: 'blocked', garbage: 0, spiritId: null, consumed: ['shield_of_faith'] };
  }
  if (wards.reflect && ctx.allowReflect) {
    wards.reflect = false;
    return { outcome: 'reflected', garbage: attack.garbage, spiritId: attack.spiritId, consumed: ['sword_of_the_spirit'] };
  }
  if (attack.spiritId !== null && wards.michael > 0 && michaelTargets().includes(attack.spiritId)) {
    wards.michael -= 1;
    return { outcome: 'negated', garbage: 0, spiritId: null, consumed: ['michael'] };
  }
  let garbage = attack.garbage;
  if (ctx.garbageImmuneUntil > ctx.now && garbage > 0) {
    garbage = 0;
    consumed.push('peter');
  }
  if (wards.breastplate && garbage > 0) {
    wards.breastplate = false;
    const rows = Number(armorById.get('breastplate_of_righteousness')?.action.rows ?? 0);
    garbage = Math.max(0, garbage - rows);
    consumed.push('breastplate_of_righteousness');
  }
  const graced = applyGraceGarbage(garbage, ctx.grace);
  if (graced !== garbage) consumed.push('grace');
  return { outcome: 'normal', garbage: graced, spiritId: attack.spiritId, consumed };
}
