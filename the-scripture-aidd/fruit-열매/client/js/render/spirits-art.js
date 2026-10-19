// TASK-040-3 · FR-049 · FR-027~030 · C-011 · C-007 — 악한 영 14종 실루엣·연기(반투명, 피·상처·신체 훼손 표현 없음) + 영별 보드 효과 연출 (design-vision §2.10·§4.7).
// 공통: --spirit-smoke 채움 0.55~0.7, 눈은 없거나 --spirit-ember 점 2개까지. 효과 판정은 서버·엔진 — 여기서는 보이는 것만 그린다.
import { Container, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { spiritsById } from '../content/content-loader.js';
import { COLORS } from './piece-skin.js';
import { burst } from '../fx/particle-pool.js';

/** design-vision §4.7 공통 등장·종료 수치 */
const SPIRIT = Object.freeze({ fadeInMs: 400, fadeOutMs: 400, smokeAlpha: 0.6, defaultHoldMs: 3000, maxHoldMs: 6000, sizeRatio: 0.7,
  smokeParticles: 24, flyCount: 120, crowdCount: 30, locusts: 8, locustMs: 900, dragonCrossMs: 1000, windEveryMs: 120 });

/** 결정적 의사난수 (실루엣 모양이 매번 같도록) */
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const smoke = (g, x, y, r, a = SPIRIT.smokeAlpha) => g.circle(x, y, r).fill({ color: COLORS.spiritSmoke, alpha: a });
const ember = (g, x, y, r) => g.circle(x, y, r).fill({ color: COLORS.spiritEmber, alpha: 0.8 });
const person = (g, x, y, s, a = SPIRIT.smokeAlpha) => {
  g.circle(x, y - s * 0.7, s * 0.28).fill({ color: COLORS.spiritSmoke, alpha: a });
  g.poly([x - s * 0.4, y + s, x - s * 0.25, y - s * 0.35, x + s * 0.25, y - s * 0.35, x + s * 0.4, y + s]).fill({ color: COLORS.spiritSmoke, alpha: a });
};
const wing = (g, x, y, w, dir, color = COLORS.spiritSmoke, a = SPIRIT.smokeAlpha) =>
  g.moveTo(x, y).bezierCurveTo(x + dir * w * 0.4, y - w * 0.6, x + dir * w, y - w * 0.4, x + dir * w, y + w * 0.1)
    .bezierCurveTo(x + dir * w * 0.6, y, x + dir * w * 0.3, y + w * 0.2, x, y).fill({ color, alpha: a });

const MOTIFS = {
  smoke_mass(g, w, h) { const r = lcg(1); for (let i = 0; i < 9; i += 1) smoke(g, w * (0.25 + r() * 0.5), h * (0.3 + r() * 0.4), w * (0.12 + r() * 0.1)); },
  covered_ears_mouth(g, w, h) {
    person(g, w / 2, h * 0.6, h * 0.4);
    g.ellipse(w / 2 - h * 0.13, h * 0.32, h * 0.06, h * 0.09).fill({ color: COLORS.spiritSmoke, alpha: 0.7 }).stroke({ width: 1, color: COLORS.spiritEmber, alpha: 0.5 });
    g.ellipse(w / 2, h * 0.4, h * 0.09, h * 0.05).fill({ color: COLORS.spiritSmoke, alpha: 0.7 }).stroke({ width: 1, color: COLORS.spiritEmber, alpha: 0.5 });
  },
  shadow_crowd(g, w, h) { const r = lcg(2); for (let i = 0; i < SPIRIT.crowdCount; i += 1) person(g, w * r(), h * (0.35 + r() * 0.5), h * 0.12, 0.55); },
  warped_mask(g, w, h) {
    g.moveTo(w * 0.3, h * 0.2).bezierCurveTo(w * 0.1, h * 0.5, w * 0.35, h * 0.9, w * 0.55, h * 0.8).bezierCurveTo(w * 0.85, h * 0.7, w * 0.8, h * 0.25, w * 0.3, h * 0.2)
      .fill({ color: COLORS.spiritSmoke, alpha: 0.65 }).stroke({ width: 2, color: COLORS.spiritEmber, alpha: 0.6 });
    ember(g, w * 0.4, h * 0.42, 3);
    ember(g, w * 0.62, h * 0.47, 3);
  },
  smoke_orb(g, w, h) { MOTIFS.smoke_mass(g, w, h); g.circle(w / 2, h / 2, w * 0.08).fill({ color: COLORS.lightWhite, alpha: 0.25 }); },
  fly_cloud(g, w, h) { const r = lcg(3); for (let i = 0; i < SPIRIT.flyCount; i += 1) g.circle(w * (0.1 + r() * 0.8), h * (0.15 + r() * 0.7), 1.5).fill({ color: COLORS.spiritSmoke, alpha: 0.85 }); },
  whirlwind_wings(g, w, h) {
    for (let i = 0; i < 4; i += 1) g.ellipse(w / 2, h * 0.55, w * (0.1 + i * 0.07), h * (0.04 + i * 0.03)).stroke({ width: 2, color: COLORS.spiritSmoke, alpha: 0.7 });
    wing(g, w / 2, h * 0.45, w * 0.45, -1);
    wing(g, w / 2, h * 0.45, w * 0.45, 1);
  },
  crowned_shadow(g, w, h) {
    person(g, w / 2, h * 0.75, h * 0.55, 0.65);
    g.poly([w * 0.38, h * 0.2, w * 0.42, h * 0.08, w * 0.47, h * 0.17, w * 0.5, h * 0.05, w * 0.53, h * 0.17, w * 0.58, h * 0.08, w * 0.62, h * 0.2])
      .fill({ color: COLORS.spiritSmoke, alpha: 0.75 }).stroke({ width: 1.5, color: COLORS.spiritEmber, alpha: 0.6 });
  },
  locust_king(g, w, h) {
    const r = lcg(4);
    for (let i = 0; i < 24; i += 1) g.ellipse(w * r(), h * (0.6 + r() * 0.35), 3, 1.5).fill({ color: COLORS.spiritSmoke, alpha: 0.8 });
    person(g, w / 2, h * 0.5, h * 0.3);
    wing(g, w / 2, h * 0.32, w * 0.3, -1);
    wing(g, w / 2, h * 0.32, w * 0.3, 1);
  },
  mirrored_woman(g, w, h) {
    for (const x of [w * 0.3, w * 0.7]) {
      g.circle(x, h * 0.25, h * 0.08).fill({ color: COLORS.spiritSmoke, alpha: 0.6 });
      g.poly([x - h * 0.2, h * 0.85, x - h * 0.06, h * 0.33, x + h * 0.06, h * 0.33, x + h * 0.2, h * 0.85]).fill({ color: COLORS.spiritSmoke, alpha: 0.6 });
    }
    g.moveTo(w / 2, h * 0.1).lineTo(w / 2, h * 0.9).stroke({ width: 1.5, color: COLORS.blockSilver, alpha: 0.6 });
  },
  ephah_lead(g, w, h) {
    g.poly([w * 0.3, h * 0.45, w * 0.7, h * 0.45, w * 0.62, h * 0.85, w * 0.38, h * 0.85]).fill({ color: COLORS.spiritSmoke, alpha: 0.65 });
    g.ellipse(w / 2, h * 0.42, w * 0.24, h * 0.07).fill({ color: COLORS.cellLead, alpha: 0.8 });
  },
  tilted_cup(g, w, h) {
    g.poly([w * 0.32, h * 0.3, w * 0.62, h * 0.18, w * 0.6, h * 0.5, w * 0.48, h * 0.56]).fill({ color: COLORS.spiritSmoke, alpha: 0.65 }).stroke({ width: 1.5, color: COLORS.spiritEmber, alpha: 0.5 });
    g.rect(w * 0.5, h * 0.55, w * 0.04, h * 0.2).fill({ color: COLORS.spiritSmoke, alpha: 0.65 });
    for (let i = 0; i < 3; i += 1) g.moveTo(w * 0.2, h * (0.8 + i * 0.05)).quadraticCurveTo(w * 0.5, h * (0.75 + i * 0.05), w * 0.8, h * (0.8 + i * 0.05));
    g.stroke({ width: 1.5, color: COLORS.spiritSmoke, alpha: 0.7 });
  },
  false_angel(g, w, h, phase = 'light') {
    const color = phase === 'light' ? COLORS.angelHalo : COLORS.spiritSmoke;
    const a = phase === 'light' ? 0.55 : 0.7;
    wing(g, w / 2, h * 0.45, w * 0.42, -1, color, a);
    wing(g, w / 2, h * 0.45, w * 0.42, 1, color, a);
    g.circle(w / 2, h * 0.3, h * 0.08).fill({ color, alpha: a });
    g.poly([w * 0.42, h * 0.85, w * 0.46, h * 0.4, w * 0.54, h * 0.4, w * 0.58, h * 0.85]).fill({ color, alpha: a });
  },
  red_dragon(g, w, h) {
    g.moveTo(0, h * 0.6).bezierCurveTo(w * 0.25, h * 0.2, w * 0.45, h * 0.9, w * 0.7, h * 0.45).quadraticCurveTo(w * 0.85, h * 0.3, w, h * 0.4)
      .stroke({ width: Math.max(6, h * 0.12), color: COLORS.spiritSmoke, alpha: 0.7, cap: 'round' })
      .moveTo(0, h * 0.6).bezierCurveTo(w * 0.25, h * 0.2, w * 0.45, h * 0.9, w * 0.7, h * 0.45).quadraticCurveTo(w * 0.85, h * 0.3, w, h * 0.4)
      .stroke({ width: 2, color: COLORS.spiritEmber, alpha: 0.9 });
    wing(g, w * 0.45, h * 0.5, w * 0.18, -1, COLORS.spiritSmoke, 0.6);
    ember(g, w * 0.97, h * 0.38, 2.5);
  },
};

// FR-049 실루엣 그리기 (w×h 상자, 왼쪽 위 원점)
export function drawSpirit(g, spiritId, w, h, phase) {
  const motif = spiritsById.get(spiritId)?.art?.motif;
  const draw = MOTIFS[motif];
  if (!draw) throw new RangeError(`spirits-art: 알 수 없는 영 ${spiritId}`);
  draw(g, w, h, phase);
  return g;
}

// FR-027~030 · FR-049 EVT-27 영 등장 — 실루엣 페이드 인 + 영별 보드 효과. 반환 = 종료 함수(EVT-28)
export function playSpiritEffect(rt, overlay, filterFx, { spiritId, target, durationMs = 0, params = {} }) {
  const view = rt.boardOf(target);
  if (!view || !spiritsById.has(spiritId)) return () => {};
  const b = view.rect();
  const holdMs = durationMs > 0 ? Math.min(durationMs, SPIRIT.maxHoldMs) : SPIRIT.defaultHoldMs;
  const cleanups = [];
  const sw = b.width * SPIRIT.sizeRatio;
  const sh = sw * 0.8;
  const sil = new Container();
  const art = sil.addChild(drawSpirit(new Graphics(), spiritId, sw, sh, 'light'));
  sil.position.set(b.x + (b.width - sw) / 2, b.y + b.height * 0.05);
  sil.alpha = 0;
  rt.fx.addChild(sil);
  gsap.to(sil, { alpha: 1, duration: SPIRIT.fadeInMs / 1000 });
  burst(rt.particles, { x: b.x + b.width / 2, y: b.y + b.height * 0.2, width: sw, count: SPIRIT.smokeParticles, color: COLORS.spiritSmoke, speed: 60, lifeMs: 900, gravity: -40, size: 1.4 });
  const until = (ms, fn) => { const call = gsap.delayedCall(ms / 1000, fn); cleanups.push(() => call.kill()); };
  const rect = (x, y, w, h) => ({ x, y, width: w, height: h });

  switch (spiritId) {
    case 'unclean_spirit': cleanups.push(overlay.darken(b, params.opacity ?? 0.3, durationMs).end); break;
    case 'legion': {
      const crowd = drawSpirit(new Graphics(), spiritId, b.width, b.height * (params.coverRatio ?? 0.4));
      const clip = new Graphics().rect(b.x, b.y, b.width, b.height).fill(COLORS.lightWhite);
      crowd.position.set(b.x - b.width, b.y + b.height * 0.3);
      crowd.mask = clip;
      rt.fx.addChild(clip, crowd);
      const drop = () => { if (!crowd.destroyed) { gsap.killTweensOf(crowd); crowd.destroy(); clip.destroy(); } };
      gsap.to(crowd, { x: b.x + b.width, duration: durationMs / 1000, ease: 'none', onComplete: drop });
      cleanups.push(drop);
      break;
    }
    case 'beelzebub': {
      const flies = drawSpirit(new Graphics(), spiritId, b.width, b.height * (params.coverRatio ?? 0.6));
      flies.position.set(b.x, b.y + b.height * 0.2);
      rt.fx.addChild(flies);
      const off = rt.addUpdater((dt, now) => { flies.x = b.x + Math.sin(now / 300) * 6; flies.y = b.y + b.height * 0.2 + Math.cos(now / 410) * 5; });
      cleanups.push(() => { off(); flies.destroy(); });
      until(durationMs, () => { off(); if (!flies.destroyed) flies.destroy(); });
      break;
    }
    case 'prince_of_the_air': {
      const dir = params.direction === 'left' || params.direction < 0 ? -1 : 1;
      let acc = 0;
      let push = 0;
      const off = rt.addUpdater((dt) => {
        acc += dt;
        push += dt;
        while (acc >= SPIRIT.windEveryMs) {
          acc -= SPIRIT.windEveryMs;
          rt.particles.spawn({ x: dir > 0 ? b.x : b.x + b.width, y: b.y + Math.random() * b.height, vx: dir * b.width * 1.5, lifeMs: 700,
            color: COLORS.textPrimary, alpha0: 0.35, alpha1: 0, scale0: 0.35, scale1: 0.35, texture: rt.shardTexture });
        }
        if (push >= (params.pushIntervalMs ?? 1000)) {
          push = 0;
          burst(rt.particles, { x: b.x + b.width / 2, y: b.y + b.height * 0.3, count: 8, color: COLORS.textPrimary, speed: 80, lifeMs: 400, gravity: 0, size: 0.35 });
        }
      });
      cleanups.push(off);
      until(durationMs, off);
      break;
    }
    case 'abaddon': {
      for (const col of params.columns ?? []) {
        const row = view.topRowOfColumn(col) ?? 0;
        const p = view.cellCenter(row, col);
        for (let i = 0; i < SPIRIT.locusts; i += 1) {
          rt.particles.spawn({ x: b.x + Math.random() * b.width, y: b.y - 10, toX: p.x, toY: p.y, lifeMs: SPIRIT.locustMs * 0.6, color: COLORS.spiritSmoke,
            alpha0: 0.9, alpha1: 0.9, scale0: 0.5, scale1: 0.5, delayMs: i * 20 });
        }
        gsap.delayedCall((SPIRIT.locustMs * 0.6) / 1000, () => burst(rt.particles, { x: p.x, y: p.y, count: 12, color: COLORS.cellGarbage, speed: 160, lifeMs: 360, size: 0.45, texture: rt.shardTexture }));
      }
      break;
    }
    case 'jezebel': {
      const mirror = new Graphics().rect(b.x - 5, b.y - 5, b.width + 10, b.height + 10).stroke({ width: 3, color: COLORS.blockSilver, alpha: 0.85 })
        .rect(b.x - 2, b.y - 2, b.width + 4, b.height + 4).stroke({ width: 1, color: COLORS.lightWhite, alpha: 0.5 });
      rt.fx.addChild(mirror);
      const end = () => { if (!mirror.destroyed) mirror.destroy(); };
      cleanups.push(end);
      until(durationMs, end);
      break;
    }
    case 'babylon': filterFx.babylon(view, durationMs); break;
    case 'angel_of_light': {
      const disguise = params.disguiseMs ?? 1500;
      until(disguise, () => {
        art.clear();
        drawSpirit(art, spiritId, sw, sh, 'dark');
        art.scale.x = -1;
        art.x = sw;
        cleanups.push(overlay.darken(b, params.curseOpacity ?? 0.3, Math.max(0, durationMs - disguise)).end);
      });
      break;
    }
    case 'dragon': {
      const dw = rt.app.screen.width * 0.6;
      const dragon = drawSpirit(new Graphics(), spiritId, dw, dw * 0.25);
      dragon.position.set(-dw, 8);
      rt.screenFx.addChild(dragon);
      gsap.to(dragon, { x: rt.app.screen.width, duration: SPIRIT.dragonCrossMs / 1000, ease: 'none', onComplete: () => dragon.destroy() });
      until(SPIRIT.dragonCrossMs, () => cleanups.push(overlay.darken(rect(b.x, b.y, b.width, b.height), params.opacity ?? 0.97, Math.max(0, durationMs - SPIRIT.dragonCrossMs)).end));
      break;
    }
    default: break;
  }

  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    for (const fn of cleanups.splice(0)) fn();
    if (sil.destroyed) return;
    gsap.killTweensOf(sil);
    gsap.to(sil, { alpha: 0, duration: SPIRIT.fadeOutMs / 1000, onComplete: () => { if (!sil.destroyed) sil.destroy({ children: true }); } });
  };
  gsap.delayedCall(holdMs / 1000, () => { if (!ended) gsap.to(sil, { alpha: 0, duration: SPIRIT.fadeOutMs / 1000, onComplete: () => { if (!sil.destroyed) sil.destroy({ children: true }); } }); });
  return end;
}
