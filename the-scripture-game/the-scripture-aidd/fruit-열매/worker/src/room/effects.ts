// effects.ts — 악한 영 효과 적용 가능 판정(6초·동시 2·같은 효과·1.5초·nullify)·봉인 21초·만료만
// TASK-013 | REQ-007 FR-028 FR-029 FR-031 | ARCH-011 | API-021 `spiritApplied`·`duration` | TBL-013 TBL-018 `effects` |
// OQ #8 #11
// 상한을 넘는 영 효과는 적용하지 않지만 쓰레기 줄은 적용된다 (FR-031 — 쓰레기 처리는 garbage.ts).
import { spirits } from "../content";
import type { Rules, Spirit, SpiritCategory } from "../content";
import type { SlotState } from "./player-state";

/** FR-029 악(에바 속의 여인) — 납 블록 줄을 남기는 보드 상태형 영 (spirits.json effect `lead_row`) */
const LEAD_SPIRIT = spirits.find((s) => s.effect === "lead_row");

export type SpiritBlockReason = "nullified" | "same_effect" | "reapply_cooldown" | "max_concurrent";

export interface SpiritApplyResult {
  applied: boolean;
  /** 적용된 효과 길이 ms (보드 상태형 = 0) */
  durationMs: number;
  reason: SpiritBlockReason | null;
}

/** 끝난 시간형 효과 제거 + 종료 시각 기록 (FR-031 "효과 종료 후 1.5초 동안 같은 종류 재적용 없음") */
export function expireEffects(state: SlotState, now: number): string[] {
  const ended: string[] = [];
  state.activeEffects = state.activeEffects.filter((e) => {
    if (e.until > now) return true;
    state.lastEffectEndAt[e.spiritId] = e.until;
    ended.push(e.spiritId);
    return false;
  });
  if (state.sealedUntil <= now) state.sealedUntil = 0;
  return ended;
}

/** 보드 상태형 효과인가 (TBL-013 duration_ms 0 — 아바돈 구멍·악 납 블록, 시간 상한 대상 아님 K4) */
export function isBoardEffect(spirit: Spirit): boolean {
  return spirit.duration_ms === 0;
}

/**
 * 받는 쪽에 악한 영 효과를 걸 수 있는지 판정하고 걸면 상태에 기록한다 (FR-031, OQ #8 #11).
 * 순서: 갑주 nullify(다음 1회 무효, 소모) → 같은 효과 진행 중 → 1.5초 재적용 금지 → 동시 2개 상한(보드 상태형 제외).
 * 시간형 길이 = min(duration_ms, maxDurationMs), 봉인 = sealMs (FR-028 6초 상한 예외).
 */
export function tryApplySpirit(state: SlotState, spirit: Spirit, now: number, rules: Rules,
  boardWidth: number): SpiritApplyResult {
  const e = rules.effects;
  expireEffects(state, now);
  // OQ #8 갑주 "무효" — 해당 분류 다음 1회 무효 (그 갑주의 무효 준비 전체 소모)
  const nullifier = Object.entries(state.armed.nullify).find(([, cats]) => cats.includes(spirit.category));
  if (nullifier) {
    delete state.armed.nullify[nullifier[0]];
    return { applied: false, durationMs: 0, reason: "nullified" };
  }
  const active = state.activeEffects.some((a) => a.spiritId === spirit.id) || (spirit.effect === "lead_row"
    && state.leadLinesLeft > 0);
  // FR-031 같은 효과는 겹치지 않음
  if (active) return { applied: false, durationMs: 0, reason: "same_effect" };
  // FR-031 rules.effects.reapplyCooldownMs
  const lastEnd = state.lastEffectEndAt[spirit.id];
  if (lastEnd !== undefined && now - lastEnd < e.reapplyCooldownMs) return { applied: false, durationMs: 0,
    reason: "reapply_cooldown" };
  if (isBoardEffect(spirit)) {
    // 즉시형 — 끝난 시각 = 지금 (재적용 간격 계산용)
    state.lastEffectEndAt[spirit.id] = now;
    if (spirit.effect === "lead_row") {
      const rows = Number(spirit.params.rows ?? 0);
      state.leadLinesLeft = Number(spirit.params.linesToClear ?? 0);
      // FR-032 ③ 진행 불가능성 검사 원천 — 납 블록 칸
      state.round.leadCells += rows * boardWidth;
    }
    return { applied: true, durationMs: 0, reason: null };
  }
  // FR-031 rules.effects.maxConcurrent (봉인 포함 — 시간 상한만 예외)
  if (state.activeEffects.length >= e.maxConcurrent) return { applied: false, durationMs: 0, reason: "max_concurrent" };
  const isSeal = spirit.category === "seal";
  const durationMs = isSeal ? e.sealMs : Math.min(spirit.duration_ms, e.maxDurationMs);
  state.activeEffects.push({ spiritId: spirit.id, category: spirit.category, until: now + durationMs });
  // FR-028 바사 왕국의 군주: 21초 천사 소환 봉인
  if (isSeal) state.sealedUntil = now + durationMs;
  return { applied: true, durationMs, reason: null };
}

/**
 * 걸린 효과 해제 (스랍·갑주 nullify·미가엘·예수님). 해제 시각을 종료 시각으로 기록한다.
 * @param filter 해제 대상 판정
 * @returns 해제한 spirit id (보드 상태형 악 납 블록 포함 — `leadLinesLeft` 초기화)
 */
export function clearEffects(state: SlotState, now: number, filter: (spiritId: string,
  category: SpiritCategory) => boolean): string[] {
  expireEffects(state, now);
  const cleared: string[] = [];
  state.activeEffects = state.activeEffects.filter((a) => {
    if (!filter(a.spiritId, a.category)) return true;
    state.lastEffectEndAt[a.spiritId] = now;
    cleared.push(a.spiritId);
    if (a.category === "seal") state.sealedUntil = 0;
    return false;
  });
  if (LEAD_SPIRIT && state.leadLinesLeft > 0 && filter(LEAD_SPIRIT.id, LEAD_SPIRIT.category)) {
    state.leadLinesLeft = 0;
    cleared.push(LEAD_SPIRIT.id);
  }
  return cleared;
}

/** FR-035 봉인 중인가 + 남은 ms (ANGEL_SEALED retryInMs) */
export function sealedRemaining(state: SlotState, now: number): number {
  expireEffects(state, now);
  return Math.max(0, state.sealedUntil - now);
}

/** 말씀 대결 정지 시간만큼 효과·봉인 종료 시각을 미룬다 (FR-041 정지 — 정지 중 효과 시간이 흐르지 않게) */
export function shiftEffectTimers(state: SlotState, pausedMs: number): void {
  for (const e of state.activeEffects) e.until += pausedMs;
  if (state.sealedUntil > 0) state.sealedUntil += pausedMs;
  if (state.peterUntil > 0) state.peterUntil += pausedMs;
}
