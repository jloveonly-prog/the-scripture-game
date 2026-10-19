// TASK-041-1 · FR-052 · FR-061 · NFR-001 — 히트스톱 토큰(HS-COMBO·TSPIN·TETRIS·B2B)과 연출 정지 시계 (design-vision §2.8).
// 엔진의 중력·고정 지연 정지는 유다가 emitFx 반환값 hitstopMs로 처리한다. 여기서는 블록 연출 트윈·파티클 이동만 멈춘다.

/** design-vision §2.8 히트스톱 토큰 (ms) */
export const HS = Object.freeze({ COMBO_BASE: 50, COMBO_STEP: 10, COMBO_STEPS_MAX: 5, TSPIN: 70, TETRIS: 80, B2B: 90 });

// FR-061 HS-COMBO = 50ms + 10ms × min(콤보 − 1, 5) → 50~100ms (콤보 1 이상)
export function comboHitstopMs(combo) {
  if (!(combo >= 1)) return 0;
  return HS.COMBO_BASE + HS.COMBO_STEP * Math.min(Math.floor(combo) - 1, HS.COMBO_STEPS_MAX);
}

// FR-061 중첩 규칙 — 한 프레임에 여러 사건이 겹치면 가장 긴 값 1회 (합산 금지)
export function mergeHitstop(values) {
  let max = 0;
  for (const v of values) if (Number.isFinite(v) && v > max) max = v;
  return max;
}

// FR-052 연출 정지 시계 — 시각은 인자로 받는다 (테스트 가능)
export function createHitstopClock() {
  let until = Number.NEGATIVE_INFINITY;
  return {
    /** 정지 시작 — 이미 정지 중이면 더 늦게 끝나는 쪽을 따른다 (합산 금지) */
    trigger(ms, now) {
      if (ms > 0) until = Math.max(until, now + ms);
    },
    isFrozen(now) {
      return now < until;
    },
    remaining(now) {
      return Math.max(0, until - now);
    },
    reset() {
      until = Number.NEGATIVE_INFINITY;
    },
  };
}
