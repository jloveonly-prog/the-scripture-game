// touch.js — 터치 제스처 → 게임 명령 변환·`navigator.vibrate` 호출만
// TASK-063 | REQ-001 FR-003 FR-011 FR-057 | ARCH-007 | design-vision §4.3 터치 조작 표·§2.10 HP 토큰 | D3-10
// 판정은 CSS px 기준(§4.3 표 원문). 한 손가락이 판정 중이면 다른 손가락 제스처는 무시(행동 버튼은 별도 포인터).
// 진동은 터치 기기 + 흔들림 켬일 때만 (D3-10).
import { getSettings } from "../store/settings.js";

/** §4.3 터치 판정 수치 (CSS px · px/ms · ms) */
const STEP_PX = 28;
const SLOW_DROP_SPEED = 1.1;
const FLICK_DOWN_SPEED = 1.1;
const FLICK_UP_SPEED = 1.0;
const FLICK_MIN_PX = 60;
const TAP_MS = 200;
const TAP_MOVE_PX = 10;
const LONG_PRESS_MS = 500;
/** 속도 계산 창 (마지막 이동 표본) */
const VELOCITY_WINDOW_MS = 80;

/** D3-10 진동 — 흔들림 끔이면 진동도 끔 @param {number | number[]} pattern */
export function vibrate(pattern) {
  try {
    if (!getSettings().shake || typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * 제스처 영역(내 보드 + 제스처 패드) → 명령. 영역에는 CSS `touch-action: none`.
 * @param {{ areas: HTMLElement[], onCommand: (cmd: string) => void }} o cmd = left·right·softStep·hardDrop·hold·
 *   rotateCW·rotateCCW
 */
export function createTouch({ areas, onCommand }) {
  /** @type {null | { id: number, el: HTMLElement, x0: number, y0: number, t0: number, ax: number, ay: number,
   *   moved: number, samples: Array<[number, number, number]> }} */
  let g = null;
  let enabled = true;
  const emit = (c) => {
    try {
      onCommand(c);
    } catch (err) {
      console.error("제스처 명령 처리 실패", err);
    }
  };

  /** @param {PointerEvent} e */
  function down(e) {
    if (!enabled || g || e.pointerType === "mouse") return;
    const el = /** @type {HTMLElement} */ (e.currentTarget);
    try {
      el.setPointerCapture?.(e.pointerId); // 손가락이 영역 밖으로 나가도 판정 유지
    } catch {
      // 포인터가 이미 끝남 — 캡처 없이 계속
    }
    g = { id: e.pointerId, el, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, ax: e.clientX, ay: e.clientY, moved: 0,
      samples: [[e.clientX, e.clientY, e.timeStamp]] };
    e.preventDefault();
  }
  /** @param {PointerEvent} e */
  function move(e) {
    if (!g || e.pointerId !== g.id) return;
    g.samples.push([e.clientX, e.clientY, e.timeStamp]);
    while (g.samples.length > 2 && e.timeStamp - g.samples[0][2] > VELOCITY_WINDOW_MS) g.samples.shift();
    g.moved = Math.max(g.moved, Math.hypot(e.clientX - g.x0, e.clientY - g.y0));
    // 가로 끌기: 처음 닿은 x에서 28px마다 그 방향 1칸 (손가락을 따라 연속)
    while (e.clientX - g.ax >= STEP_PX) { g.ax += STEP_PX; emit("right"); }
    while (g.ax - e.clientX >= STEP_PX) { g.ax -= STEP_PX; emit("left"); }
    // 아래로 천천히 끌기(세로 속도 < 1.1px/ms): 28px마다 소프트 드롭 1칸
    if (velocity().vy < SLOW_DROP_SPEED) {
      while (e.clientY - g.ay >= STEP_PX) { g.ay += STEP_PX; emit("softStep"); }
    }
  }
  function velocity() {
    if (!g || g.samples.length < 2) return { vx: 0, vy: 0 };
    const a = g.samples[0];
    const b = g.samples[g.samples.length - 1];
    const dt = Math.max(1, b[2] - a[2]);
    return { vx: (b[0] - a[0]) / dt, vy: (b[1] - a[1]) / dt };
  }
  /** @param {PointerEvent} e */
  function up(e) {
    if (!g || e.pointerId !== g.id) return;
    const { vy } = velocity();
    const dy = e.clientY - g.y0;
    const dur = e.timeStamp - g.t0;
    if (vy >= FLICK_DOWN_SPEED && dy >= FLICK_MIN_PX) emit("hardDrop"); // 진동 HP-light는 J-05가 냄
    else if (vy <= -FLICK_UP_SPEED && dy <= -FLICK_MIN_PX) {
      emit("hold");
      vibrate(10); // HP-tap
    } else if (dur < TAP_MS && g.moved < TAP_MOVE_PX) {
      // 탭: 영역의 오른쪽 절반 = 시계 방향, 왼쪽 절반 = 반시계 방향
      const r = g.el.getBoundingClientRect();
      emit(e.clientX >= r.left + r.width / 2 ? "rotateCW" : "rotateCCW");
    }
    g = null;
  }
  const cancel = () => { g = null; };
  for (const el of areas) {
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
  }
  return {
    /** @param {boolean} on */
    setEnabled(on) {
      enabled = on;
      if (!on) g = null;
    },
    destroy() {
      for (const el of areas) {
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", cancel);
      }
    },
  };
}

/**
 * §4.3 행동 버튼 길게 누르기(500ms) — 사용하지 않고 말풍선만(HP-tap). 그 뒤 click은 무시한다.
 * @param {HTMLElement} el @param {() => void} onLong
 */
export function bindLongPress(el, onLong) {
  let timer = 0;
  let fired = false;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    fired = false;
    timer = window.setTimeout(() => {
      fired = true;
      vibrate(10);
      onLong();
    }, LONG_PRESS_MS);
  });
  const clear = () => clearTimeout(timer);
  el.addEventListener("pointerup", clear);
  el.addEventListener("pointercancel", clear);
  el.addEventListener("pointerleave", clear);
  el.addEventListener("click", (e) => {
    if (!fired) return;
    fired = false;
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
}
