// TASK-041-2 · FR-027~030 · FR-054 · C-003 · NFR-001 — GSAP DOM 오버레이: 비네트·보드 암전·HUD-16 자막(영 이름·KJV·직접 번역·출처)·배너·예수님 구절.
// 글자는 DOM으로 그려 스크린리더·대비 규칙을 지킨다 (design-vision §1). 동적 텍스트는 textContent만 (innerHTML 금지 — devguide §3.3-3).
// GSAP는 transform·opacity만 애니메이션한다 (§4.12). 좌표 = overlayHost 기준 CSS px (= BattleScene.layout()과 같은 원점).
import { gsap } from 'gsap';

/** design-vision §2.2·§2.4·§2.5·§2.7·§4.7 오버레이 수치 */
export const OVERLAY = Object.freeze({
  vignette: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(20,0,10,0.75) 100%)', vignetteOpacity: 0.85, vignetteInMs: 300,
  vignetteOutMs: 400, subtitleMs: 2500, fadeMs: 200, darkenOutMs: 400, bannerMs: 1500,
  textPrimary: '#F5F0E1', textSecondary: '#B9B4CC', gold: '#F2C14E', panel: 'rgba(22,26,46,0.88)', line: '#2C3254',
  fontKo: "'Noto Serif KR', serif", fontEn: "'Cinzel', serif",
});

