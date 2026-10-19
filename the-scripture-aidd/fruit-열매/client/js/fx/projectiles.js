// TASK-041-2 · FR-053 · FR-054 · FR-014 · FR-037 — 빛의 화살(공격 발사·받음)·전장 레인 가운데 상쇄 충돌·방패 차단·검 되돌림·다윗 물맷돌 (design-vision §4.6·§4.8).
// 화살 Graphics는 재사용한다 (D-26). 경로 = 2차 베지어 — 출발 보드 위 → 전장 레인(HUD-12) 위쪽 → 도착 보드 위.
import { Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { burst } from './particle-pool.js';
import { FLASHES } from './filters.js';
import { COLORS } from '../render/piece-skin.js';
import { scaleFlashAlpha } from './fx-intensity.js';

/** design-vision §4.6·§4.8 투사체 수치 */
export const PROJECTILE = Object.freeze({
  maxArrows: 6, flightMs: 450, arrowLen: 22, spreadPx: 10, offsetFlashDiameter: 80, offsetFlashAlpha: 0.9, offsetFlashMs: 220,
  offsetShards: 20, shieldMs: 400, reflectMs: 450, stoneMs: 900, stoneCellRatio: 0.8, stoneBreak: 3, breastplateMs: 300,
});

// FR-053 화살 수 = min(쓰레기, 6), 1줄 이상이면 최소 1개
export function arrowCount(garbage) {
  const g = Math.floor(Number(garbage) || 0);
  return g <= 0 ? 0 : Math.min(g, PROJECTILE.maxArrows);
}

// FR-053 2차 베지어 한 점
export function quadPoint(p0, p1, p2, t) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}

// FR-053 출발·도착 보드 위 가운데와 레인 제어점 (레인 없으면 두 점의 가운데 위쪽)
export function arrowPath(fromRect, toRect, lane) {
  const p0 = { x: fromRect.x + fromRect.width / 2, y: fromRect.y };
  const p2 = { x: toRect.x + toRect.width / 2, y: toRect.y };
  const cx = lane ? lane.x + lane.width / 2 : (p0.x + p2.x) / 2;
  const cy = Math.min(p0.y, p2.y) - Math.abs(p2.x - p0.x) * 0.25;
  return { p0, p1: { x: cx, y: cy }, p2 };
}

