// subtitle.js — DOM 자막(영 이름·구절 3줄) 요소 생성·자막 큐·표시만
// TASK-052 (D-03B 분할 — task-wall §3.4 #26-1) | REQ-011 REQ-013 FR-039 FR-054 C-003 | ARCH-005 | TBL-016 |
// design-vision §2.6 구절 표기·§2.8 자막 z250·§4.6.4~§4.6.8 자막 행·§4.8 자막 큐 | RTM §5 DCL-008
// 구절은 항상 3줄 — ① KJV 원문 ② 한국어 직접 번역 ③ 출처 — verses.json(`kjv`·`ko`·`ref`·`ref_ko`)에서만 읽는다(C-003).
import { gsap } from "gsap";
import { versesByRef } from "../content.js";

// 작은따옴표 — style="…" 속성 안에 그대로 넣어도 속성이 끊기지 않게
export const CINZEL = "'Cinzel', 'Noto Serif KR', serif";
export const KO = "'Noto Serif KR', serif";
/** §4.8 자막 순서: 예수님 > 악한 영 > 천사 > 위인 스킬 > 갑주 */
const SUB_RANK = { jesus: 5, spirit: 4, angel: 3, hero: 2, armor: 1 };
const MAX_WAIT = 2;
/** §3.5.1 내 자막 영역 높이(가로형 보드 칸 30 기준) · 맞춤 최저 배율(18px → 12.6px) */
const AREA_H = 120;
const FIT_MIN = 0.7;
/** §4.6.8 예수님 자막 넓은 영역 — 보드 칸을 가리지 않는 자리 (RTM §5 DCL-008: 가로형 가운데 통로 포함 (616,64) 폭 324,
 * 세로형 내 보드 아래 (16,744) 폭 688) */
const JESUS_AREA = Object.freeze({ landscape: { x: 616, y: 64, w: 324 }, portrait: { x: 16, y: 744, w: 688 } });

/** @param {string} s */
export function escapeHtml(s) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => map[c]);
}

/** 구절 3줄 HTML (big = 예수님 첫 구절 26px/22px) @param {string} ref @param {boolean} big */
export function verseHtml(ref, big = false) {
  const v = versesByRef.get(ref);
  if (!v) return "";
  return `<div style="margin-top:4px"><div lang="en" style="font:400 ${big ? 26 : 18}px ${CINZEL};color:#FFF8E7;`
    + `letter-spacing:.02em;line-height:1.5">${escapeHtml(v.kjv)}</div>`
    + `<div style="font:400 ${big ? 22 : 17}px ${KO};color:#F4EFE3;line-height:1.6">${escapeHtml(v.ko)}</div>`
    + `<div style="font:700 14px ${CINZEL};color:#E8B84A;letter-spacing:.06em">${escapeHtml(v.ref)} · `
    + `${escapeHtml(v.ref_ko)}</div></div>`;
}

/**
 * @param {{ el: HTMLElement, geometry: () => any, isReduced: () => boolean }} o el = 자막 요소(z 250, 미리 만든 것)
 */
