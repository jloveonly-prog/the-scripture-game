// TASK-020-2 · FR-027 · FR-028 · FR-029 · FR-030 · FR-031 · D-17 · C-011 — 받는 쪽 활성 영 효과 장부와 방해 상한 판정.
// 단일 책임: 영 효과 적용 가능 여부(6초·동시 2개·비중첩·1.5초 재적용 금지·봉인 예외)와 종료(시간·줄 수·해제)를 계산한다.
import { balance, type SpiritDef } from '../content';

/** 진행 중인 영 효과 1개 (시간형 endsAt / 줄 단위형 clearsLeft) */
export interface ActiveEffect {
  spiritId: string;
  category: string;
  kinds: string[];
  fromSlot: 1 | 2;
  startedAt: number;
  /** 시간형 종료 시각 (줄 단위형은 null) */
  endsAt: number | null;
  /** 줄 단위형 남은 삭제 줄 수 (시간형은 null) */
  clearsLeft: number | null;
}

export interface InterferenceLedger {
  active: ActiveEffect[];
  /** spiritId → 마지막 종료 시각 (1.5초 재적용 금지) */
  endedAt: Record<string, number>;
}

export type ApplyResult =
  | { applied: true; durationMs: number; tracked: boolean }
  | { applied: false; reason: 'stacking' | 'reapply' | 'concurrent' };

type InterferenceCfg = typeof balance.interference;

/** 줄 단위형 효과 판별 (wickedness leadRow — params.clearsToExpire) */
function clearsToExpire(spirit: SpiritDef): number | null {
  const value = spirit.effect.params.clearsToExpire;
  return typeof value === 'number' && value > 0 ? value : null;
}

export function createInterferenceLedger(): InterferenceLedger {
  return { active: [], endedAt: {} };
}

function endEffects(ledger: InterferenceLedger, ended: ActiveEffect[], now: number): ActiveEffect[] {
  if (ended.length === 0) return ended;
  ledger.active = ledger.active.filter((e) => !ended.includes(e));
  for (const e of ended) ledger.endedAt[e.spiritId] = now;
  return ended;
}

// FR-031 시간 만료된 효과를 끝낸다 → 끝난 효과 목록 (spiritEnd 통지 대상)
export function expireEffects(ledger: InterferenceLedger, now: number): ActiveEffect[] {
  const ended = ledger.active.filter((e) => e.endsAt !== null && e.endsAt <= now);
  // 재적용 금지 기준은 실제 종료 시각
  ledger.active = ledger.active.filter((e) => !ended.includes(e));
  for (const e of ended) ledger.endedAt[e.spiritId] = e.endsAt as number;
  return ended;
}

// FR-031 방해 상한 판정 후 적용 (상한 초과 → 영 미적용, 쓰레기 줄은 호출 측이 그대로 적용 — OQ #11)
export function tryApplySpirit(
  ledger: InterferenceLedger, spirit: SpiritDef, fromSlot: 1 | 2, now: number, cfg: InterferenceCfg = balance.interference,
): ApplyResult {
  expireEffects(ledger, now);
  if (ledger.active.some((e) => e.spiritId === spirit.id)) return { applied: false, reason: 'stacking' };
  const lastEnd = ledger.endedAt[spirit.id];
  if (lastEnd !== undefined && now - lastEnd < cfg.reapplyCooldownMs) return { applied: false, reason: 'reapply' };
  // 즉시형도 적용 순간에는 동시 적용 수를 검사한다 (data-ark §8.8.5)
  if (ledger.active.length >= cfg.maxConcurrent) return { applied: false, reason: 'concurrent' };

  const lines = clearsToExpire(spirit);
  const raw = spirit.effect.durationMs;
  const exempt = cfg.timedLimitExempt.includes(spirit.id);
  const durationMs = lines === null && raw > 0 ? (exempt ? raw : Math.min(raw, cfg.maxTimedMs)) : 0;
  if (lines === null && durationMs === 0) return { applied: true, durationMs: 0, tracked: false };

  ledger.active.push({
    spiritId: spirit.id, category: spirit.category, kinds: [...spirit.effect.kinds], fromSlot, startedAt: now,
    endsAt: lines === null ? now + durationMs : null, clearsLeft: lines,
  });
  return { applied: true, durationMs, tracked: true };
}

// FR-029 줄 단위형(납 줄) 효과: 삭제한 줄 수만큼 줄이고 0 이하면 종료
export function noteLinesCleared(ledger: InterferenceLedger, lines: number, now: number): ActiveEffect[] {
  const ended: ActiveEffect[] = [];
  for (const e of ledger.active) {
    if (e.clearsLeft === null) continue;
    e.clearsLeft -= lines;
    if (e.clearsLeft <= 0) ended.push(e);
  }
  return endEffects(ledger, ended, now);
}

// FR-035·FR-037·FR-039 범주 해제 (스랍·갑주 clearActive·예수님 이벤트)
export function clearCategories(ledger: InterferenceLedger, categories: readonly string[], now: number): ActiveEffect[] {
  return endEffects(ledger, ledger.active.filter((e) => categories.includes(e.category)), now);
}

// FR-035 미가엘: 지정 영 효과 해제
export function clearSpirits(ledger: InterferenceLedger, spiritIds: readonly string[], now: number): ActiveEffect[] {
  return endEffects(ledger, ledger.active.filter((e) => spiritIds.includes(e.spiritId)), now);
}

// FR-028 천사 봉인 남은 ms (angelSeal 효과)
export function sealedRemainingMs(ledger: InterferenceLedger, now: number): number {
  let remaining = 0;
  for (const e of ledger.active) {
    if (e.kinds.includes('angelSeal') && e.endsAt !== null) remaining = Math.max(remaining, e.endsAt - now);
  }
  return Math.max(0, remaining);
}

/** 다음 시간 만료 시각 (spiritEnd 타이머 예약용) */
export function nextExpiryAt(ledger: InterferenceLedger): number | null {
  let next: number | null = null;
  for (const e of ledger.active) if (e.endsAt !== null && (next === null || e.endsAt < next)) next = e.endsAt;
  return next;
}

/** 말씀 대결 정지 시간만큼 시간형 효과를 미룬다 (두 보드 동시 정지 — FR-041) */
export function shiftEffects(ledger: InterferenceLedger, deltaMs: number, pausedAt: number): void {
  for (const e of ledger.active) if (e.endsAt !== null && e.endsAt > pausedAt) e.endsAt += deltaMs;
}
