// specials.ts — 특수 칸 재계산 검증·효과 결정만 (해금 단계 포함)
// TASK-016 | REQ-009 REQ-012 FR-032 FR-036 FR-044 FR-045 FR-046 FR-047 C-001 | ARCH-011 | API-013 `specials` API-023 |
// D-09 | architecture §9.3
// `clear.specials`를 클라이언트와 같은 engine/specials.js로 재계산해 검증한다:
// 말씀·갑주 = 정확 일치, 여리고·만나 = 굴림값 < 해당 종류 최대 확률일 때만 인정 (콤보·위기는 클라이언트 상태이므로 상한 검증).
import * as engineSpecials from "../../../client/js/engine/specials.js";
import { armor as armorContent } from "../content";
import type { Rules } from "../content";
import type { EffectPayload } from "./hero-skills";
import { addArmor, addGauge, sendStatus, type RoomContext, type SlotState } from "./player-state";

/** CODE-013 특수 칸 */
export const SPECIAL_KINDS = ["word", "jericho", "manna", "armor"] as const;
export type SpecialKind = (typeof SPECIAL_KINDS)[number];

/** API-013 `specials` 원소 */
export interface ClaimedSpecial {
  kind: string;
  pieceIndex: number;
  armorId?: string;
}

/** API-019 `start.stage` */
export interface Stage {
  word: boolean;
  jericho: boolean;
  manna: boolean;
}

export type SpecialsVerdict =
  | { ok: true; word: boolean; jericho: number; manna: number; armors: string[]; pieces: number[] }
  | { ok: false; reason: string };

/** 갑주 id 순서 (armor.json — 클라이언트 엔진과 같은 목록) */
export const ARMOR_IDS: readonly string[] = armorContent.map((a) => a.id);

/** API-013 specials 최대 4개 (줄 4개 × 줄마다 한 칸까지 — 검증 규칙 원문) */
const MAX_CLAIMS = 4;

/**
 * 특수 칸 주장 검증 (D-09). 하나라도 위조면 전체 거부 → 호출자가 CLEAR_REJECTED (FR-032).
 * @param seed 이번 라운드 시드 (API-019)
 * @param stage 이번 라운드 해금 단계 (FR-047 — 두 플레이어 중 낮은 쪽, OQ #12)
 * @param versus 대전인가 (말씀·갑주는 대전만 — OQ #4, UC-014 1c)
 * @param pieceCount `clear.pieceCount` — 홀드로 한 개 먼저 꺼낼 수 있으므로 조각 번호는 pieceCount + 1까지
 * @param claimedBefore 이번 라운드에 이미 인정한 조각 번호 (같은 칸 두 번 인정 금지)
 */
export function verifySpecials(
  claims: readonly ClaimedSpecial[], seed: number, stage: Stage, versus: boolean, pieceCount: number,
  claimedBefore: ReadonlySet<number>, rules: Rules,
): SpecialsVerdict {
  if (claims.length > MAX_CLAIMS) return { ok: false, reason: "too_many" };
  const s = rules.specials;
  const verdict = { ok: true as const, word: false, jericho: 0, manna: 0, armors: [] as string[],
    pieces: [] as number[] };
  for (const claim of claims) {
    const i = claim.pieceIndex;
    if (!Number.isInteger(i) || i < 1 || i > pieceCount + 1) return { ok: false, reason: "piece_index" };
    if (claimedBefore.has(i) || verdict.pieces.includes(i)) return { ok: false, reason: "duplicate" };
    const wordPiece = stage.word && versus && engineSpecials.isWordPiece(seed, i, s);
    const rolls = engineSpecials.rollsFor(seed, i);
    switch (claim.kind) {
      case "word":
        if (!wordPiece) return { ok: false, reason: "word" };
        verdict.word = true;
        break;
      case "jericho":
        if (!stage.jericho || wordPiece || rolls.jericho >= engineSpecials.maxChance("jericho", s,
          rules.armor)) return { ok: false, reason: "jericho" };
        verdict.jericho += 1;
        break;
      case "manna":
        if (!stage.manna || wordPiece || rolls.manna >= engineSpecials.maxChance("manna", s,
          rules.armor)) return { ok: false, reason: "manna" };
        verdict.manna += 1;
        break;
      case "armor":
        if (!versus || wordPiece || rolls.armor >= engineSpecials.maxChance("armor", s,
          rules.armor)) return { ok: false, reason: "armor" };
        if (claim.armorId !== engineSpecials.armorIdFor(seed, i, ARMOR_IDS)) return { ok: false, reason: "armor_id" };
        verdict.armors.push(claim.armorId);
        break;
      default:
        return { ok: false, reason: "kind" };
    }
    verdict.pieces.push(i);
  }
  return verdict;
}

/**
 * 검증된 특수 칸 효과 (UC-014 3단계): 여리고 → 공격력 +jerichoBonus(attack.ts 입력 — 여기서는 연출 통보), 만나 → 게이지 +gauge.manna
 * (최대에서 멈춤 — UC-014 E2), 갑주 → 보유 목록 추가(FR-036). 말씀은 호출자가 말씀 대결을 연다(quiz.ts — FR-040).
 * @returns 보낸 `effect` 목록
 */
export function applySpecials(ctx: RoomContext, state: SlotState, verdict: Extract<SpecialsVerdict,
  { ok: true }>): EffectPayload[] {
  for (const i of verdict.pieces) state.claimedSpecials.add(i);
  const effects: EffectPayload[] = [];
  const base = { source: "special" as const, by: state.slot, target: state.slot, verseRef: null };
  for (let k = 0; k < verdict.jericho; k += 1) effects.push({ ...base, id: "jericho",
    params: { attackBonus: ctx.rules.attack.jerichoBonus } });
  for (let k = 0; k < verdict.manna; k += 1) {
    // FR-046 만나 +gauge.manna (은혜 배율은 충전 규칙 그대로 — FR-062)
    addGauge(state, ctx.rules.gauge.manna, ctx.rules);
    effects.push({ ...base, id: "manna", params: { gauge: ctx.rules.gauge.manna } });
  }
  for (const armorId of verdict.armors) {
    addArmor(state, armorId);
    effects.push({ ...base, id: "armor_acquired", params: { armorId } });
  }
  for (const effect of effects) ctx.broadcast("effect", effect);
  if (effects.length > 0) sendStatus(ctx, state);
  return effects;
}
