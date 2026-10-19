// reactions.js — 리액션 말풍선 표시만
// TASK-052 | REQ-013 FR-064 C-009 | ARCH-005 | API-017 API-028 | design-vision §4.6.13 RX-01·RX-02
// 이모지 3종은 rules.reactions(CODE-014)에서만 읽는다. 채팅 없음(C-009). 말풍선 요소는 미리 만든 풀에서 재사용(§4.9).
import { gsap } from "gsap";
import { rules } from "../content.js";

const EMOJI = new Map(rules.reactions.map((r) => [r.id, r.emoji]));
const POOL = 4;

/**
 * @param {{ root: HTMLElement, geometry: () => any }} o root = 대전 DOM 오버레이 루트, geometry = { myBoard, oppBoard }
 */
export function createReactions({ root, geometry }) {
  let reduced = false;
  const pool = Array.from({ length: POOL }, () => {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, { position: "absolute", left: "0", top: "0", zIndex: "200", pointerEvents: "none",
      opacity: "0", display: "grid", placeItems: "center", borderRadius: "50%", willChange: "transform, opacity" });
    root.appendChild(el);
    return el;
  });
  let next = 0;
  const take = () => {
    const el = pool[next];
    next = (next + 1) % POOL;
    gsap.killTweensOf(el);
    return el;
  };

  /** @param {HTMLElement} el @param {string} id @param {number} size @param {boolean} ring */
  function dress(el, id, size, ring) {
    el.textContent = EMOJI.get(id) ?? "";
    Object.assign(el.style, { width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.7)}px`,
      lineHeight: "1", border: ring ? "2px solid #E8B84A" : "none", background: ring ? "rgba(22,18,38,0.8)" : "none",
      boxShadow: ring ? "0 0 8px rgba(232,184,74,.45)" : "none" });
  }

  return {
    /**
     * RX-01 보내기: 내 보드 오른쪽 위에 같은 이모지 작은 말풍선(60%) 800ms, scale 0→1 back.out(2) 160ms (감소: 팝 없음)
     * @param {string} reactionId
     */
    send(reactionId) {
      const b = geometry().myBoard;
      const el = take();
      dress(el, reactionId, Math.round(48 * 0.6), false);
      gsap.set(el, { left: b.x + b.cell * 10 - 36, top: b.y + 6, x: 0, y: 0, xPercent: 0, yPercent: 0 });
      if (reduced) gsap.fromTo(el, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.1 });
      else gsap.fromTo(el, { opacity: 1, scale: 0 }, { scale: 1, duration: 0.16, ease: "back.out(2)" });
      gsap.to(el, { opacity: 0, duration: 0.15, delay: 0.8 });
    },
    /**
     * RX-02 받기: 상대 보드 위쪽에 48px 금 원형 테두리 말풍선, scale 0→1.2→1 220ms back.out(2),
     * 위로 40px 1,400ms 떠오르며 마지막 300ms 투명도 0 (감소: 떠오름 없이 1,400ms 표시). 상대 보드가 없으면(연습) 무시
     * @param {string} reactionId
     */
    receive(reactionId) {
      const b = geometry().oppBoard;
      if (!b) return;
      const el = take();
      dress(el, reactionId, 48, true);
      gsap.set(el, { left: b.x + (b.cell * 10) / 2 - 24, top: b.y + 8, x: 0, y: 0, xPercent: 0, yPercent: 0 });
      if (reduced) {
        gsap.fromTo(el, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.1 });
      } else {
        gsap.fromTo(el, { opacity: 1, scale: 0 }, { keyframes: [{ scale: 1.2, duration: 0.14, ease: "back.out(2)" },
          { scale: 1, duration: 0.08 }] });
        gsap.to(el, { y: -40, duration: 1.4, ease: "power2.out" });
      }
      gsap.to(el, { opacity: 0, duration: 0.3, delay: 1.1 });
    },
    /** @param {boolean} on §6.3 감소 모드 */
    setReduced(on) {
      reduced = on;
    },
    destroy() {
      for (const el of pool) {
        gsap.killTweensOf(el);
        el.remove();
      }
    },
  };
}
