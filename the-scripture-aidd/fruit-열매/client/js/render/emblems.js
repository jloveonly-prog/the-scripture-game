// TASK-040-3 · FR-013 · FR-014~017 · C-007 · D-25 — 위인 엠블럼 4종(물맷돌·심장·반석·사슬) 코드 그리기 + DOM용 캔버스 + 스킬 발동 엠블럼 연출 (design-vision §2.10·§4.8).
// 이미지 파일 0개 — PixiJS Graphics 경로만. 기준 128×128 (지름 120 메달), 비율 축소. DOM 캔버스는 공유 렌더러 1개로 추출 후 복사본을 돌려준다.
import { Container, Graphics, Rectangle, autoDetectRenderer } from 'pixi.js';
import { gsap } from 'gsap';
import { heroesById } from '../content/content-loader.js';
import { COLORS, PALETTE_COLORS, shadeColor } from './piece-skin.js';
import { burst } from '../fx/particle-pool.js';

/** design-vision §2.10·§4.8 엠블럼·위인 스킬 연출 수치 */
const EMBLEM = Object.freeze({ base: 128, medalR: 60, outerRing: 4, innerRing: 1, popFrom: 1, popTo: 1.2, popMs: 800, bandMs: 10000,
  quakeRowMs: 120, quakeRows: 3, sizeOnBoard: 0.6 });

// FR-013 엠블럼 한 개를 Graphics에 그린다 (size px 정사각형, 왼쪽 위 원점)
export function drawEmblem(g, heroId, size = EMBLEM.base) {
  const hero = heroesById.get(heroId);
  if (!hero) throw new RangeError(`emblems: 알 수 없는 위인 ${heroId}`);
  const k = size / EMBLEM.base;
  const P = (v) => v * k;
  const [c1, c2] = hero.emblem.palette.map((p) => PALETTE_COLORS[p] ?? COLORS.lightGold);
  const cx = P(64);
  for (let i = 3; i >= 1; i -= 1) g.circle(cx, cx, P(EMBLEM.medalR + i * 1.5)).stroke({ width: P(3), color: COLORS.lightGold, alpha: 0.12 * (4 - i) });
  g.circle(cx, cx, P(EMBLEM.medalR)).fill(COLORS.bgPanelRaised).stroke({ width: P(EMBLEM.outerRing), color: COLORS.lightGold });
  g.arc(cx, cx, P(54), Math.PI, 0).stroke({ width: Math.max(1, P(EMBLEM.innerRing)), color: c1 });
  g.arc(cx, cx, P(54), 0, Math.PI).stroke({ width: Math.max(1, P(EMBLEM.innerRing)), color: c2 });
  const motif = MOTIFS[hero.emblem.motif];
  if (motif) motif(g, P, c1, c2);
  return g;
}

const MOTIFS = {
  // 다윗 sling — 늘어진 끈(2차 베지어 2개, 폭 4, 금) + 끈 끝 돌(지름 18, 청색 하늘, 하이라이트) + 궤적 점선 3점
  sling(g, P, gold, blue) {
    g.moveTo(P(50), P(32)).quadraticCurveTo(P(40), P(70), P(60), P(86)).stroke({ width: P(4), color: gold, cap: 'round' });
    g.moveTo(P(78), P(32)).quadraticCurveTo(P(88), P(70), P(66), P(86)).stroke({ width: P(4), color: gold, cap: 'round' });
    g.circle(P(63), P(92), P(9)).fill(blue);
    g.circle(P(60), P(89), P(2.2)).fill(COLORS.lightWhite);
    for (const [x, y] of [[82, 80], [92, 68], [99, 55]]) g.circle(P(x), P(y), P(2)).fill({ color: blue, alpha: 0.8 });
  },
  // 솔로몬 heart — 8방향 빛살(길이 30/20 교대, 금) + 대칭 베지어 심장(자색)
  heart(g, P, gold, purple) {
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI / 4) * i;
      const len = i % 2 === 0 ? 30 : 20;
      g.moveTo(P(64 + Math.cos(a) * 24), P(66 + Math.sin(a) * 24)).lineTo(P(64 + Math.cos(a) * (24 + len)), P(66 + Math.sin(a) * (24 + len)));
    }
    g.stroke({ width: P(3), color: gold, cap: 'round' });
    g.moveTo(P(64), P(88)).bezierCurveTo(P(30), P(64), P(40), P(36), P(64), P(52)).bezierCurveTo(P(88), P(36), P(98), P(64), P(64), P(88)).fill(purple);
  },
  // 베드로 rock — 불규칙 육각 반석(은, 아래쪽 명도 −20%) + 윗면에서 위로 뻗는 빛줄기 3개(청색 짙은 → 투명)
  rock(g, P, silver, blueDeep) {
    for (const [x, w] of [[52, 5], [64, 6], [76, 5]]) {
      for (let s = 0; s < 4; s += 1) g.poly([P(x - w / 2), P(56 - s * 8), P(x + w / 2), P(56 - s * 8), P(x + w / 2), P(48 - s * 8), P(x - w / 2), P(48 - s * 8)]).fill({ color: blueDeep, alpha: 0.85 - s * 0.2 });
    }
    g.poly([P(34), P(88), P(42), P(62), P(60), P(54), P(86), P(58), P(96), P(80), P(80), P(96), P(48), P(98)]).fill(silver);
    g.poly([P(36), P(84), P(96), P(80), P(80), P(96), P(48), P(98)]).fill(shadeColor(silver, -0.2));
  },
  // 바울 chains — 사슬 고리 4개(타원 22×14, 외곽선 5)가 가운데에서 끊김(불꽃 점 2곳) + 아래쪽 지진 균열(꺾은선 3마디)
  chains(g, P, scarlet, gold) {
    for (const x of [30, 48, 80, 98]) g.ellipse(P(x), P(60), P(11), P(7)).stroke({ width: P(5), color: scarlet });
    for (const x of [60, 68]) g.circle(P(x), P(60), P(3)).fill(gold);
    g.moveTo(P(44), P(96)).lineTo(P(56), P(88)).lineTo(P(66), P(100)).lineTo(P(80), P(92)).stroke({ width: P(2), color: gold });
  },
};

