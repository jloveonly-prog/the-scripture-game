// TASK-021-2 · FR-014 · FR-015 · FR-016 · FR-017 · FR-034 · REQ-008 · R-10 — 위인 스킬 4종(다윗·솔로몬·베드로·바울) 발동 검증·효과 지시.
// 단일 책임: 내 위인 스킬인지·게이지·쿨다운 검사 → 차감 → 서버 측 효과(베드로 무효) 적용 → API-255 effect 데이터 생성.
import { heroSkillId } from '../../../client/js/net/protocol.js';
import { heroesById, type HeroDef } from '../content';
import { checkSpend, spendFaith } from './faith';
import type { EffectData, PlayerState, SlotNo } from './room-state';

export type SkillResult =
  | { ok: true; effect: EffectData }
  | { ok: false; code: 'INVALID_SKILL' | 'FAITH_INSUFFICIENT' }
  | { ok: false; code: 'COOLDOWN'; retryAfterMs: number };

/** 상대 보드가 대상인 스킬 (다윗 물맷돌 — 상대 클라이언트가 자기 보드에서 제거, api-gate API-205) */
const OPPONENT_TARGET_ACTIONS: readonly string[] = ['destroyTopBlocks'];

// FR-034 skillId가 내 위인의 스킬인가 (위인 스킬은 내 위인 것만 — api-gate API-205)
export function resolveHeroSkill(heroId: string, skillId: string): HeroDef | null {
  const hero = heroesById.get(heroId);
  return hero && heroSkillId(heroId) === skillId && hero.skill.id === skillId ? hero : null;
}

// FR-014~017 스킬 대상 슬롯: 다윗 = 상대(연습처럼 상대가 없으면 내 보드), 나머지 = 나
export function heroTargetSlot(hero: HeroDef, userSlot: SlotNo, opponentSlot: SlotNo | null): SlotNo {
  return OPPONENT_TARGET_ACTIONS.includes(hero.skill.action.type) && opponentSlot !== null ? opponentSlot : userSlot;
}

// FR-034·FR-014~017 위인 스킬 발동 (검증 실패 시 상태 불변)
export function performHeroSkill(user: PlayerState, skillId: string, opponentSlot: SlotNo | null, now: number): SkillResult {
  const hero = resolveHeroSkill(user.heroId, skillId);
  if (!hero) return { ok: false, code: 'INVALID_SKILL' };
  const { cost, cooldownMs, action } = hero.skill;
  const check = checkSpend(user.faith, skillId, cost, now);
  if (!check.ok) return check;
  spendFaith(user.faith, skillId, cost, cooldownMs, now);

  const durationMs = typeof action.durationMs === 'number' ? action.durationMs : 0;
  // FR-016 베드로: 서버가 durationMs 동안 나에게 오는 쓰레기를 0으로
  if (action.type === 'garbageImmune') user.garbageImmuneUntil = now + durationMs;

  return {
    ok: true,
    effect: {
      kind: 'hero', id: hero.skill.id, bySlot: user.slot, targetSlot: heroTargetSlot(hero, user.slot, opponentSlot),
      action: { ...action }, verseRef: hero.verseRef, durationMs,
    },
  };
}
