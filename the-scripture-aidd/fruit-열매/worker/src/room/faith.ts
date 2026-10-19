// TASK-021-1 · FR-033 · FR-034 · REQ-008 · R-10 — 믿음 게이지(서버 정수 0~100)·항목별 쿨다운 장부.
// 단일 책임: 충전·차감·쿨다운 판정. 비용·쿨다운의 단일 원천은 heroes/angels JSON (D4-05), 충전 규칙은 balance.json faith.
import { ANGEL_IDS, angelSkillId, heroSkillId } from '../../../client/js/net/protocol.js';
import { balance } from '../content';
import { applyGraceFaith } from './grace';

type FaithCfg = typeof balance.faith;

export interface FaithState {
  faith: number;
  /** skillId → 다시 쓸 수 있는 서버 시각 */
  cooldownUntil: Record<string, number>;
}

export type SpendCheck =
  | { ok: true }
  | { ok: false; code: 'FAITH_INSUFFICIENT' }
  | { ok: false; code: 'COOLDOWN'; retryAfterMs: number };

export function createFaithState(): FaithState {
  return { faith: 0, cooldownUntil: {} };
}

// FR-033 줄 삭제 충전량 (1줄 5 · 2줄 10 · 3줄 15 · 4줄 20, T-Spin +5, 은혜 ×1.15 내림)
export function faithGainForClear(lines: number, tspin: boolean, grace: boolean, cfg: FaithCfg = balance.faith): number {
  const base = (cfg.gainByLines[lines] ?? 0) + (tspin ? cfg.tspinBonus : 0);
  return applyGraceFaith(base, grace);
}

// FR-033 게이지 충전 (상한 100에서 멈춤) → 실제 증가량
export function addFaith(state: FaithState, amount: number, cfg: FaithCfg = balance.faith): number {
  const before = state.faith;
  state.faith = Math.min(cfg.max, Math.max(cfg.min, before + Math.max(0, Math.floor(amount))));
  return state.faith - before;
}

// FR-034 사용 가능 판정 (쿨다운 → 게이지 순)
export function checkSpend(state: FaithState, skillId: string, cost: number, now: number): SpendCheck {
  const until = state.cooldownUntil[skillId] ?? 0;
  if (until > now) return { ok: false, code: 'COOLDOWN', retryAfterMs: until - now };
  if (state.faith < cost) return { ok: false, code: 'FAITH_INSUFFICIENT' };
  return { ok: true };
}

// FR-034 차감 + 쿨다운 시작 (checkSpend 통과 후에만 호출)
export function spendFaith(state: FaithState, skillId: string, cost: number, cooldownMs: number, now: number, cfg: FaithCfg = balance.faith): void {
  state.faith = Math.max(cfg.min, state.faith - cost);
  state.cooldownUntil[skillId] = now + cooldownMs;
}

// FR-033 playerStatus.cooldowns — 위인 스킬 1개 + 천사 5개, 남은 ms (0이면 사용 가능)
export function cooldownSnapshot(state: FaithState, heroId: string, now: number): Record<string, number> {
  const ids = [heroSkillId(heroId), ...ANGEL_IDS.map((id: string) => angelSkillId(id))];
  const out: Record<string, number> = {};
  for (const id of ids) out[id] = Math.max(0, (state.cooldownUntil[id] ?? 0) - now);
  return out;
}

/** 말씀 대결 정지 시간만큼 쿨다운을 미룬다 (FR-041 동시 정지 — pausedAt에 진행 중이던 것만) */
export function shiftCooldowns(state: FaithState, deltaMs: number, pausedAt: number): void {
  for (const [id, until] of Object.entries(state.cooldownUntil)) if (until > pausedAt) state.cooldownUntil[id] = until + deltaMs;
}
