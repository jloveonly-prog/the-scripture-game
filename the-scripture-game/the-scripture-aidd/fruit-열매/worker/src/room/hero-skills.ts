// hero-skills.ts — 위인 스킬 4종 검증(GAUGE_LOW·COOLDOWN·SKILL_INVALID)·효과 결정만
// TASK-015-1 | REQ-003 REQ-008 FR-014 FR-015 FR-016 FR-017 FR-034 | ARCH-011 | API-014 API-023 API-025 | TBL-011
// TBL-018 `heroSkills`
// 라운드 진행 중 여부(NOT_ACTIVE)는 호출자(match-flow 상태)가 먼저 본다. 거부 메시지 전송(`reject`)도 호출자(02 handlers).
import { heroesById } from "../content";
import type { Slot } from "../storage/adapter";
import { cooldownRemaining, sendStatus, spendGauge, startCooldown, type RoomContext,
  type SlotState } from "./player-state";

/** API-023 `effect` 페이로드 (CODE-008 source) */
export interface EffectPayload {
  source: "hero" | "angel" | "armor" | "jesus" | "special" | "grace";
  id: string;
  /** 발동한 슬롯 — 예수님 이벤트는 null (C-002 플레이어가 소환하지 않음) */
  by: Slot | null;
  /** 효과를 보드에 적용할 슬롯 (연습 모드 다윗 스킬은 null — 연출만, UC-006 4단계) */
  target: Slot | null;
  params: Record<string, unknown>;
  verseRef: string | null;
}

/** API-025 `reject` 코드 (api-gate §4.2) */
export type RejectCode =
  | "SKILL_INVALID" | "COOLDOWN" | "GAUGE_LOW" | "ANGEL_SEALED" | "MODE_FORBIDDEN" | "NO_ARMOR" | "NOT_ACTIVE";

/** 스킬·천사·갑주 처리 결과 — 실패는 예외가 아닌 값 */
export type ActionResult =
  | { ok: true; effect: EffectPayload }
  | { ok: false; code: RejectCode; retryInMs: number | null };

/**
 * FR-034 위인 스킬 발동: 내 위인 스킬인지(SKILL_INVALID) → 쿨다운(COOLDOWN + retryInMs, UC-009 E2) → 게이지(GAUGE_LOW, UC-009 E1)
 * → 게이지 차감·쿨다운 시작 → 효과 결정 → `effect` 양측 + `status`.
 * @param opponent 상대 슬롯 (연습 = null)
 */
export function useHeroSkill(ctx: RoomContext, user: SlotState, opponent: SlotState | null,
  skillId: string): ActionResult {
  const hero = heroesById.get(user.heroId);
  const skills = ctx.rules.heroSkills;
  if (!hero || hero.skill_id !== skillId || !(skillId in skills)) return { ok: false, code: "SKILL_INVALID",
    retryInMs: null };
  const def = skills[skillId as keyof typeof skills];
  const now = ctx.now();
  const wait = cooldownRemaining(user, skillId, now);
  if (wait > 0) return { ok: false, code: "COOLDOWN", retryInMs: wait };
  if (!spendGauge(user, def.cost)) return { ok: false, code: "GAUGE_LOW", retryInMs: null };
  startCooldown(user, skillId, def.cooldownMs, now);
  const effect: EffectPayload = { source: "hero", id: skillId, by: user.slot, target: user.slot, params: {},
    verseRef: hero.verse_ref };
  if ("blocks" in def) {
    // FR-014 다윗 물맷돌 — 상대 보드 (받는 쪽 클라이언트·봇이 적용, UC-009 5b 빈 보드면 연출만·게이지 차감)
    effect.target = opponent ? opponent.slot : null;
    effect.params = { blocks: def.blocks };
  } else if ("hintMs" in def) {
    // FR-015 솔로몬 지혜로운 마음 — 최적 착지 힌트
    effect.params = { hintMs: def.hintMs };
  } else if ("durationMs" in def) {
    // FR-016 베드로 이 반석 위에 — 이 동안 만료된 상승은 무효 (garbage.ts rise)
    user.peterUntil = now + def.durationMs;
    effect.params = { durationMs: def.durationMs };
  } else if ("rows" in def) {
    // FR-017 바울 옥문이 열리다 — 맨 아래 쓰레기 줄 rows줄 (클라이언트 보드)
    effect.params = { rows: def.rows };
  }
  ctx.broadcast("effect", effect);
  sendStatus(ctx, user);
  return { ok: true, effect };
}
