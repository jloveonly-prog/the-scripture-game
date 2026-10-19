// confetti.js — canvas-confetti 금빛 발사만
// TASK-051-2 | REQ-013 FR-056 FR-065 | ARCH-005 | design-vision §4.6.12 M-04·M-06·§4.6.13 AC-01
// 경기 승리: 3회(① 왼쪽 아래 ② 오른쪽 아래 250ms 뒤 ③ 가운데 500ms 뒤). 감소 모드는 개수로 제어(각 60개·①②만) —
// disableForReducedMotion false. 캔버스는 주입받은 DOM 컨테이너 안에 1장 만들어 재사용(screens/*가 자리만 준다).
import confettiLib from "canvas-confetti";

/** M-04 공통 옵션 (design-vision §4.6.12 원문) */
const COMMON = Object.freeze({
  particleCount: 160, spread: 100, startVelocity: 55, ticks: 260, gravity: 1, scalar: 1.1,
  colors: ["#E8B84A", "#F6D98B", "#FFF8E7", "#D2873A"], shapes: ["square", "circle"], disableForReducedMotion: false,
});
const SHOTS = [
  { at: 0, origin: { x: 0.1, y: 0.7 }, angle: 60 },
  { at: 250, origin: { x: 0.9, y: 0.7 }, angle: 120 },
  { at: 500, origin: { x: 0.5, y: 0.6 }, spread: 160 },
];

/** @param {{ container: HTMLElement }} o container = 화면 덮개(포인터 이벤트 없음) */
export function createConfetti({ container }) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  container.appendChild(canvas);
  const fire = confettiLib.create(canvas, { resize: true, useWorker: false });
  /** @type {number[]} */ let timers = [];

  /** @param {any} opts */
  function shoot(opts) {
    try {
      fire({ ...COMMON, ...opts });
    } catch (err) {
      console.error("콘페티 실패", err);
    }
  }

  return {
    /**
     * M-04 경기 승리 3회 / M-06 상대 이탈 승리 ①②만 — 감소 모드: 각 60개·①②만
     * @param {{ reduced?: boolean, firstTwoOnly?: boolean }} [o]
     */
    victory(o = {}) {
      const shots = o.reduced || o.firstTwoOnly ? SHOTS.slice(0, 2) : SHOTS;
      for (const s of shots) {
        const { at, ...rest } = s;
        const opts = o.reduced ? { ...rest, particleCount: 60 } : rest;
        timers.push(window.setTimeout(() => shoot(opts), at));
      }
    },
    /** AC-01 업적 달성 canvas-confetti 40개 @param {{ x: number, y: number }} [origin] 0~1 */
    burst(origin = { x: 0.5, y: 0.5 }) {
      shoot({ particleCount: 40, origin });
    },
    reset() {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
      fire.reset();
    },
    destroy() {
      this.reset();
      canvas.remove();
    },
  };
}
