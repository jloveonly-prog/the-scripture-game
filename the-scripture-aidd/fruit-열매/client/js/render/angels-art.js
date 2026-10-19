// TASK-040-3 · FR-035 · FR-049 · C-007 · D-25 — 천사 5종(미가엘·가브리엘·그룹·스랍·섬기는 영들) 빛·날개·불꽃 코드 그리기 + 소환 고유 연출 (design-vision §2.10·§4.8).
// 그룹의 네 얼굴은 이목구비 없이 측면 윤곽선만. 효과 판정은 서버 — 여기서는 effect 수신 후 보이는 것만 그린다 (D-01).
import { Container, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { angelsById } from '../content/content-loader.js';
import { COLORS } from './piece-skin.js';
import { burst } from '../fx/particle-pool.js';

/** design-vision §2.10·§4.8 천사 연출 수치 */
const ANGEL = Object.freeze({ popFrom: 1, popTo: 1.2, popMs: 800, artMs: 1500, ministerMs: 1200, swordRatio: 0.4, feathers: 7,
  wheelDots: 12, coalPx: 14, orbs: 12, orbMin: 6, orbMax: 10, burnCells: 2 });

/** 깃털 n개로 된 날개 한 장 (dir −1 왼쪽 / 1 오른쪽) */
function featherWing(g, x, y, len, dir, spreadRad = 1.1, startRad = -0.9) {
  for (let i = 0; i < ANGEL.feathers; i += 1) {
    const a = startRad + (spreadRad * i) / (ANGEL.feathers - 1);
    const fl = len * (1 - i * 0.07);
    const ex = x + dir * Math.cos(a) * fl;
    const ey = y + Math.sin(a) * fl;
    g.moveTo(x, y).quadraticCurveTo((x + ex) / 2 + dir * 4, (y + ey) / 2 - 6, ex, ey).stroke({ width: 3, color: COLORS.angelHalo, alpha: 0.85, cap: 'round' });
  }
}

/** 측면 윤곽(사람·사자·소·독수리)을 꺾은선으로 — 이목구비 없음 */
const FACE_PROFILES = [
  [[0, -1], [0.5, -0.8], [0.6, -0.2], [0.8, 0], [0.5, 0.3], [0.4, 0.9]],
  [[0, -1], [0.7, -0.9], [0.9, -0.3], [1, 0.1], [0.7, 0.6], [0.3, 1]],
  [[0, -1], [0.4, -1.1], [0.6, -0.6], [1, -0.1], [0.9, 0.4], [0.3, 0.9]],
  [[0, -0.9], [0.6, -0.8], [0.9, -0.3], [1.1, 0.05], [0.6, 0.2], [0.3, 0.9]],
];

const ART = {
  // 미가엘 — 세로 곧은 검(흰 중심 + 후광 테두리) + 검 뒤 좌우 대칭 날개 2쌍
  sword_wings(g, s) {
    for (const dir of [-1, 1]) {
      featherWing(g, s / 2, s * 0.42, s * 0.42, dir);
      featherWing(g, s / 2, s * 0.55, s * 0.3, dir, 0.9, -0.2);
    }
    g.rect(s / 2 - 3, s * 0.1, 6, s * 0.75).fill(COLORS.angelCore).stroke({ width: 1.5, color: COLORS.angelHalo });
    g.rect(s / 2 - s * 0.1, s * 0.62, s * 0.2, 5).fill(COLORS.angelHalo);
  },
  // 가브리엘 — 넓게 펼친 날개 1쌍 + 날개 사이 세로 빛 띠
  herald_wings(g, s) {
    for (const dir of [-1, 1]) featherWing(g, s / 2, s * 0.45, s * 0.48, dir, 1.4, -1.0);
    g.rect(s / 2 - 4, s * 0.1, 8, s * 0.8).fill({ color: COLORS.angelCore, alpha: 0.7 });
  },
  // 그룹 — 네 방향 얼굴 윤곽 4개 + 바퀴 안의 바퀴(교차 타원 2개, 빛 점 12개) + 불꽃
  four_faces_wheels(g, s) {
    const cx = s / 2;
    const cy = s * 0.32;
    FACE_PROFILES.forEach((pts, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const ox = cx + (i < 2 ? -1 : 1) * s * 0.12;
      const oy = cy + (i % 2) * s * 0.1;
      pts.forEach(([u, v], k) => (k === 0 ? g.moveTo(ox + dir * u * s * 0.1, oy + v * s * 0.1) : g.lineTo(ox + dir * u * s * 0.1, oy + v * s * 0.1)));
      g.stroke({ width: 2, color: COLORS.angelHalo });
    });
    const wy = s * 0.72;
    g.ellipse(cx, wy, s * 0.3, s * 0.12).stroke({ width: 2, color: COLORS.angelHalo }).ellipse(cx, wy, s * 0.12, s * 0.22).stroke({ width: 2, color: COLORS.angelHalo });
    for (let i = 0; i < ANGEL.wheelDots; i += 1) {
      const a = (Math.PI * 2 * i) / ANGEL.wheelDots;
      g.circle(cx + Math.cos(a) * s * 0.3, wy + Math.sin(a) * s * 0.12, 2).fill(COLORS.angelCore);
    }
    for (let i = 0; i < 5; i += 1) g.poly([cx - s * 0.2 + i * s * 0.1, s * 0.95, cx - s * 0.17 + i * s * 0.1, s * 0.84, cx - s * 0.14 + i * s * 0.1, s * 0.95]).fill(COLORS.seraphFire);
  },
  // 스랍 — 날개 6장(위 2장 얼굴 가림·가운데 2장 펼침·아래 2장 발 가림) + 숯불(지름 14, 맥동은 연출에서)
  six_wings_coal(g, s) {
    for (const dir of [-1, 1]) {
      featherWing(g, s / 2, s * 0.3, s * 0.22, dir, 0.8, -1.6);
      featherWing(g, s / 2, s * 0.48, s * 0.45, dir, 0.9, -0.5);
      featherWing(g, s / 2, s * 0.68, s * 0.22, dir, 0.8, 0.9);
    }
    g.ellipse(s / 2, s * 0.5, s * 0.06, s * 0.16).fill({ color: COLORS.angelCore, alpha: 0.9 });
    g.circle(s * 0.78, s * 0.5, ANGEL.coalPx / 2).fill(COLORS.seraphFire);
  },
  // 섬기는 영들 — 작은 빛 구슬 12개(지름 6~10)
  small_lights(g, s) {
    for (let i = 0; i < ANGEL.orbs; i += 1) {
      const a = (Math.PI * 2 * i) / ANGEL.orbs;
      g.circle(s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3, (ANGEL.orbMin + (i % 3) * 2) / 2).fill(COLORS.angelCore);
    }
  },
};

// FR-049 천사 그림 (s×s 상자)
export function drawAngel(g, angelId, s) {
  const draw = ART[angelsById.get(angelId)?.art?.motif];
  if (!draw) throw new RangeError(`angels-art: 알 수 없는 천사 ${angelId}`);
  draw(g, s);
  return g;
}

// FR-035 EVT-29 천사 소환 — 그림이 대상 보드 위에 1.0→1.2배 800ms + 천사별 고유 연출
export function playAngel(rt, angelId, target) {
  const view = rt.boardOf(target);
  if (!view || !angelsById.has(angelId)) return;
  const b = view.rect();
  const s = angelId === 'michael' ? b.height * ANGEL.swordRatio * 1.3 : b.width * 0.8;
  const c = new Container();
  const art = c.addChild(drawAngel(new Graphics(), angelId, s));
  c.pivot.set(s / 2, s / 2);
  c.position.set(b.x + b.width / 2, b.y + b.height * 0.35);
  rt.fx.addChild(c);
  const ms = angelId === 'ministering_spirits' ? ANGEL.ministerMs : ANGEL.artMs;
  gsap.timeline({ onComplete: () => c.destroy({ children: true }) })
    .fromTo(c, { alpha: 0, scale: ANGEL.popFrom }, { alpha: 1, scale: ANGEL.popTo, duration: ANGEL.popMs / 1000, ease: 'power2.out' })
    .to(c, { alpha: 0, duration: Math.max(0.1, (ms - ANGEL.popMs) / 1000) });
  const cell = view.cell;
  if (angelId === 'gabriel') {
    for (let i = 0; i < 16; i += 1) rt.particles.spawn({ x: b.x + b.width / 2, y: b.y, vy: b.height / 0.8, lifeMs: 800, delayMs: i * 50, color: COLORS.angelCore, scale0: 0.4, scale1: 0.2 });
  } else if (angelId === 'cherubim') {
    const meter = rt.layout().meter;
    if (meter) burst(rt.particles, { x: meter.x + meter.width / 2, y: meter.y + meter.height - cell, height: cell * ANGEL.burnCells, count: 24, color: COLORS.seraphFire, speed: 120, lifeMs: 700, gravity: -200, size: 0.6 });
  } else if (angelId === 'seraphim') {
    const coal = new Graphics().circle(0, 0, ANGEL.coalPx / 2).fill(COLORS.seraphFire);
    coal.position.set(c.x + s * 0.28, c.y);
    rt.fx.addChild(coal);
    gsap.to(coal.scale, { x: 1.3, y: 1.3, duration: 0.2, yoyo: true, repeat: 3 });
    gsap.to(coal, { x: b.x + b.width / 2, y: b.y + b.height * 0.6, duration: 0.8, ease: 'power2.in', onComplete: () => {
      burst(rt.particles, { x: coal.x, y: coal.y, width: b.width * 0.6, count: 30, color: COLORS.seraphFire, speed: 180, lifeMs: 600, gravity: -100, size: 0.5 });
      coal.destroy();
    } });
  } else if (angelId === 'ministering_spirits') {
    art.visible = false;
    for (let i = 0; i < ANGEL.orbs; i += 1) {
      rt.particles.spawn({ x: b.x + b.width / 2 + Math.cos(i) * b.width * 0.3, y: b.y, toX: b.x + ((i + 0.5) / ANGEL.orbs) * b.width, toY: b.y + b.height - cell / 2,
        lifeMs: ANGEL.ministerMs * 0.8, delayMs: i * 30, color: COLORS.angelCore, alpha0: 1, alpha1: 0.6, scale0: (ANGEL.orbMin + (i % 3) * 2) / 16, scale1: 0.3 });
    }
  }
}