let sharedRenderer = null;
const canvasCache = new Map();

async function getRenderer() {
  if (!sharedRenderer) sharedRenderer = autoDetectRenderer({ width: EMBLEM.base, height: EMBLEM.base, backgroundAlpha: 0, antialias: true, preference: 'webgl' });
  try {
    return await sharedRenderer;
  } catch (err) {
    sharedRenderer = null;
    throw err;
  }
}

function copyCanvas(src, sizePx, doc) {
  const out = doc.createElement('canvas');
  out.width = sizePx;
  out.height = sizePx;
  out.getContext('2d').drawImage(src, 0, 0, sizePx, sizePx);
  return out;
}

// FR-013 · devguide §7.9 SCR-003·004·006·007 DOM용 엠블럼 캔버스 (role="img" + aria-label — design-vision §6.1). 실패 시 빈 캔버스 + 라벨
export async function renderEmblemCanvas(heroId, sizePx) {
  const doc = globalThis.document;
  const hero = heroesById.get(heroId);
  const size = Math.max(8, Math.round(sizePx));
  const key = `${heroId}@${size}`;
  let src = canvasCache.get(key);
  if (!src && hero) {
    try {
      const renderer = await getRenderer();
      const g = drawEmblem(new Graphics(), heroId, size);
      const resolution = Math.min(globalThis.devicePixelRatio || 1, 2);
      src = renderer.extract.canvas({ target: g, frame: new Rectangle(0, 0, size, size), resolution });
      g.destroy();
      canvasCache.set(key, src);
    } catch (err) {
      console.error('[emblems] 엠블럼 렌더 실패 — 빈 캔버스로 대체', err);
    }
  }
  const out = src ? copyCanvas(src, size, doc) : Object.assign(doc.createElement('canvas'), { width: size, height: size });
  out.setAttribute('role', 'img');
  out.setAttribute('aria-label', hero ? `${hero.nameKo} 엠블럼 — ${hero.skill.nameKo}` : '엠블럼');
  return out;
}

// FR-014~017 EVT-29 위인 스킬 — 엠블럼이 대상 보드 위에 1.0→1.2배 800ms + 위인별 고유 연출(베드로 반석 띠·바울 지진 사슬 불꽃). 다윗 돌은 projectiles
export function playHeroArt(rt, heroId, target) {
  const view = rt.boardOf(target);
  if (!view || !heroesById.has(heroId)) return;
  const b = view.rect();
  const size = Math.round(b.width * EMBLEM.sizeOnBoard);
  const c = new Container();
  drawEmblem(c.addChild(new Graphics()), heroId, size);
  c.pivot.set(size / 2, size / 2);
  c.position.set(b.x + b.width / 2, b.y + b.height * 0.35);
  rt.fx.addChild(c);
  gsap.timeline({ onComplete: () => c.destroy({ children: true }) }).fromTo(c, { alpha: 0, scale: EMBLEM.popFrom }, { alpha: 1, scale: EMBLEM.popTo, duration: EMBLEM.popMs / 1000, ease: 'power2.out' })
    .to(c, { alpha: 0, duration: 0.3 });
  if (heroId === 'peter') {
    const band = new Graphics().rect(b.x, b.y + b.height - rt.layout().cellSize, b.width, rt.layout().cellSize).fill({ color: COLORS.blockSilver, alpha: 0.35 });
    rt.fx.addChild(band);
    gsap.to(band, { alpha: 0, delay: (EMBLEM.bandMs - 400) / 1000, duration: 0.4, onComplete: () => band.destroy() });
  } else if (heroId === 'paul') {
    const cell = view.cell;
    for (let i = 0; i < EMBLEM.quakeRows; i += 1) {
      gsap.delayedCall((i * EMBLEM.quakeRowMs) / 1000, () => burst(rt.particles, { x: b.x + b.width / 2, y: b.y + b.height - (i + 0.5) * cell, width: b.width, count: 14,
        color: i === 0 ? COLORS.lightGold : COLORS.cellGarbage, speed: 120, lifeMs: 500, gravity: 600, size: 0.45, texture: rt.shardTexture }));
    }
  }
}
