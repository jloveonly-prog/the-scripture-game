// TASK-041-3 · FR-052 · FR-061 · FR-007 · NFR-006 — 대형 연출 글자(DOM): TETRIS·COMBO ×n·T-SPIN·BACK-TO-BACK·아깝다!·카운트다운·여리고 "+1" (design-vision §2.5·§4.5·§4.9).
// 같은 프레임 글자는 위에서부터 BACK-TO-BACK → TETRIS/T-SPIN → COMBO 순 세로 쌓기 (EVT-19). transform·opacity만 애니메이션.
import { gsap } from 'gsap';

/** design-vision §2.2·§2.5·§2.6·§4.5 글자 토큰 */
export const TEXT_FX = Object.freeze({
  fxXl: Object.freeze({ desktop: 96, tablet: 72, mobile: 56, mobileLandscape: 56 }),
  fxL: Object.freeze({ desktop: 48, tablet: 40, mobile: 32, mobileLandscape: 32 }),
  countdownPx: 120, roundPx: 32, nearMissPx: 40, plusOnePx: 32,
  gold: '#FFE08A', primary: '#F5F0E1', lightGold: '#F2C14E', scarletLight: '#F27A45', white: '#FFFFFF',
  glowMd: '0 0 16px rgba(242,193,78,0.55), 0 0 2px #FFE08A', glowWhite: '0 0 24px rgba(255,255,255,0.6)',
  fontEn: "'Cinzel', serif", fontKo: "'Noto Serif KR', serif", ease: 'back.out(1.7)',
  tetris: Object.freeze({ from: 0.6, peak: 1.15, popMs: 300, holdMs: 500, fadeMs: 250 }),
  label: Object.freeze({ ms: 700 }), combo: Object.freeze({ ms: 600 }), nearMiss: Object.freeze({ from: 0.8, ms: 900 }),
  countdown: Object.freeze({ from: 1.4, stepMs: 1000, goMs: 400 }), plusOne: Object.freeze({ ms: 400, risePx: 20 }),
  stackGapPx: 8,
});

// FR-061 EVT-13 콤보 글자 규격 — 크기 32+6n(상한 72), 색 단계, 떨림 0.5n(상한 4)
export function comboStyle(combo) {
  const n = Math.max(1, Math.floor(combo));
  const color = n <= 2 ? TEXT_FX.primary : n <= 4 ? TEXT_FX.lightGold : n <= 6 ? TEXT_FX.scarletLight : TEXT_FX.white;
  return { sizePx: Math.min(32 + 6 * n, 72), color, glow: n >= 7 ? TEXT_FX.glowWhite : 'none', jitterPx: Math.min(0.5 * n, 4) };
}

// FR-052 EVT-14 T-Spin 이름 (1~3줄)
export function tspinLabel(lines) {
  return ['T-SPIN', 'T-SPIN SINGLE', 'T-SPIN DOUBLE', 'T-SPIN TRIPLE'][Math.max(0, Math.min(3, lines | 0))];
}

// FR-061 EVT-19 세로 쌓기 순서
export const STACK_ORDER = Object.freeze(['b2b', 'tetris', 'tspin', 'combo']);
export function sortStack(items) {
  return [...items].sort((a, b) => STACK_ORDER.indexOf(a.kind) - STACK_ORDER.indexOf(b.kind));
}