function el(doc, tag, style, text) {
  const node = doc.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

// C-003 구절 표기 순서: KJV 원문(Cinzel, lang="en") → 한국어 직접 번역 → 출처 장·절
export function buildVerseNodes(doc, verse) {
  if (!verse) return [];
  const kjv = el(doc, 'p', { margin: '0', font: `400 18px/1.6 ${OVERLAY.fontEn}`, letterSpacing: '0.02em', color: OVERLAY.textPrimary }, verse.kjv);
  kjv.setAttribute('lang', 'en');
  const ko = el(doc, 'p', { margin: '4px 0 0', font: `400 16px/1.7 ${OVERLAY.fontKo}`, color: OVERLAY.textSecondary }, verse.ko);
  const ref = el(doc, 'p', { margin: '4px 0 0', font: `700 14px/1.4 ${OVERLAY.fontEn}`, color: OVERLAY.gold }, verse.ref);
  ref.setAttribute('lang', 'en');
  return [kjv, ko, ref];
}

// FR-054 DOM 오버레이 실행기 — host = overlayHost (없으면 document.body, position:fixed)
export function createOverlayFx(host, getLayout = () => null) {
  const doc = host.ownerDocument ?? globalThis.document;
  const fixed = host === doc.body;
  const layer = el(doc, 'div', { position: fixed ? 'fixed' : 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '5' });
  layer.setAttribute('aria-hidden', 'true');
  host.appendChild(layer);
  const vig = el(doc, 'div', { position: 'absolute', inset: '0', background: OVERLAY.vignette, opacity: '0' });
  layer.appendChild(vig);
  let vigUntil = 0;
  let vigTimer = null;
  const darkens = new Set();

  const place = (node, r) => Object.assign(node.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });

  return {
    layer,
    // FR-049 EVT-27 비네트 — 0 → 0.85 (300ms), holdMs 유지, 해제 400ms (겹치면 늦은 해제 시각을 따른다)
    vignette(holdMs, now = performance.now()) {
      gsap.to(vig, { opacity: OVERLAY.vignetteOpacity, duration: OVERLAY.vignetteInMs / 1000, overwrite: true });
      vigUntil = Math.max(vigUntil, now + OVERLAY.vignetteInMs + holdMs);
      clearTimeout(vigTimer);
      vigTimer = setTimeout(() => gsap.to(vig, { opacity: 0, duration: OVERLAY.vignetteOutMs / 1000, overwrite: true }), Math.max(0, vigUntil - now));
    },
    // FR-027 · FR-030 보드 암전 (더러운 귀신 0.30 / 용 0.97 / 광명의 천사 0.30) — end(fadeMs)로 조기 해제
    darken(rect, opacity, durationMs, inMs = OVERLAY.fadeMs) {
      if (!rect) return { end() {} };
      const node = el(doc, 'div', { position: 'absolute', background: '#000', opacity: '0' });
      place(node, rect);
      layer.appendChild(node);
      darkens.add(node);
      gsap.to(node, { opacity, duration: inMs / 1000 });
      const end = (fadeMs = OVERLAY.darkenOutMs) => {
        if (!darkens.has(node)) return;
        darkens.delete(node);
        gsap.killTweensOf(node);
        gsap.to(node, { opacity: 0, duration: fadeMs / 1000, onComplete: () => node.remove() });
      };
      if (durationMs > 0) gsap.delayedCall(durationMs / 1000, () => end());
      return { end };
    },
    /** 구원의 투구·예수님 — 걸린 암전을 모두 걷어 냄 */
    clearDarkness(fadeMs = OVERLAY.darkenOutMs) {
      for (const node of [...darkens]) {
        darkens.delete(node);
        gsap.killTweensOf(node);
        gsap.to(node, { opacity: 0, duration: fadeMs / 1000, onComplete: () => node.remove() });
      }
    },
    // FR-054 · C-003 HUD-16 자막 — 내 보드 아래쪽 1/4, 제목(이름) + 구절 3줄, 2500ms
    subtitle({ title, titleEn = null, verse = null, ms = OVERLAY.subtitleMs, rect = getLayout()?.myBoard ?? null }) {
      const box = el(doc, 'div', { position: 'absolute', padding: '8px 12px', background: OVERLAY.panel, border: `1px solid ${OVERLAY.line}`,
        borderRadius: '12px', boxSizing: 'border-box', opacity: '0', textAlign: 'center' });
      if (rect) Object.assign(box.style, { left: `${rect.x}px`, width: `${rect.width}px`, top: `${rect.y + rect.height * 0.75}px` });
      else Object.assign(box.style, { left: '50%', bottom: '15%', width: 'min(90vw, 560px)', transform: 'translateX(-50%)' });
      const head = el(doc, 'p', { margin: '0 0 4px', font: `700 18px/1.3 ${OVERLAY.fontKo}`, color: OVERLAY.textPrimary }, title ?? '');
      box.appendChild(head);
      if (titleEn) {
        const en = el(doc, 'span', { marginLeft: '8px', font: `400 14px ${OVERLAY.fontEn}`, color: OVERLAY.textSecondary }, titleEn);
        en.setAttribute('lang', 'en');
        head.appendChild(en);
      }
      for (const n of buildVerseNodes(doc, verse)) box.appendChild(n);
      layer.appendChild(box);
      gsap.timeline({ onComplete: () => box.remove() }).to(box, { opacity: 1, duration: OVERLAY.fadeMs / 1000 })
        .to(box, { opacity: 0, duration: OVERLAY.fadeMs / 1000 }, `+=${Math.max(0, ms - 2 * OVERLAY.fadeMs) / 1000}`);
      return box;
    },
    // FR-007 EVT-51 배너 (1500ms)
    banner(text, ms = OVERLAY.bannerMs) {
      const node = el(doc, 'div', { position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)', padding: '16px 32px',
        background: OVERLAY.panel, border: `1px solid ${OVERLAY.gold}`, borderRadius: '12px', font: `700 28px/1.25 ${OVERLAY.fontKo}`,
        color: OVERLAY.textPrimary, opacity: '0', whiteSpace: 'nowrap' }, text);
      layer.appendChild(node);
      gsap.timeline({ onComplete: () => node.remove() }).to(node, { opacity: 1, duration: OVERLAY.fadeMs / 1000 })
        .to(node, { opacity: 0, duration: OVERLAY.fadeMs / 1000 }, `+=${Math.max(0, ms - 2 * OVERLAY.fadeMs) / 1000}`);
    },
    // FR-039 EVT-32 예수님 구절 — 화면 위쪽 가운데, ms 동안 (C-003 표기)
    centerVerse(verse, ms, scale = 1) {
      if (!verse) return;
      const box = el(doc, 'div', { position: 'absolute', left: '50%', top: '18%', width: 'min(90%, 640px)', transform: `translateX(-50%) scale(${scale})`,
        transformOrigin: 'top center', textAlign: 'center', opacity: '0', textShadow: '0 0 24px rgba(255,255,255,0.6)' });
      for (const n of buildVerseNodes(doc, verse)) box.appendChild(n);
      layer.appendChild(box);
      gsap.timeline({ onComplete: () => box.remove() }).to(box, { opacity: 1, duration: OVERLAY.fadeMs / 1000 })
        .to(box, { opacity: 0, duration: OVERLAY.fadeMs / 1000 }, `+=${Math.max(0, ms - 2 * OVERLAY.fadeMs) / 1000}`);
    },
    destroy() {
      clearTimeout(vigTimer);
      gsap.killTweensOf(layer.querySelectorAll('*'));
      layer.remove();
    },
  };
}
