// TASK-041-1 · FR-051 · FR-052 · FR-053 · FR-057 — 화면 흔들림: SH 토큰과 감쇠 무작위 변위 30Hz (design-vision §2.8).
// 흔드는 대상은 게임 레이어 컨테이너뿐이다 (DOM HUD는 흔들지 않는다). 배율은 fx-intensity.

import { scaleShake } from './fx-intensity.js';

/** design-vision §2.8 흔들림 토큰 — 진폭 px / 지속 ms */
export const SH = Object.freeze({
  SH1: Object.freeze({ amp: 2, durationMs: 100 }),
  SH2: Object.freeze({ amp: 4, durationMs: 120 }),
  SH3: Object.freeze({ amp: 6, durationMs: 200 }),
  SH5: Object.freeze({ amp: 12, durationMs: 300 }),
  SH6: Object.freeze({ amp: 14, durationMs: 700 }),
});
const SH_COMBO = Object.freeze({ base: 2, cap: 8, durationMs: 120 });
const SH_HIT = Object.freeze({ base: 6, cap: 12, durationMs: 250 });
/** 30Hz 변위 갱신 간격 */
export const SHAKE_STEP_MS = 1000 / 30;

// FR-061 SH-COMBO = (2 + 콤보)px, 상한 8px / 120ms
export function comboShake(combo) {
  return { amp: Math.min(SH_COMBO.base + Math.max(0, combo), SH_COMBO.cap), durationMs: SH_COMBO.durationMs };
}

// FR-053 SH-HIT = (6 + 받은 쓰레기 줄)px, 상한 12px / 250ms
export function hitShake(garbage) {
  return { amp: Math.min(SH_HIT.base + Math.max(0, garbage), SH_HIT.cap), durationMs: SH_HIT.durationMs };
}

// FR-061 EVT-19 — 한 프레임 묶음에서는 가장 큰 SH 1회 (진폭 우선, 같으면 긴 지속)
export function pickLargestShake(shakes) {
  let best = null;
  for (const s of shakes) {
    if (!s || !(s.amp > 0)) continue;
    if (!best || s.amp > best.amp || (s.amp === best.amp && s.durationMs > best.durationMs)) best = s;
  }
  return best;
}

// FR-051 감쇠 흔들림 상태 — sample(now)이 {x, y} 변위를 돌려준다 (30Hz 계단, 선형 감쇠)
export function createScreenShake(rand = Math.random) {
  let active = null;
  let lastStepAt = Number.NEGATIVE_INFINITY;
  let offset = { x: 0, y: 0 };
  return {
    /** 흔들림 시작 — 진행 중인 흔들림의 남은 진폭보다 크면 교체 (배율 0이면 무시) */
    start(shake, now) {
      const amp = scaleShake(shake?.amp ?? 0);
      if (!(amp > 0) || !(shake.durationMs > 0)) return false;
      if (active && currentAmp(active, now) >= amp) return false;
      active = { amp, durationMs: shake.durationMs, startAt: now };
      lastStepAt = Number.NEGATIVE_INFINITY;
      return true;
    },
    sample(now) {
      if (!active) return { x: 0, y: 0 };
      const amp = currentAmp(active, now);
      if (amp <= 0) {
        active = null;
        offset = { x: 0, y: 0 };
        return offset;
      }
      if (now - lastStepAt >= SHAKE_STEP_MS) {
        const angle = rand() * Math.PI * 2;
        offset = { x: Math.cos(angle) * amp, y: Math.sin(angle) * amp };
        lastStepAt = now;
      }
      return offset;
    },
    isActive() {
      return active !== null;
    },
    stop() {
      active = null;
      offset = { x: 0, y: 0 };
    },
  };
}

function currentAmp(shake, now) {
  const t = (now - shake.startAt) / shake.durationMs;
  return t >= 1 ? 0 : shake.amp * (1 - Math.max(0, t));
}
