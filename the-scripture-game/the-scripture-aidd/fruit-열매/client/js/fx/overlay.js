// overlay.js — DOM 콜아웃·자막 요소 생성·우선순위 큐·표시만 (자막 큐 본체는 subtitle.js — D-03B 분할)
// TASK-052 | REQ-011 REQ-013 FR-042 FR-054 FR-061 FR-062 C-003 | ARCH-005 | TBL-016 | design-vision §2.6·§2.8 DOM z·
// §4.6 콜아웃·자막 행·§4.8 콜아웃 큐·자막 큐·§4.9 DOM 오버레이 | D3-04 | RTM §5 DCL-008
// 모든 글자는 DOM(D3-04). 요소는 미리 만들어 재사용하고 트윈은 transform·opacity만(§4.9). 구절은 verses.json 3줄(C-003).
// 낭독은 03-C 알림 영역(§6.4) 몫 — 이 요소들은 aria-hidden.
import { gsap } from "gsap";
import { toSvg } from "../art/to-svg.js";
import { GRACE_DOVE } from "../art/shapes-ui.js";
import { CINZEL, KO, createSubtitle, escapeHtml, verseHtml } from "./subtitle.js";

/** §2.6 글자 토큰 [글꼴, 굵기, 크기px, 자간] */
export const TYPE = Object.freeze({
  countdown: [CINZEL, 900, 160, "0"], "callout-xl": [CINZEL, 900, 112, "0.02em"], "callout-l": [CINZEL, 900, 72,
    "0.02em"],
  "callout-m": [CINZEL, 700, 44, "0.04em"], "callout-ko": [KO, 900, 56, "0"], h1: [KO, 700, 40, "0"], h2: [KO, 700,
    28, "0"],
  h3: [KO, 700, 20, "0"], caption: [KO, 400, 14, "0"], "verse-en": [CINZEL, 400, 18, "0.02em"],
  "verse-ko": [KO, 400, 17, "0"], "verse-ref": [CINZEL, 700, 14, "0.06em"],
});
const GOLD = "linear-gradient(180deg, #F6D98B 0%, #E8B84A 55%, #A97B1F 100%)"; // --g-gold
/** §2.5 CSS 발광 */
export const GLOW = Object.freeze({ "gold-md": "0 0 16px rgba(232,184,74,.55)",
  "gold-lg": "0 0 32px rgba(246,217,139,.65)",
  holy: "0 0 48px rgba(255,248,231,.8)" });
/** §4.8 콜아웃 우선순위 (TETRIS = T-SPIN > 아깝다! > COMBO) */
const CALLOUT_RANK = { tetris: 3, tspin: 3, nearmiss: 2, combo: 1 };

/** @param {HTMLElement} el @param {Record<string, string | number>} s */
const css = (el, s) => Object.assign(el.style, s);
/** 글자 토큰 적용 @param {HTMLElement} el @param {keyof typeof TYPE} t @param {number} [size] */
function type(el, t, size) {
  const [family, weight, px, ls] = TYPE[t];
  css(el, { fontFamily: family, fontWeight: String(weight), fontSize: `${size ?? px}px`, letterSpacing: ls,
    lineHeight: "1.1" });
}
/** --g-gold 글자 채움 + 외곽선 @param {HTMLElement} el */
function goldText(el, stroke = "6px #3A2A08") {
  css(el, { background: GOLD, webkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    webkitTextStroke: stroke });
}

/**
 * @param {{ root: HTMLElement, geometry: () => any }} o root = 대전 DOM 오버레이 루트(가상 px — layout 배율),
 *   geometry = 현재 { kind, ...BATTLE_GEOMETRY[kind][mode] } (myBoard·callout·gauge·oppBoard)
 */
