// TASK-040-3 · FR-039 · C-002 · C-007 — 예수님 "세상을 이기었노라" 빛 연출: 얼굴 없는 빛 실루엣(바깥 윤곽선만) + 빛살 + 구절 2개 (design-vision §2.10·§4.8 EVT-32).
// 얼굴·이목구비를 그리지 않는다. 피해·패배·선택 대상으로 그리지 않고 다른 존재와 겹쳐 그리지 않는다. 흔들림·히트스톱 없음, 보드 조작은 계속된다.
import { Container, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { getVerse } from '../content/content-loader.js';
import { COLORS } from './piece-skin.js';
import { burst } from '../fx/particle-pool.js';

/** design-vision §4.8 EVT-32 단계 시각(ms)·수치 */
export const JESUS = Object.freeze({
  totalMs: 4000, rayStartMs: 0, darknessLiftMs: 400, silhouetteInStart: 400, silhouetteInEnd: 1200, scatterStart: 1200, scatterEnd: 2000,
  verse1: Object.freeze({ ref: 'John 16:33', start: 1200, end: 2600 }), verse2: Object.freeze({ ref: 'John 1:5', start: 2600, end: 4000 }),
  heightRatio: 0.45, outlinePx: 3, scatterParticles: 120, opponentScale: 0.6,
});

// C-002 얼굴 없는 사람 형상의 바깥 윤곽선 (높이 h, 가운데 위 원점) — 내부는 빛 그라데이션(겹친 반투명 채움)
export function drawJesusSilhouette(g, h) {
  const shape = (k) => {
    const w = h * 0.36 * k;
    const head = h * 0.075 * k;
    g.circle(0, head + h * (1 - k) * 0.1, head);
    g.moveTo(-w * 0.25, h * 0.17).quadraticCurveTo(-w * 0.55, h * 0.2, -w * 0.5, h * 0.4).lineTo(-w * 0.65, h * 0.98 * k + h * (1 - k) * 0.5)
      .lineTo(w * 0.65, h * 0.98 * k + h * (1 - k) * 0.5).lineTo(w * 0.5, h * 0.4).quadraticCurveTo(w * 0.55, h * 0.2, w * 0.25, h * 0.17).closePath();
  };
  for (const [k, a] of [[1, 0.25], [0.8, 0.35], [0.55, 0.5]]) {
    shape(k);
    g.fill({ color: COLORS.jesusLight, alpha: a });
  }
  shape(1);
  g.stroke({ width: JESUS.outlinePx, color: COLORS.lightWhite });
  return g;
}

// FR-039 EVT-32 예수님 이벤트 — target 'me'(화면 전체, 모바일은 보드 크기) / 'opponent'(상대 보드 위 0.6배)
export function playJesus(rt, filterFx, overlay, target, totalMs = JESUS.totalMs) {
  const screen = rt.app.screen;
  const mine = target !== 'opponent';
  const view = rt.boardOf(mine ? 'me' : 'opponent');
  const board = view?.rect() ?? { x: 0, y: 0, width: screen.width, height: screen.height };
  const area = mine && !rt.isMobile ? { x: 0, y: 0, width: screen.width, height: screen.height } : board;
  const scale = mine ? 1 : JESUS.opponentScale;
  const at = (ms) => (ms / JESUS.totalMs) * totalMs / 1000;

  if (mine) overlay.clearDarkness(JESUS.darknessLiftMs);
  filterFx.jesusRays(area, { x: area.x + area.width / 2, y: area.y }, totalMs, mine);

  const h = (mine ? screen.height : board.height) * JESUS.heightRatio * scale;
  const fig = new Container();
  drawJesusSilhouette(fig.addChild(new Graphics()), h);
  fig.position.set(area.x + area.width / 2, area.y + area.height * 0.04);
  fig.alpha = 0;
  rt.screenFx.addChild(fig);
  gsap.timeline({ onComplete: () => fig.destroy({ children: true }) })
    .to(fig, { alpha: 1, duration: at(JESUS.silhouetteInEnd - JESUS.silhouetteInStart) }, at(JESUS.silhouetteInStart))
    .to(fig, { alpha: 0, duration: at(400) }, at(JESUS.totalMs - 400));

  gsap.delayedCall(at(JESUS.scatterStart), () => {
    if (rt.destroyed || !view) return;
    burst(rt.particles, { x: board.x + board.width / 2, y: board.y + board.height / 2, width: board.width, height: board.height,
      count: Math.round(JESUS.scatterParticles * scale), color: COLORS.jesusLight, speed: 140, lifeMs: JESUS.scatterEnd - JESUS.scatterStart, gravity: -120, size: 0.5 });
  });
  if (!mine) return;
  for (const v of [JESUS.verse1, JESUS.verse2]) {
    gsap.delayedCall(at(v.start), () => overlay.centerVerse(getVerse(v.ref), (v.end - v.start) * (totalMs / JESUS.totalMs)));
  }
}
