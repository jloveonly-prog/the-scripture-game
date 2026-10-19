// TASK-010-4 · FR-010 · D-23 — 경기 경과 시간 → 낙하 속도 곡선 (data-ark §8.8.8, 동형 순수 모듈).
// 단일 책임: 칸/초·칸당 ms 계산. 수치는 balance.json `gravity`에서만 읽는다.

/**
 * FR-010 중력 (칸/초). t = 경기 시작 후 초: t ≤ linearUntilSec → base + linear × t, 그 뒤 (base + linear × until) × accel^(t − until), 상한 max.
 * @param {number} matchElapsedMs 경기 시작 후 경과 ms (start.matchElapsedMs + 라운드 경과)
 * @param {{baseCellsPerSec:number, linearPerSec:number, linearUntilSec:number, accelBase:number, maxCellsPerSec:number}} g
 */
export function cellsPerSecond(matchElapsedMs, g) {
  if (!g) throw new RangeError('cellsPerSecond: balance.gravity가 필요합니다');
  const t = Math.max(0, matchElapsedMs) / 1000;
  const linearEnd = g.baseCellsPerSec + g.linearPerSec * g.linearUntilSec;
  const speed = t <= g.linearUntilSec
    ? g.baseCellsPerSec + g.linearPerSec * t
    : linearEnd * g.accelBase ** (t - g.linearUntilSec);
  return Math.min(speed, g.maxCellsPerSec);
}

/**
 * FR-010·FR-028 실제 낙하 칸/초 — 기본 곡선 × 배율(공중 권세 잡은 자 ×2) × 소프트 드롭 배율(×20).
 * @param {{multiplier?:number, softDrop?:boolean}} opts
 */
export function effectiveCellsPerSecond(matchElapsedMs, g, { multiplier = 1, softDrop = false } = {}) {
  const base = cellsPerSecond(matchElapsedMs, g) * Math.max(0, multiplier);
  return softDrop ? base * g.softDropMultiplier : base;
}
