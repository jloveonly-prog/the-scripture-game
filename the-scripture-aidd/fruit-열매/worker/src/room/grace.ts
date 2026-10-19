// TASK-021-1 · FR-062 · D-22 — 실력 보정 "은혜(Grace)": 연속 패배 판정과 쓰레기 −1·게이지 충전 ×1.15(내림).
// 단일 책임: 은혜 조건과 두 보정 계산 (수치는 balance.json grace).
import { balance } from '../content';

type GraceCfg = typeof balance.grace;

// FR-062 라운드 시작 시 은혜 여부 (loss_streak ≥ 3)
export function isGraceActive(lossStreak: number, cfg: GraceCfg = balance.grace): boolean {
  return lossStreak >= cfg.lossStreakMin;
}

// FR-062 받는 공격마다 쓰레기 −1 (최소 0)
export function applyGraceGarbage(garbage: number, grace: boolean, cfg: GraceCfg = balance.grace): number {
  return grace ? Math.max(0, garbage - cfg.garbageReduction) : garbage;
}

// FR-062 게이지 충전 ×1.15 (내림)
export function applyGraceFaith(amount: number, grace: boolean, cfg: GraceCfg = balance.grace): number {
  return grace ? Math.floor(amount * cfg.faithMultiplier) : amount;
}

// FR-062·D-22 라운드 결과에 따른 연속 패배 갱신 (이기면 0)
export function nextLossStreak(lossStreak: number, won: boolean): number {
  return won ? 0 : lossStreak + 1;
}
