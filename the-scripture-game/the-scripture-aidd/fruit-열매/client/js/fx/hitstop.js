// hitstop.js — 히트스톱 프레임 정지 요청만
// TASK-051-1 | REQ-013 FR-052 FR-061 | ARCH-005 | design-vision §2.10 HS·§4.6 동시성 규칙
// Pixi 틱 시간을 멈춘다(app.ticker.speed = 0 → 03-A render/*·pixi.animate·엔진 틱이 모두 dtMs = 0). 네트워크 송수신은 멈추지 않는다.
// 정지 길이는 실제 시계(performance.now)로 잰다 — 정지 중에도 해제 시각을 놓치지 않게.

/** §2.10 HS 토큰 (FR-061 범위 0.05~0.1초 안) */
export const HS = Object.freeze({ "HS-1": 50, "HS-2": 66, "HS-3": 80, "HS-4": 100 });
const MIN_MS = 50;
const MAX_MS = 100;

/**
 * @param {{ ticker: { speed: number }, onTick: (fn: (dt: number, raw: number) => void) => () => void,
 *   now?: () => number }} o ticker = pixi.app.ticker, onTick = pixi.onTick
 */
export function createHitstop({ ticker, onTick, now = () => performance.now() }) {
  let until = 0;
  let active = false;

  function release() {
    active = false;
    ticker.speed = 1;
  }

  const off = onTick(() => {
    if (active && now() >= until) release();
  });

  return {
    /**
     * 히트스톱 요청 — 그 프레임부터 정지. 겹치면 가장 긴 것 하나만(끝 시각이 더 늦은 쪽).
     * @param {keyof typeof HS | number} token HS-1~HS-4 또는 ms
     * @returns {number} 적용된 ms (0 = 무시)
     */
    request(token) {
      const raw = typeof token === "number" ? token : HS[token];
      if (!(raw > 0)) return 0;
      const ms = Math.min(MAX_MS, Math.max(MIN_MS, raw)); // FR-061 0.05~0.1초
      until = Math.max(until, now() + ms);
      active = true;
      ticker.speed = 0;
      return ms;
    },
    get active() {
      return active;
    },
    /** 화면 전환·라운드 리셋 */
    cancel: release,
    destroy() {
      release();
      off();
    },
  };
}
