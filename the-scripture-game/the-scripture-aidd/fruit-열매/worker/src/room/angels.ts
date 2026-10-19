// angels.ts — 천사 5종 검증·효과(미가엘 상쇄/대기·가브리엘 7개·그룹 2줄·스랍 해제·섬기는 영들 1줄)만
// TASK-015-2 | REQ-008 FR-035 FR-038 | ARCH-011 | API-014 (`kind: angel`) API-023 API-025 | TBL-012 TBL-018 `angels` |
// UC-010 | OQ #4
import { angelsById } from "../content";
import { clearEffects, sealedRemaining } from "./effects";
import { reducePending, takePendingEntry } from "./garbage";
import type { ActionResult, EffectPayload } from "./hero-skills";
import { cooldownRemaining, sendStatus, spendGauge, startCooldown, type RoomContext,
  type SlotState } from "./player-state";

/**
 * FR-035 천사 소환: 대전만(MODE_FORBIDDEN — OQ #4 연습 천사 없음) → 천사 id(SKILL_INVALID) → 봉인(ANGEL_SEALED + 남은 ms,
 * UC-010 E1) → 쿨다운(COOLDOWN) → 게이지(GAUGE_LOW, UC-010 E2) → 차감·쿨다운 → 효과 → `effect` 양측 + `status`.
 * @param versus 대전(사람·봇)인가
 */
export function summonAngel(ctx: RoomContext, user: SlotState, versus: boolean, angelId: string): ActionResult {
  if (!versus) return { ok: false, code: "MODE_FORBIDDEN", retryInMs: null };
  const angel = angelsById.get(angelId);
  const defs = ctx.rules.angels;
  if (!angel || !(angelId in defs)) return { ok: false, code: "SKILL_INVALID", retryInMs: null };
  const now = ctx.now();
  const sealed = sealedRemaining(user, now);
  if (sealed > 0) return { ok: false, code: "ANGEL_SEALED", retryInMs: sealed };
  const wait = cooldownRemaining(user, angelId, now);
  if (wait > 0) return { ok: false, code: "COOLDOWN", retryInMs: wait };
  const def = defs[angelId as keyof typeof defs];
  if (!spendGauge(user, def.cost)) return { ok: false, code: "GAUGE_LOW", retryInMs: null };
  startCooldown(user, angelId, def.cooldownMs, now);
  const effect: EffectPayload = {
    source: "angel", id: angelId, by: user.slot, target: user.slot, params: angelParams(ctx, user, angelId,
      now), verseRef: angel.verse_ref,
  };
  ctx.broadcast("effect", effect);
  sendStatus(ctx, user);
  return { ok: true, effect };
}

/** 천사별 효과 적용 + API-023 params */
function angelParams(ctx: RoomContext, user: SlotState, angelId: string, now: number): Record<string, unknown> {
  const a = ctx.rules.angels;
  switch (angelId) {
    case "michael": {
      // FR-035 "용·사탄 계열 1회 완전 상쇄" — 대기 중이면 즉시 상쇄(그 저주도 해제), 없으면 다음 1회 대비 (UC-010 4단계)
      const families = a.michael.families;
      const entry = takePendingEntry(user, (e) => e.spiritId !== null && families.includes(e.spiritId));
      if (entry) {
        clearEffects(user, now, (id) => families.includes(id));
        return { canceled: true };
      }
      user.armed.michael = true;
      return { armed: true };
    }
    // FR-035 가브리엘: 다음 pieces개 블록 공개 + 착지 힌트 (클라이언트 표시)
    case "gabriel": return { pieces: a.gabriel.pieces };
    // FR-035 그룹: 대기 공격 burnPending줄 태움 (UC-010 4a 있는 만큼만)
    case "cherubim": return { burned: reducePending(user, a.cherubim.burnPending) };
    // FR-035 스랍: 걸린 저주 전부 해제 — 봉인 제외 (CODE-007 "스랍 해제 대상(seal 제외 전부)"), 납 블록 포함
    case "seraphim": return { cleared: clearEffects(user, now, (_id, category) => category !== "seal") };
    // FR-035 섬기는 영들: 보드의 쓰레기 줄 removeRows줄 (클라이언트 보드)
    case "ministering_spirits": return { rows: a.ministering_spirits.removeRows };
    default: return {};
  }
}
