// settings.js — 옵션 값 세션 메모리 보관·기본값 계산만 (저장 안 함 — N-04)
// TASK-062-1 | REQ-013 FR-057 FR-060 | UC-020 | design-vision §3.9·§6.3 | D3-08 D3-09 | devguide §3.5-6
// 첫 진입 기본값: prefers-reduced-motion이 reduce이면 흔들림 끔·섬광 약, 아니면 흔들림 켬·섬광 강(D3-08).
// 연출 세기는 흔들림·섬광·움직임만 줄인다 — 방해 효과의 가림 정도는 바꾸지 않는다(D3-09).
import { DEFAULT_VOLUMES } from "../audio/mixer.js";

/** @typedef {{ master: number, sfx: number, music: number, muted: boolean, shake: boolean,
 *   flash: "strong" | "medium" | "weak", reducedMotion: boolean }} Settings */

/** OS 움직임 줄이기 설정 */
function prefersReducedMotion() {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** D3-08 첫 진입 기본값 @returns {Settings} */
export function defaultSettings() {
  const reduce = prefersReducedMotion();
  return {
    master: DEFAULT_VOLUMES.master, sfx: DEFAULT_VOLUMES.sfx, music: DEFAULT_VOLUMES.music, muted: false,
    shake: !reduce, flash: reduce ? "weak" : "strong", reducedMotion: reduce,
  };
}

/** @type {Settings} */
const values = defaultSettings();
/** @type {Set<(s: Settings, key: string) => void>} */
const listeners = new Set();

/** 현재 값 (읽기 전용 사본) */
export function getSettings() {
  return { ...values };
}

/**
 * UC-020 4단계 즉시 반영 — 바뀐 키를 구독자(오디오 믹서·연출 지휘)에게 알린다.
 * @template {keyof Settings} K @param {K} key @param {Settings[K]} value
 */
export function setSetting(key, value) {
  if (values[key] === value) return;
  values[key] = value;
  for (const fn of listeners) {
    try {
      fn({ ...values }, key);
    } catch (err) {
      console.error("옵션 반영 실패", err);
    }
  }
}

/** 구독 — 해제 함수 반환 @param {(s: Settings, key: string) => void} fn */
export function onSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 연출 지휘(juice.setOptions) 입력 형식 @param {Settings} s */
export function juiceOptions(s) {
  return { shake: s.shake, flash: s.flash, reducedMotion: s.reducedMotion };
}