export function createOverlay({ root, geometry }) {
  let reduced = false;
  let jitter = true;
  const mk = (z) => {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    css(el, { position: "absolute", left: "0", top: "0", zIndex: String(z), pointerEvents: "none", opacity: "0",
      whiteSpace: "nowrap", textAlign: "center", willChange: "transform, opacity" });
    root.appendChild(el);
    return el;
  };
  const main = mk(200);
  const band = mk(200);
  const small = mk(200);
  const count = mk(200);
  const ban = mk(200);
  const gap = mk(300);
  const subEl = mk(250);
  const sub = createSubtitle({ el: subEl, geometry, isReduced: () => reduced });
  const floats = Array.from({ length: 8 }, () => mk(200));
  const dove = mk(100);
  dove.innerHTML = toSvg(GRACE_DOVE, 28, { label: GRACE_DOVE.label_ko });
  let mainRank = 0;

  /** 기준점 가운데 정렬 배치 @param {HTMLElement} el @param {number} x @param {number} y */
  function place(el, x, y) {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    gsap.set(el, { xPercent: -50, yPercent: -50, x: 0, y: 0, rotation: 0 });
  }
  const g = () => geometry();
  const corner = () => ({ x: g().myBoard.x + g().myBoard.cell * 10 - 70, y: g().myBoard.y + 40 }); // C-05 오른쪽 위
  /** 감소 모드 §2.9: spring·pop → out, scale 1±0.05 안 @param {string} ease @param {number} s */
  const ez = (ease) => (reduced && /elastic|back/.test(ease) ? "power2.out" : ease);
  const sc = (s) => (reduced ? Math.min(1.05, Math.max(0.95, s)) : s);
  /** ±px 떨림 (hz 30) — 흔들림 끔·감소 모드면 없음 */
  function shiver(el, px, ms, delay = 0) {
    if (!jitter || reduced || !px) return;
    gsap.to(el, { x: `random(${-px}, ${px})`, y: `random(${-px}, ${px})`, duration: 1 / 30, repeat: Math.round(ms / 33),
      repeatRefresh: true, delay, ease: "none", onComplete: () => gsap.set(el, { x: 0, y: 0 }) });
  }

  /**
   * 콜아웃 (C-04 TETRIS·C-10 T-SPIN·C-12/13 아깝다!·C-05~C-08 COMBO) — §4.8 큐: 큰 글자는 동시에 1개.
   * @param {{ kind: "tetris" | "tspin" | "nearmiss" | "combo", text: string, size?: number, color?: string,
   *   glow?: string, shadow?: string, delayMs?: number, holdMs?: number, jitterPx?: number, stage?: number }} o
   */
  function callout(o) {
    const rank = CALLOUT_RANK[o.kind];
    const big = o.kind !== "combo" && rank >= mainRank;
    const el = big ? main : small;
    gsap.killTweensOf(el);
    el.textContent = o.text;
    css(el, { color: o.color ?? "#FFF8E7", textShadow: [o.glow, o.shadow].filter(Boolean).join(", "),
      background: "none",
      webkitTextStroke: "0" });
    const p = big ? g().callout : corner();
    place(el, p.x, p.y);
    const d = (o.delayMs ?? 0) / 1000;
    if (!big) {
      // COMBO 자리(오른쪽 위 작은 글자): 팝 160ms back.out(1.7), 700ms 뒤 투명도 0 200ms (C-05)
      type(el, o.kind === "combo" ? "callout-m" : "h2", o.kind === "combo" ? o.size ?? 36 : 28);
      gsap.fromTo(el, { opacity: reduced ? 0 : 1, scale: sc(0.6) }, { opacity: 1, scale: 1,
        duration: reduced ? 0.2 : 0.16,
        ease: ez("back.out(1.7)"), delay: d });
      shiver(el, o.jitterPx ?? 0, 700, d);
      gsap.to(el, { opacity: 0, duration: 0.2, delay: d + 0.86 });
      return el;
    }
    mainRank = rank;
    const done = () => { mainRank = 0; };
    if (o.kind === "tetris") {
      type(el, "callout-xl");
      goldText(el);
      el.style.textShadow = GLOW["gold-lg"];
      if (reduced) {
        gsap.fromTo(el, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.2, delay: d });
      } else {
        gsap.fromTo(el, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, duration: 0.18, ease: "expo.out",
          delay: d });
        shiver(el, 2, 500, d + 0.18);
      }
      gsap.to(el, { opacity: 0, scale: sc(1.2), duration: 0.3, ease: "power2.in", delay: d + 0.68, onComplete: done });
    } else if (o.kind === "tspin") {
      type(el, "callout-l");
      goldText(el, "4px #3A2A08");
      gsap.fromTo(el, { opacity: 0, scale: sc(1.8) }, { opacity: 1, scale: 1, duration: 0.16, ease: "expo.out",
        delay: d });
      gsap.to(el, { opacity: 0, duration: 0.2, delay: d + 0.76, onComplete: done });
    } else {
      // C-12·C-13 아깝다! (#FF6B6F, 흰 외곽선 3px) rotation ±3° 2번 왕복 300ms, 900ms 유지 후 소멸
      type(el, "callout-ko");
      css(el, { color: "#FF6B6F", webkitTextStroke: "3px #FFFFFF", paintOrder: "stroke fill" });
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.12, delay: d });
      if (!reduced) {
        gsap.fromTo(el, { rotation: -3 }, { rotation: 3, duration: 0.075, repeat: 3, yoyo: true, delay: d,
          onComplete: () => gsap.set(el, { rotation: 0 }) });
      }
      gsap.to(el, { opacity: 0, duration: 0.25, delay: d + 0.9, onComplete: done });
    }
    return el;
  }

  /** C-11 BACK-TO-BACK 띠 (주 콜아웃 위) — x −40px→0 200ms power2.out @param {number} [delayMs] */
  function b2bBand(delayMs = 0) {
    gsap.killTweensOf(band);
    band.textContent = "BACK-TO-BACK";
    type(band, "callout-m", 28);
    css(band, { color: "#F6D98B", letterSpacing: "0.12em", textShadow: GLOW["gold-md"] });
    place(band, g().callout.x, g().callout.y - 90);
    const d = delayMs / 1000;
    gsap.fromTo(band, { opacity: 0, x: reduced ? 0 : -40 }, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out",
      delay: d });
    gsap.to(band, { opacity: 0, duration: 0.25, delay: d + 0.8 });
  }

  /**
   * 떠오르는 짧은 글자 ("−n 상쇄"·"+1 여리고"·"+25 만나"·"차단"·"무효"·"되돌림"·"전신갑주: …"·"상대가 먼저 맞혔습니다" 등)
   * @param {{ text: string, x: number, y: number, type?: keyof typeof TYPE, size?: number, color?: string,
   *   rise?: number, holdMs?: number, glow?: string, scaleFrom?: number, ease?: string }} o
   */
  function float(o) {
    const el = floats.find((f) => !gsap.isTweening(f)) ?? floats[0];
    gsap.killTweensOf(el);
    el.textContent = o.text;
    type(el, o.type ?? "h3", o.size);
    css(el, { color: o.color ?? "#F4EFE3", textShadow: o.glow ?? "none", background: "none", webkitTextStroke: "0" });
    place(el, o.x, o.y);
    gsap.fromTo(el, { opacity: 0, scale: sc(o.scaleFrom ?? 1) }, { opacity: 1, scale: 1, duration: 0.2,
      ease: ez(o.ease ?? "power2.out") });
    gsap.to(el, { y: reduced ? 0 : (o.rise ?? -16), duration: (o.holdMs ?? 600) / 1000, ease: "power2.out" });
    gsap.to(el, { opacity: 0, duration: 0.2, delay: (o.holdMs ?? 600) / 1000 });
    return el;
  }

  return {
    callout, b2bBand, float,
    /** §4.8 자막 큐 (subtitle.js) — {kind, title, tier, note, verseRefs, holdMs, wide} */
    subtitle: sub.push,
    /**
     * M-01 카운트다운 숫자 (type.countdown #FFF8E7 + holy 발광, scale 1.8→1 160ms expo.out, 850ms에 200ms 소멸)
     * 또는 "STAND!"(callout-l --g-gold, scale 0.6→1.1→1 300ms). round ≥ 2면 위에 "ROUND n"(type.h2)
     * @param {{ text: string, stand?: boolean, round?: number }} o
     */
    countdown(o) {
      gsap.killTweensOf(count);
      const c = g().callout;
      count.innerHTML = (o.round && o.round >= 2 && !o.stand
        ? `<div style="font:700 28px ${KO};color:#F4EFE3">ROUND ${o.round}</div>` : "") + escapeHtml(o.text);
      type(count, o.stand ? "callout-l" : "countdown");
      css(count, { color: "#FFF8E7", textShadow: o.stand ? GLOW["gold-lg"] : GLOW.holy, background: "none",
        webkitTextStroke: "0" });
      if (o.stand) goldText(count, "3px #3A2A08");
      place(count, c.x, c.y);
      if (reduced) gsap.fromTo(count, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.16 });
      else if (o.stand) gsap.fromTo(count, { opacity: 0, scale: 0.6 }, { keyframes: [{ opacity: 1, scale: 1.1,
        duration: 0.2 },
        { scale: 1, duration: 0.1 }] });
      else gsap.fromTo(count, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.16, ease: "expo.out" });
      gsap.to(count, { opacity: 0, duration: 0.2, delay: o.stand ? 0.8 : 0.85 });
    },
    /**
     * Q-07 "0.12초 차이!" — 숫자 = gapMs÷1000 소수 2자리(callout-l 72px #FF6B6F→#F6D98B) + "차이!"(callout-ko 40px)
     * scale 0.4→1 600ms elastic.out(1, 0.45), ±2px 떨림 800ms / 감소: 200ms 페이드
     * @param {{ gapMs: number, x?: number, y?: number }} o x·y = 말씀 대결 모달 가운데 위 (기본 화면 가운데)
     */
    gap(o) {
      gsap.killTweensOf(gap);
      const sec = (Math.max(0, o.gapMs) / 1000).toFixed(2);
      gap.innerHTML = `<span style="font:900 72px ${CINZEL};letter-spacing:.02em;`
        + "background:linear-gradient(90deg,#FF6B6F,"
        + `#F6D98B);-webkit-background-clip:text;background-clip:text;color:transparent">${sec}초</span> `
        + `<span style="font:900 40px ${KO};color:#F6D98B">차이!</span>`;
      place(gap, o.x ?? g().callout.x, o.y ?? 200);
      if (reduced) {
        gsap.fromTo(gap, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.2 });
      } else {
        gsap.fromTo(gap, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.6,
          ease: "elastic.out(1, 0.45)" });
        shiver(gap, 2, 800, 0.6);
      }
      gsap.to(gap, { opacity: 0, duration: 0.3, delay: 2.2 });
    },
    /**
     * 큰 알림 글자 (M-02 "ROUND n — 승리"·M-04 "VICTORY" + 구절 3줄·M-05 "DEFEAT"·M-06 "상대가 나갔습니다"·
     * M-07 "연습 종료"·X-06 "새 축복: …") — 내 보드 가운데(y 지정 가능), scaleFrom→1 (감소: 투명도만)
     * @param {{ text: string, type: keyof typeof TYPE, size?: number, color?: string, gold?: boolean, verseRef?:
     * string,
     *   y?: number, holdMs?: number, scaleFrom?: number, durMs?: number }} o
     */
    banner(o) {
      gsap.killTweensOf(ban);
      // 구절 상자: 큰 글자의 자간·발광을 물려받지 않게 하고(한글 자간 벌어짐), 콘페티·보드 위에서 읽히는 바탕 (C-003 판독)
      const box = '<div style="white-space:normal;width:560px;margin:12px auto 0;letter-spacing:normal;text-shadow:none;'
        + 'background:rgba(7,6,13,0.6);border-radius:8px;padding:8px 12px">';
      const verse = o.verseRef ? `${box}${verseHtml(o.verseRef)}`
        + "</div>" : "";
      ban.innerHTML = `<div>${escapeHtml(o.text)}</div>${verse}`;
      type(ban, o.type, o.size);
      css(ban, { color: o.color ?? "#F4EFE3", textShadow: o.gold ? GLOW["gold-lg"] : "none", background: "none",
        webkitTextStroke: "0" });
      if (o.gold) goldText(/** @type {HTMLElement} */ (ban.firstElementChild), "4px #3A2A08");
      place(ban, g().callout.x, o.y ?? g().callout.y);
      gsap.fromTo(ban, { opacity: 0, scale: sc(o.scaleFrom ?? 1) }, { opacity: 1, scale: 1,
        duration: (o.durMs ?? 300) / 1000,
        ease: "expo.out" });
      gsap.to(ban, { opacity: 0, duration: 0.3, delay: (o.holdMs ?? 2000) / 1000 });
    },
    /** D-03 은혜 비둘기 (게이지 아래, 투명도 0→0.7 800ms power2.out — 글자·소리 없음) @param {boolean} on */
    grace(on) {
      const gg = g().gauge;
      if (!gg) return;
      place(dove, gg.x + gg.w / 2, gg.y + gg.h + 18);
      gsap.to(dove, { opacity: on ? 0.7 : 0, duration: 0.8, ease: "power2.out" });
    },
    /** @param {boolean} on §6.3 감소 모드 */
    setReduced(on) {
      reduced = on;
    },
    /** 흔들림 끔이면 콜아웃 떨림 없음 (§6.3) @param {boolean} on */
    setJitter(on) {
      jitter = on;
    },
    /** 라운드 리셋·화면 이탈 */
    clear() {
      for (const el of [main, band, small, count, ban, gap, ...floats]) {
        gsap.killTweensOf(el);
        gsap.set(el, { opacity: 0 });
      }
      sub.clear();
      mainRank = 0;
    },
    destroy() {
      this.clear();
      for (const el of [main, band, small, count, ban, gap, dove, subEl, ...floats]) el.remove();
    },
  };
}
