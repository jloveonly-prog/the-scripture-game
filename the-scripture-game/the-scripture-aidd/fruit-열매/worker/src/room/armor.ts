// armor.ts — 갑주 6종 소모·action별 효과·검 되돌림 대기만
// TASK-015-2 | REQ-009 FR-036 FR-037 FR-038 | ARCH-011 | API-015 API-021(`reflected`) API-023 API-025 | TBL-014 TBL-018
// `armor` | UC-011 | OQ #4 #8
// 준비된 방어(armed)의 소모는 공격이 올 때 garbage.ts·effects.ts가 한다. 여기서는 사용 시점의 효과만 결정한다.
import { armorById } from "../content";
import { clearEffects } from "./effects";
import { deliverAttack, reducePending, takePendingEntry } from "./garbage";
import type { ActionResult, EffectPayload } from "./hero-skills";
import { pendingTotal, sendStatus, takeArmor, type RoomContext, type SlotState } from "./player-state";

/**
 * FR-037 전신갑주 사용: 대전만(MODE_FORBIDDEN — OQ #4) → 보유 확인·1개 소모(NO_ARMOR, UC-011 E1) → action별 효과
 * → `effect` 양측(source=armor) + `status` (+ 검이 되돌리면 `attack` reflected=true).
 * - nullify(허리띠·신·투구): 해당 분류 현재 효과 해제 + 다음 1회 무효 (OQ #8)
 * - reduce_next(흉배): 대기 공격이 있으면 즉시 −breastplateReduce, 없으면 다음 공격 1회 (API-015)
 * - block_next(방패): 다음 공격 1회 완전 차단
 * - reflect(검): 대기 공격 1건을 상대에게 되돌림, 없으면 다음 받는 공격 1회 대기 (UC-011 E2)
 */
export function useArmor(ctx: RoomContext, user: SlotState, opponent: SlotState | null, versus: boolean,
  armorId: string): ActionResult {
  if (!versus) return { ok: false, code: "MODE_FORBIDDEN", retryInMs: null };
  const def = armorById.get(armorId);
  if (!def || !takeArmor(user, armorId)) return { ok: false, code: "NO_ARMOR", retryInMs: null };
  const now = ctx.now();
  let params: Record<string, unknown>;
  switch (def.action) {
    case "nullify": {
      const categories = def.nullifies ?? [];
      const cleared = clearEffects(user, now, (_id, category) => categories.includes(category));
      user.armed.nullify[armorId] = categories.slice();
      params = { cleared, armed: true };
      break;
    }
    case "reduce_next": {
      if (pendingTotal(user) > 0) params = { reduced: reducePending(user, ctx.rules.armor.breastplateReduce) };
      else {
        user.armed.breastplate = true;
        params = { armed: true };
      }
      break;
    }
    case "block_next":
      user.armed.shield = true;
      params = { armed: true };
      break;
    case "reflect": {
      const entry = opponent ? takePendingEntry(user, (e) => e.lines > 0) : null;
      if (entry && opponent) {
        // 되돌린 공격의 저주도 내게서 걷힌다 — 공격 1회를 통째로 되돌림
        if (entry.spiritId) clearEffects(user, now, (id) => id === entry.spiritId);
        params = { reflected: true };
        emit(ctx, user, armorId, params, def.verse_ref);
        deliverAttack(ctx, user, opponent, { linesCleared: 0, attackPower: entry.lines, spiritId: entry.spiritId,
          reflected: true });
        return { ok: true, effect: effectOf(user, armorId, params, def.verse_ref) };
      }
      user.armed.sword = true;
      params = { armed: true };
      break;
    }
    default:
      params = {};
  }
  return { ok: true, effect: emit(ctx, user, armorId, params, def.verse_ref) };
}

function effectOf(user: SlotState, armorId: string, params: Record<string, unknown>, verseRef: string): EffectPayload {
  return { source: "armor", id: armorId, by: user.slot, target: user.slot, params, verseRef };
}

/** `effect` 양측 + `status` */
function emit(ctx: RoomContext, user: SlotState, armorId: string, params: Record<string, unknown>,
  verseRef: string): EffectPayload {
  const effect = effectOf(user, armorId, params, verseRef);
  ctx.broadcast("effect", effect);
  sendStatus(ctx, user);
  return effect;
}