export function createSubtitle({ el, geometry, isReduced }) {
  /** @type {any} */ let now = null;
  /** @type {any[]} */ const wait = [];
  Object.assign(el.style, { whiteSpace: "normal", textAlign: "left" });

  /** @param {any} s */
  function fill(s) {
    const lines = [];
    if (s.title) {
      // 영 이름 type.h3 22px + 등급 점 1~5 (보스는 왕관형)
      const mark = s.tier >= 6 ? "♛" : "●".repeat(s.tier ?? 0);
      const dots = s.tier ? ` <span style="color:#E8B84A;letter-spacing:.1em">${mark}</span>` : "";
      lines.push(`<div style="font:700 ${s.titleSize ?? 22}px ${KO};color:${s.titleColor ?? "#F4EFE3"}">`
        + `${escapeHtml(s.title)}${dots}</div>`);
    }
    if (s.note) lines.push(`<div style="font:400 14px ${KO};color:#9C93B3">${escapeHtml(s.note)}</div>`);
    (s.verseRefs ?? []).forEach((ref, i) => lines.push(verseHtml(ref, !!s.wide && i === 0)));
    const g = geometry();
    const b = g.myBoard;
    const wide = s.wide ? JESUS_AREA[g.kind ?? "landscape"] : null;
    const width = wide ? wide.w : b.cell * 10 - 16;
    el.innerHTML = `<div>${lines.join("")}</div>`;
    // §3.5.1 내 자막 영역 (296,92) 300×120 = 보드 왼쪽 위 + 8
    Object.assign(el.style, { left: `${wide ? wide.x : b.x + 8}px`, top: `${wide ? wide.y : b.y + 8}px`,
      width: `${width}px`, boxSizing: "border-box", background: "rgba(7,6,13,0.55)",
      padding: "8px 10px", borderRadius: "8px", height: "auto", overflow: "visible" });
    gsap.set(el, { xPercent: 0, yPercent: 0, x: 0 });
    if (!wide) fitArea(/** @type {HTMLElement} */ (el.firstElementChild), width - 20, AREA_H * (b.cell / 30) - 16);
  }

  /**
   * §3.5.1 자막 영역 높이 120(보드 칸 30 기준) 안에 맞춤 — 긴 구절이 보드 위쪽 대부분을 가리지 않게 (RTM §5 DCL-009 ④).
   * 글자는 자르지 않고(C-003 원문 그대로) 배율만 낮춘다: 안쪽 폭 = 폭 ÷ 배율 → 줄 수 감소, 최저 배율 FIT_MIN.
   * 보일 때 1회만 잰다(레이아웃 읽기 — 트윈 중 아님, §4.9). @param {HTMLElement} inner @param {number} w @param {number} h
   */
  function fitArea(inner, w, h) {
    let k = 1;
    inner.style.transformOrigin = "0 0";
    for (;;) {
      Object.assign(inner.style, { width: `${w / k}px`, transform: k < 1 ? `scale(${k})` : "" });
      const need = inner.scrollHeight * k;
      if (need <= h || k <= FIT_MIN) {
        el.style.height = `${Math.ceil(need) + 16}px`;
        el.style.overflow = "hidden";
        return;
      }
      k = Math.max(FIT_MIN, k - 0.05);
    }
  }

  /** 등장 y −12→0 240ms power2.out, 유지(기본 2,400ms), 300ms 소멸 / 예수님: 줄마다 투명도 400ms, 600ms 간격 @param {any} s */
  function show(s) {
    now = s;
    gsap.killTweensOf(el);
    fill(s);
    if (s.wide) {
      gsap.set(el, { opacity: 1, y: 0 });
      // 줄마다 투명도 0→1 400ms, 600ms 간격 (구절 블록 안의 원문·번역·출처 줄 단위)
      gsap.fromTo(el.querySelectorAll(":scope > div > div > div"), { opacity: 0 }, { opacity: 1, duration: 0.4,
        stagger: 0.6 });
    } else {
      gsap.fromTo(el, { opacity: 0, y: isReduced() ? 0 : -12 }, { opacity: 1, y: 0, duration: 0.24,
        ease: "power2.out" });
    }
    gsap.to(el, { opacity: 0, duration: 0.3, delay: (s.holdMs ?? 2400) / 1000 + 0.24, onComplete: next });
  }
  function next() {
    now = null;
    const n = wait.shift();
    if (n) show(n);
  }

  return {
    /**
     * §4.8 자막 큐 — 동시에 1개. 진행 중보다 높으면 120ms 교차, 같거나 낮으면 대기열(최대 2, 넘치면 가장 오래된 대기 버림)
     * @param {{ kind: "jesus" | "spirit" | "angel" | "hero" | "armor", title?: string, titleColor?: string,
     *   tier?: number, note?: string, verseRefs?: string[], holdMs?: number, wide?: boolean }} s
     */
    push(s) {
      if (!now) return show(s);
      if ((SUB_RANK[s.kind] ?? 0) > (SUB_RANK[now.kind] ?? 0)) {
        gsap.killTweensOf(el);
        gsap.to(el, { opacity: 0, duration: 0.12, onComplete: () => show(s) });
        return undefined;
      }
      wait.push(s);
      if (wait.length > MAX_WAIT) wait.shift();
      return undefined;
    },
    get current() {
      return now?.kind ?? null;
    },
    get waiting() {
      return wait.length;
    },
    clear() {
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 0 });
      now = null;
      wait.length = 0;
    },
  };
}
