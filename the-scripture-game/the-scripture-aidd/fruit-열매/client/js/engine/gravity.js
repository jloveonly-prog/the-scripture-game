// gravity.js — 경기 경과 ms → 줄당 낙하 간격 계산만
// TASK-010-3 | REQ-001 FR-010 | ARCH-002 | D-18 (입력 = 경기 경과 ms — `start.matchElapsedMs` 기준) | TBL-018 `gravity`
// 순수 모듈 (D-12). 수치는 rules.gravity에서만.

/**
 * FR-010 "완만하게 오르고, 2분 뒤부터 가속":
 * 0 ~ accelAfterMs: startMs → at120sMs 선형 감소 / 이후 accelEveryMs마다 ×accelFactor, 하한 minMs.
 * @param {number} matchElapsedMs 경기 시작 후 경과 ms (연습은 세션 경과 — architecture §9.9)
 * @param {{ startMs: number, at120sMs: number, accelAfterMs: number, accelEveryMs: number, accelFactor: number, minMs:
 * number }} gravity rules.gravity
 * @returns {number} 한 줄 낙하 간격 ms
 */
export function gravityIntervalMs(matchElapsedMs, gravity) {
  const t = Math.max(0, matchElapsedMs);
  if (t <= gravity.accelAfterMs) {
    const ratio = t / gravity.accelAfterMs;
    return Math.max(gravity.minMs, gravity.startMs + (gravity.at120sMs - gravity.startMs) * ratio);
  }
  const steps = Math.floor((t - gravity.accelAfterMs) / gravity.accelEveryMs);
  return Math.max(gravity.minMs, gravity.at120sMs * Math.pow(gravity.accelFactor, steps));
}