// FR-053 투사체 실행기
export function createProjectiles(rt, filterFx) {
  const free = [];
  const live = new Set();

  function takeArrow(color) {
    const g = free.pop() ?? new Graphics();
    g.clear();
    const L = PROJECTILE.arrowLen;
    for (let i = 0; i < 4; i += 1) g.rect(-L + (i * L) / 4, -1, L / 4, 2).fill({ color: COLORS.projectileTail, alpha: 0.25 + i * 0.2 });
    g.poly([0, -4, 8, 0, 0, 4]).fill(color);
    g.visible = true;
    g.alpha = 1;
    rt.fx.addChild(g);
    live.add(g);
    return g;
  }

  function dropArrow(g) {
    gsap.killTweensOf(g);
    g.visible = false;
    g.removeFromParent();
    live.delete(g);
    free.push(g);
  }

  /** 화살 n개를 경로 위 [t0, t1] 구간으로 날림 — onArrive(t1 지점) */
  function fly({ path, count, color, t0 = 0, t1 = 1, ms, ease = 'power2.in', onArrive }) {
    for (let i = 0; i < count; i += 1) {
      const g = takeArrow(color);
      const off = (i - (count - 1) / 2) * PROJECTILE.spreadPx;
      const prog = { t: t0 };
      const place = () => {
        const a = quadPoint(path.p0, path.p1, path.p2, prog.t);
        const b = quadPoint(path.p0, path.p1, path.p2, Math.min(1, prog.t + 0.02));
        g.position.set(a.x + off, a.y);
        g.rotation = Math.atan2(b.y - a.y, b.x - a.x);
      };
      place();
      gsap.to(prog, { t: t1, duration: ms / 1000, ease, onUpdate: place, onComplete: () => {
        dropArrow(g);
        if (i === 0 && onArrive) onArrive(quadPoint(path.p0, path.p1, path.p2, t1));
      } });
    }
  }

  const rectOf = (target) => rt.boardOf(target)?.rect() ?? null;
  const pathBetween = (from, to) => {
    const a = rectOf(from);
    const b = rectOf(to);
    return a && b ? arrowPath(a, b, rt.layout().lane) : null;
  };

  return {
    // FR-053 EVT-20 공격 발사 — 내 보드 → 상대 보드, 착탄 시 상대 보드 붉은 섬광
    attackSent(garbage) {
      const path = pathBetween('me', 'opponent');
      if (!path) return;
      fly({ path, count: arrowCount(garbage), color: COLORS.projectileHead, ms: PROJECTILE.flightMs,
        onArrive: () => filterFx.flash(rectOf('opponent'), FLASHES.red) });
    },
    // FR-053 EVT-21 공격 받음 — 상대 쪽 → 내 보드 붉은 화살, 착탄 시 onImpact (없으면 즉시)
    attackReceived(garbage, onImpact) {
      const path = pathBetween('opponent', 'me');
      if (!path) {
        onImpact?.();
        return;
      }
      fly({ path, count: arrowCount(garbage), color: COLORS.danger, ms: PROJECTILE.flightMs, onArrive: () => onImpact?.() });
    },
    // FR-053 EVT-22 상쇄 — 레인 가운데에서 충돌: 흰 원형 섬광(지름 80, 0.9→0, 220ms) + 파편 20개
    offset() {
      const path = pathBetween('me', 'opponent');
      if (!path) return;
      const half = (PROJECTILE.flightMs - PROJECTILE.offsetFlashMs) / 2;
      const back = { p0: path.p2, p1: path.p1, p2: path.p0 };
      fly({ path: back, count: 1, color: COLORS.danger, t1: 0.5, ms: half, ease: 'none' });
      fly({ path, count: 1, color: COLORS.projectileHead, t1: 0.5, ms: half, ease: 'none', onArrive: (p) => {
        const g = new Graphics().circle(p.x, p.y, PROJECTILE.offsetFlashDiameter / 2).fill(COLORS.lightWhite);
        g.alpha = scaleFlashAlpha(PROJECTILE.offsetFlashAlpha);
        rt.fx.addChild(g);
        gsap.to(g, { alpha: 0, duration: PROJECTILE.offsetFlashMs / 1000, ease: 'expo.out', onComplete: () => g.destroy() });
        burst(rt.particles, { x: p.x, y: p.y, count: PROJECTILE.offsetShards, color: COLORS.lightGoldBright, speed: 260, lifeMs: PROJECTILE.offsetFlashMs, gravity: 0, size: 0.4 });
      } });
    },
    // FR-037 EVT-24 방패 차단 — 화살이 보드 앞 금빛 반원(지름 = 보드 폭)에 부딪혀 흩어짐 400ms
    shieldBlock() {
      const path = pathBetween('opponent', 'me');
      const board = rectOf('me');
      if (!path || !board) return;
      fly({ path, count: 3, color: COLORS.danger, t1: 0.85, ms: PROJECTILE.shieldMs * 0.6, onArrive: (p) => {
        const g = new Graphics().arc(board.x + board.width / 2, board.y, board.width / 2, Math.PI, 0).stroke({ width: 4, color: COLORS.lightGold });
        rt.fx.addChild(g);
        gsap.to(g, { alpha: 0, duration: (PROJECTILE.shieldMs * 0.4) / 1000, onComplete: () => g.destroy() });
        burst(rt.particles, { x: p.x, y: p.y, count: 16, color: COLORS.lightGold, speed: 220, lifeMs: 300, gravity: 300, size: 0.4 });
      } });
    },
    // FR-037 EVT-25 성령의 검 되돌림 — side 보드 앞 곧은 검이 화살을 쳐서 반대로 날려 보냄 450ms
    reflect(side) {
      const other = side === 'me' ? 'opponent' : 'me';
      const path = pathBetween(other, side);
      const board = rectOf(side);
      if (!path || !board) return;
      const sword = new Graphics().rect(-2, -board.height * 0.2, 4, board.height * 0.4).fill(COLORS.angelCore).rect(-7, board.height * 0.12, 14, 3).fill(COLORS.angelHalo);
      sword.position.set(board.x + board.width / 2, board.y - board.height * 0.05);
      rt.fx.addChild(sword);
      gsap.to(sword, { alpha: 0, delay: (PROJECTILE.reflectMs * 0.6) / 1000, duration: (PROJECTILE.reflectMs * 0.4) / 1000, onComplete: () => sword.destroy() });
      const half = PROJECTILE.reflectMs / 2;
      fly({ path, count: 1, color: COLORS.danger, ms: half, t1: 0.9, onArrive: () => {
        gsap.fromTo(sword, { rotation: -0.5 }, { rotation: 0.4, duration: 0.12 });
        fly({ path: { p0: path.p2, p1: path.p1, p2: path.p0 }, t0: 0.1, count: 1, color: COLORS.projectileHead, ms: half, ease: 'power2.out' });
      } });
    },
    // FR-037 EVT-26 흉배 경감 — 착탄 순간 흉배형 빛판 0.3초
    breastplate() {
      const board = rectOf('me');
      if (!board) return;
      const g = new Graphics().roundRect(board.x + board.width * 0.25, board.y + board.height * 0.4, board.width * 0.5, board.height * 0.25, 6).fill(COLORS.angelHalo);
      g.alpha = scaleFlashAlpha(0.6);
      rt.fx.addChild(g);
      gsap.to(g, { alpha: 0, duration: PROJECTILE.breastplateMs / 1000, onComplete: () => g.destroy() });
    },
    // FR-014 EVT-29 다윗 물맷돌 — 원호를 그리며 대상 보드 가장 높은 열 꼭대기로, 블록 3개 깨짐. 빈 보드면 우물에 떨어져 사라짐, 연습은 허공
    stone(target, practice) {
      const fromRect = rectOf(target === 'me' ? 'opponent' : 'me') ?? rectOf('me');
      const view = practice ? null : rt.boardOf(target);
      if (!fromRect) return;
      const cell = rt.layout().cellSize;
      const hit = view?.highestCell() ?? null;
      const end = view ? (hit ? view.cellCenter(hit[0], hit[1]) : view.cellCenter(19, 4)) : { x: fromRect.x + fromRect.width + cell * 2, y: fromRect.y + fromRect.height * 0.3 };
      const start = { x: fromRect.x + fromRect.width / 2, y: fromRect.y };
      const ctrl = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - cell * 4 };
      const g = new Graphics().circle(0, 0, (cell * PROJECTILE.stoneCellRatio) / 2).fill(COLORS.blockBlueSky).circle(-cell * 0.12, -cell * 0.12, cell * 0.08).fill(COLORS.lightWhite);
      rt.fx.addChild(g);
      const prog = { t: 0 };
      gsap.to(prog, { t: 1, duration: (PROJECTILE.stoneMs * 0.6) / 1000, ease: 'power1.in', onUpdate: () => {
        const p = quadPoint(start, ctrl, end, prog.t);
        g.position.set(p.x, p.y);
      }, onComplete: () => {
        if (hit) burst(rt.particles, { x: end.x, y: end.y, count: 12 * PROJECTILE.stoneBreak, color: COLORS.blockSilver, speed: 260, lifeMs: 360, size: 0.5, texture: rt.shardTexture });
        gsap.to(g, { alpha: 0, y: g.y + (hit ? 0 : cell), duration: (PROJECTILE.stoneMs * 0.4) / 1000, onComplete: () => g.destroy() });
      } });
    },
    destroy() {
      for (const g of [...live]) dropArrow(g);
      for (const g of free) g.destroy();
      free.length = 0;
    },
  };
}