// FR-052 글자 실행기 — layer = overlay-fx layer, getLayout = BattleScene 배치
export function createTextPop(layer, getLayout = () => null) {
  const doc = layer.ownerDocument ?? globalThis.document;
  const device = () => getLayout()?.device ?? 'desktop';

  function node(text, { sizePx, color, shadow = 'none', font = TEXT_FX.fontEn, lang = 'en' }) {
    const n = doc.createElement('div');
    n.textContent = text;
    if (lang) n.setAttribute('lang', lang);
    Object.assign(n.style, { position: 'absolute', left: '0', top: '0', whiteSpace: 'nowrap', font: `700 ${sizePx}px/1.1 ${font}`, color,
      textShadow: shadow, opacity: '0', willChange: 'transform, opacity', pointerEvents: 'none' });
    layer.appendChild(n);
    return n;
  }

  /** 기준점(cx, cy)을 가운데로 두는 transform */
  const at = (n, cx, cy) => gsap.set(n, { x: cx, y: cy, xPercent: -50, yPercent: -50 });

  function center(rect) {
    if (rect) return { x: rect.x + rect.width / 2, y: rect.y + rect.height * 0.4 };
    return { x: (layer.clientWidth || 0) / 2, y: (layer.clientHeight || 0) * 0.4 };
  }

  const build = {
    b2b: () => ({ n: node('BACK-TO-BACK', { sizePx: TEXT_FX.fxL[device()], color: TEXT_FX.gold, shadow: TEXT_FX.glowMd }), ms: TEXT_FX.label.ms }),
    tspin: (it) => ({ n: node(tspinLabel(it.lines), { sizePx: TEXT_FX.fxL[device()], color: TEXT_FX.gold, shadow: TEXT_FX.glowMd }), ms: TEXT_FX.label.ms }),
    tetris: () => ({ n: node('TETRIS', { sizePx: TEXT_FX.fxXl[device()], color: TEXT_FX.gold, shadow: TEXT_FX.glowMd }), ms: 0, tetris: true }),
    combo: (it) => {
      const s = comboStyle(it.combo);
      return { n: node(`COMBO ×${Math.floor(it.combo)}`, { sizePx: s.sizePx, color: s.color, shadow: s.glow }), ms: TEXT_FX.combo.ms, jitter: s.jitterPx };
    },
  };

  return {
    // FR-061 EVT-19 한 프레임 글자 묶음 [{kind:'b2b'|'tetris'|'tspin'|'combo', lines?, combo?}]
    showStack(items, rect = getLayout()?.myBoard ?? null) {
      const list = sortStack(items).map((it) => ({ ...it, ...build[it.kind](it) }));
      const heights = list.map((it) => it.n.offsetHeight || 0);
      const total = heights.reduce((a, b) => a + b, 0) + TEXT_FX.stackGapPx * Math.max(0, list.length - 1);
      const c = center(rect);
      let y = c.y - total / 2;
      list.forEach((it, i) => {
        at(it.n, c.x, y + heights[i] / 2);
        y += heights[i] + TEXT_FX.stackGapPx;
        const done = () => it.n.remove();
        if (it.tetris) {
          const t = TEXT_FX.tetris;
          gsap.timeline({ onComplete: done }).fromTo(it.n, { scale: t.from, opacity: 1 }, { scale: t.peak, duration: (t.popMs * 0.6) / 1000, ease: TEXT_FX.ease })
            .to(it.n, { scale: 1, duration: (t.popMs * 0.4) / 1000 }).to(it.n, { opacity: 0, duration: t.fadeMs / 1000 }, `+=${t.holdMs / 1000}`);
          return;
        }
        const tl = gsap.timeline({ onComplete: done }).fromTo(it.n, { scale: 0.8, opacity: 1 }, { scale: 1, duration: 0.2, ease: TEXT_FX.ease })
          .to(it.n, { opacity: 0, duration: 0.2 }, `+=${Math.max(0, it.ms - 400) / 1000}`);
        if (it.jitter) tl.to(it.n, { x: `+=${it.jitter}`, duration: 0.04, repeat: Math.floor(it.ms / 80), yoyo: true, ease: 'none' }, 0);
      });
    },
    // FR-061 EVT-16 니어미스 "아깝다!" (40px 주홍, 0.8→1.0 ease-pop, 900ms)
    nearMiss(rect) {
      const n = node('아깝다!', { sizePx: TEXT_FX.nearMissPx, color: TEXT_FX.scarletLight, font: TEXT_FX.fontKo, lang: null });
      const c = center(rect);
      at(n, c.x, c.y);
      gsap.timeline({ onComplete: () => n.remove() }).fromTo(n, { scale: TEXT_FX.nearMiss.from, opacity: 1 }, { scale: 1, duration: 0.3, ease: TEXT_FX.ease })
        .to(n, { opacity: 0, duration: 0.2 }, `+=${(TEXT_FX.nearMiss.ms - 500) / 1000}`);
    },
    // FR-007 EVT-18 카운트다운 — "ROUND n" 아래 3·2·1 (120px, 1.4→1.0 + 페이드, 1초씩) → "시작" 400ms. 시각 = Date.now() 기준 로컬 epoch
    countdown({ round, startAtLocal, countdownMs }, onDone, nowMs = Date.now()) {
      const rect = getLayout()?.myBoard ?? null;
      const c = center(rect);
      const remaining = Math.max(0, startAtLocal - nowMs);
      const head = node(`ROUND ${round}`, { sizePx: TEXT_FX.roundPx, color: TEXT_FX.primary });
      at(head, c.x, c.y - TEXT_FX.countdownPx * 0.75);
      gsap.to(head, { opacity: 1, duration: 0.2 });
      const steps = Math.min(Math.ceil(remaining / TEXT_FX.countdown.stepMs), Math.ceil((countdownMs || remaining) / TEXT_FX.countdown.stepMs));
      for (let k = steps; k >= 1; k -= 1) {
        const delay = Math.max(0, remaining - k * TEXT_FX.countdown.stepMs) / 1000;
        const n = node(String(k), { sizePx: TEXT_FX.countdownPx, color: TEXT_FX.gold, shadow: TEXT_FX.glowMd });
        at(n, c.x, c.y);
        gsap.timeline({ delay, onComplete: () => n.remove() }).fromTo(n, { scale: TEXT_FX.countdown.from, opacity: 1 },
          { scale: 1, opacity: 0, duration: TEXT_FX.countdown.stepMs / 1000, ease: 'power2.out' });
      }
      const go = node('시작', { sizePx: TEXT_FX.countdownPx * 0.6, color: TEXT_FX.gold, shadow: TEXT_FX.glowMd, font: TEXT_FX.fontKo, lang: null });
      at(go, c.x, c.y);
      gsap.timeline({ delay: remaining / 1000, onStart: () => { head.remove(); onDone?.(); }, onComplete: () => go.remove() })
        .fromTo(go, { opacity: 1, scale: 1.2 }, { opacity: 0, scale: 1, duration: TEXT_FX.countdown.goMs / 1000 });
    },
    // FR-044 EVT-38 여리고 "+1" 금빛 글자
    plusOne(x, y) {
      const n = node('+1', { sizePx: TEXT_FX.plusOnePx, color: TEXT_FX.gold, shadow: TEXT_FX.glowMd });
      at(n, x, y);
      gsap.timeline({ onComplete: () => n.remove() }).set(n, { opacity: 1 })
        .to(n, { y: `-=${TEXT_FX.plusOne.risePx}`, opacity: 0, duration: TEXT_FX.plusOne.ms / 1000, ease: 'power2.out' });
    },
  };
}
