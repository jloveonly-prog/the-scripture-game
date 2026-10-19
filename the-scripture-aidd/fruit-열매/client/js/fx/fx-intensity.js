// TASK-041-1 · FR-057 · NFR-001 · D3-08 · D3-09 — 연출 세기 단일 모듈: 흔들림 배율·섬광 배율·초당 3회 섬광 안전 상한 (design-vision §2.7).
// 옵션 값은 저장하지 않는다 (N-04 보존 — 이번 접속 동안만). 초기값만 OS `prefers-reduced-motion`을 따른다.

/** design-vision §2.7 섬광 세기 3단계 배율 */
export const FLASH_LEVELS = Object.freeze({ normal: 1, reduced: 0.5, minimal: 0.2 });
/** 화면의 25% 이상을 덮는 섬광은 333ms 안에 2번째가 오면 생략 (WCAG 2.3.1) */
export const FLASH_SAFETY = Object.freeze({ coverRatio: 0.25, minGapMs: 333 });
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const state = { shakeEnabled: true, flashLevel: 'normal', lastBigFlashAt: Number.NEGATIVE_INFINITY };

// FR-057 흔들림 켜기/끄기 (UC-020 4단계)
export function setShakeEnabled(on) {
  state.shakeEnabled = Boolean(on);
}

// FR-057 · D3-09 섬광 세기 'normal' | 'reduced' | 'minimal' (그 밖의 값은 무시)
export function setFlashLevel(level) {
  if (Object.prototype.hasOwnProperty.call(FLASH_LEVELS, level)) state.flashLevel = level;
}

// FR-057 현재 배율 — shake: 0|1, flash: 1|0.5|0.2
export function getIntensity() {
  return {
    shake: state.shakeEnabled ? 1 : 0,
    flash: FLASH_LEVELS[state.flashLevel],
    shakeEnabled: state.shakeEnabled,
    flashLevel: state.flashLevel,
  };
}

// D3-08 첫 접속 초기값: reduce면 흔들림 끄기·섬광 줄임, 아니면 흔들림 켜기·섬광 기본
export function initIntensityFromSystem() {
  const reduce = prefersReducedMotion();
  setShakeEnabled(!reduce);
  setFlashLevel(reduce ? 'reduced' : 'normal');
  return getIntensity();
}

/** WCAG 2.2.2 — 장식 움직임(시차 배경·빛 입자) 정지 판단. matchMedia가 없으면(테스트·구형) false */
export function prefersReducedMotion() {
  try {
    return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(REDUCED_MOTION_QUERY).matches === true;
  } catch (err) {
    console.error('[fx-intensity] matchMedia 실패', err);
    return false;
  }
}

// FR-057 흰·금빛·붉은 섬광 불투명도 × 섬광 배율
export function scaleFlashAlpha(alpha) {
  return alpha * FLASH_LEVELS[state.flashLevel];
}

// FR-057 블룸 brightness·충격파 brightness의 "초과분"만 섬광 배율로 줄인다 (기준값 1)
export function scaleBrightness(value, base = 1) {
  return base + (value - base) * FLASH_LEVELS[state.flashLevel];
}

// FR-057 · SH 진폭 × 흔들림 배율
export function scaleShake(amplitudePx) {
  return state.shakeEnabled ? amplitudePx : 0;
}

// FR-057 · WCAG 2.3.1 공통 안전 상한 — 섬광을 지금 보여도 되는가 (true면 시각 기록)
export function tryFlash(now, coverRatio) {
  if (!(coverRatio >= FLASH_SAFETY.coverRatio)) return true;
  if (now - state.lastBigFlashAt < FLASH_SAFETY.minGapMs) return false;
  state.lastBigFlashAt = now;
  return true;
}

/** 테스트·장면 재시작용: 기본값(흔들림 켜기·섬광 기본)과 섬광 기록 초기화 */
export function resetIntensity() {
  state.shakeEnabled = true;
  state.flashLevel = 'normal';
  state.lastBigFlashAt = Number.NEGATIVE_INFINITY;
}
