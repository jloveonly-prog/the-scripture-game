// TASK-041-3 · FR-007 · FR-052 · NFR-006 — 라운드·경기 승패 연출: 승리 보드 금빛 발광 / 패배 보드 회색 굳음 + 무너짐, 경기 승리 섬광·블룸·콘페티, 경기 패배 회색 페이드 (design-vision §4.10).
// canvas-confetti는 useWorker: false (CSP worker-src 'self' — devguide §3.3-7). 결과 화면(SCR-006)용 DOM 연출은 장면 없이도 동작한다.
import { gsap } from 'gsap';
import { scaleFlashAlpha, tryFlash } from './fx-intensity.js';

/** design-vision §4.10 EVT-48~50 수치 */
export const VICTORY = Object.freeze({
  collapseDelayMs: 300, flashMs: 200, flashAlpha: 0.9, bloomMs: 600, bloomAlpha: 0.5,
  confetti: Object.freeze({ particleCount: 160, spread: 90, colors: Object.freeze(['#F4C430', '#FFE08A', '#FFFFFF']), secondDelayMs: 400, totalMs: 2600 }),
  loseFadeMs: 400, loseSaturate: 0.8, loseTint: 'rgba(99,106,128,0.18)',
});

// FR-007 EVT-49 콘페티 2회 설정 (두 번째는 반대쪽) — 순수 함수
export function confettiBursts() {
  const c = VICTORY.confetti;
  const base = { particleCount: c.particleCount, spread: c.spread, colors: [...c.colors] };
  return [
    { delayMs: 0, options: { ...base, origin: { x: 0.25, y: 0.6 }, angle: 60 } },
    { delayMs: c.secondDelayMs, options: { ...base, origin: { x: 0.75, y: 0.6 }, angle: 120 } },
  ];
}

// FR-007 EVT-48 라운드 승패 — 이긴 쪽 보드 빛, 진 쪽 보드 회색 300ms 후 무너짐 900ms
export function playRoundEnd(rt, filterFx, won) {
  const winner = won ? rt.views.me : rt.views.opponent;
  const loser = won ? rt.views.opponent : rt.views.me;
  if (winner) filterFx.victoryGlow(winner);
  if (loser) {
    filterFx.grayscale(loser);
    loser.collapse(VICTORY.collapseDelayMs);
  }
}

// FR-007 다음 라운드 카운트다운(EVT-18) 진입 시 굳음 해제
export function resetRoundEnd(rt, filterFx) {
  for (const v of [rt.views.me, rt.views.opponent]) {
    if (!v) continue;
    filterFx.clearGrayscale(v);
    v.resetCollapse();
  }
}

function fullLayer(doc, style) {
  const n = doc.createElement('div');
  n.setAttribute('aria-hidden', 'true');
  Object.assign(n.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '50', ...style });
  doc.body.appendChild(n);
  return n;
}

// FR-007 EVT-49 경기 승리 — 흰 섬광 200ms + 블룸 600ms + 콘페티 2회 (각 160개, spread 90)
export async function playMatchWin(doc = globalThis.document, now = performance.now()) {
  if (tryFlash(now, 1)) {
    const flash = fullLayer(doc, { background: '#FFFFFF', opacity: String(scaleFlashAlpha(VICTORY.flashAlpha)) });
    gsap.to(flash, { opacity: 0, duration: VICTORY.flashMs / 1000, ease: 'expo.out', onComplete: () => flash.remove() });
  }
  const bloom = fullLayer(doc, { background: 'radial-gradient(circle at 50% 40%, rgba(255,224,138,0.9), rgba(255,255,255,0) 60%)', opacity: '0' });
  gsap.timeline({ onComplete: () => bloom.remove() }).to(bloom, { opacity: scaleFlashAlpha(VICTORY.bloomAlpha), duration: (VICTORY.bloomMs / 2) / 1000 })
    .to(bloom, { opacity: 0, duration: (VICTORY.bloomMs / 2) / 1000 });
  let confetti;
  try {
    confetti = (await import('canvas-confetti')).default;
  } catch (err) {
    console.error('[victory-fx] 콘페티 모듈 로드 실패 — 콘페티 생략', err);
    return;
  }
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '51' });
  doc.body.appendChild(canvas);
  const fire = confetti.create(canvas, { resize: true, useWorker: false });
  for (const b of confettiBursts()) setTimeout(() => fire(b.options), b.delayMs);
  setTimeout(() => {
    fire.reset();
    canvas.remove();
  }, VICTORY.confetti.totalMs + VICTORY.confetti.secondDelayMs);
}

let loseLayer = null;

// FR-007 EVT-50 경기 패배 — 회색 페이드 400ms, 결과 화면 채도 80% (다음 화면 전환(hashchange)에서 해제)
export function playMatchLose(doc = globalThis.document) {
  clearMatchLose();
  const n = fullLayer(doc, { background: VICTORY.loseTint, backdropFilter: `saturate(${VICTORY.loseSaturate})`, opacity: '0' });
  loseLayer = n;
  gsap.to(n, { opacity: 1, duration: VICTORY.loseFadeMs / 1000 });
  globalThis.addEventListener?.('hashchange', clearMatchLose, { once: true });
}

export function clearMatchLose() {
  if (!loseLayer) return;
  gsap.killTweensOf(loseLayer);
  loseLayer.remove();
  loseLayer = null;
}
