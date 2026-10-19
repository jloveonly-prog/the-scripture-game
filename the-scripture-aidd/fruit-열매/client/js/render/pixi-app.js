// TASK-040-1 · FR-048 · NFR-001 · REQ-013 · D3-21 — 대전 장면: Pixi 앱·레이어·셀 크기 배치(design-vision §5.2)·프레임 루프. BattleScene 계약(devguide §7.9).
// CSP(`script-src 'self'`) 때문에 Pixi v8 공식 unsafe-eval 대체 모듈을 1회 import 한다 (devguide §3.3-7).
import 'pixi.js/unsafe-eval';
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { BoardView } from './board-view.js';
import { HudView } from './hud-view.js';
import { createSkinCache } from './piece-skin.js';
import { createParallax, getMountedBackground } from './background-parallax.js';
import { createParticlePool, poolSizeFor } from '../fx/particle-pool.js';
import { createHitstopClock } from '../fx/hitstop.js';
import { createScreenShake } from '../fx/screen-shake.js';

/** design-vision §5.1·§5.2 배치 수치 (위·아래 HUD 높이, 여백, 배율) */
const LAYOUT = Object.freeze({
  desktop: Object.freeze({ top: 56, reserve: 184, min: 20, max: 32 }),
  tablet: Object.freeze({ top: 48, reserve: 160, min: 16, max: 28 }),
  mobileLandscape: Object.freeze({ top: 48, reserve: 96, min: 12, max: 24 }),
  mobile: Object.freeze({ top: 44, sideHud: 56, reserve: 300, max: 30, miniCell: 7 }),
  tabletMinWidth: 768, desktopMinWidth: 1024, landscapeMaxHeight: 500, oppScale: 0.6, gap: 8, meter: 12, outer: 16,
  holdScale: 0.7, nextScale: 0.8, laneCells: 3, laneMin: 48, faithHeight: 12, resizeDebounceMs: 150,
});

const rect = (x, y, width, height) => ({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// FR-048 · design-vision §5.1 기기 구분 (높이 < 500 = 모바일 가로)
export function deviceClass(width, height) {
  if (height < LAYOUT.landscapeMaxHeight) return 'mobileLandscape';
  if (width >= LAYOUT.desktopMinWidth) return 'desktop';
  if (width >= LAYOUT.tabletMinWidth) return 'tablet';
  return 'mobile';
}

// FR-048 · design-vision §5.2 셀 크기 공식 — { cell, oppCell }
export function computeCellSizes(width, height) {
  const device = deviceClass(width, height);
  if (device === 'mobile') {
    const m = LAYOUT.mobile;
    const cell = Math.max(1, Math.min(m.max, Math.floor((width - m.sideHud) / 10), Math.floor((height - m.reserve) / 20)));
    return { device, cell, oppCell: m.miniCell };
  }
  const p = LAYOUT[device];
  const cell = clamp(Math.floor((height - p.reserve) / 20), p.min, p.max);
  return { device, cell, oppCell: Math.round(cell * LAYOUT.oppScale) };
}

// FR-048 · design-vision §3.5·§3.7·§5.2 대전 화면 배치 (stageHost 기준 CSS px). 연습은 상대 보드·레인 없음(null)
export function computeBattleLayout(width, height, mode) {
  const { device, cell, oppCell } = computeCellSizes(width, height);
  const practice = mode === 'practice';
  const g = LAYOUT.gap;
  const boardW = cell * 10;
  const boardH = cell * 20;
  const holdW = Math.round(cell * LAYOUT.holdScale * 4) + 24;
  const holdH = Math.round(cell * LAYOUT.holdScale * 2) + 24;
  const nextW = Math.round(cell * LAYOUT.nextScale * 4) + 24;
  if (device === 'mobile') {
    const m = LAYOUT.mobile;
    const miniY = m.top + g;
    const miniH = oppCell * 20;
    const boardY = miniY + miniH + g;
    const myBoard = rect((width - boardW) / 2, boardY, boardW, boardH);
    const opponentBoard = practice ? null : rect((width - oppCell * 10) / 2, miniY, oppCell * 10, miniH);
    const hold = rect(LAYOUT.outer, miniY, holdW, holdH);
    return {
      device, cellSize: cell, oppCellSize: practice ? null : oppCell, myBoard, opponentBoard,
      lane: practice ? null : rect(opponentBoard.x, miniY + miniH, opponentBoard.width, g),
      hold, next: rect(width - LAYOUT.outer - nextW, miniY, nextW, miniH),
      armor: rect(LAYOUT.outer, hold.y + hold.height + g, holdW, Math.max(0, miniH - holdH - g)),
      meter: rect(myBoard.x - LAYOUT.meter - 4, boardY, LAYOUT.meter, boardH),
      faith: rect(myBoard.x, boardY + boardH + g, boardW, LAYOUT.faithHeight),
    };
  }
  const top = LAYOUT[device].top + g;
  const lane = practice ? 0 : Math.max(LAYOUT.laneMin, cell * LAYOUT.laneCells);
  const oppW = practice ? 0 : oppCell * 10;
  const total = holdW + g + LAYOUT.meter + g + boardW + g + nextW + lane + oppW;
  const x0 = Math.max(LAYOUT.outer, (width - total) / 2);
  const hold = rect(x0, top, holdW, holdH);
  const myX = x0 + holdW + g + LAYOUT.meter + g;
  const myBoard = rect(myX, top, boardW, boardH);
  const next = rect(myX + boardW + g, top, nextW, Math.round(boardH * 0.75));
  const laneRect = practice ? null : rect(next.x + nextW, top, lane, boardH);
  return {
    device, cellSize: cell, oppCellSize: practice ? null : oppCell, myBoard,
    opponentBoard: practice ? null : rect(laneRect.x + lane, top, oppW, oppCell * 20),
    lane: laneRect, hold, next,
    armor: rect(x0, hold.y + hold.height + g, holdW, Math.round(holdW * (2 / 3))),
    meter: rect(myX - g - LAYOUT.meter, top, LAYOUT.meter, boardH),
    faith: rect(myX, top + boardH + g, boardW, LAYOUT.faithHeight),
  };
}

async function initApp(stageHost) {
  const base = { width: Math.max(1, stageHost.clientWidth), height: Math.max(1, stageHost.clientHeight), backgroundAlpha: 0,
    antialias: true, resolution: Math.min(globalThis.devicePixelRatio || 1, 2), autoDensity: true };
  for (const preference of ['webgl', 'canvas']) {
    const app = new Application();
    try {
      await app.init({ ...base, preference });
      return app;
    } catch (err) {
      console.error(`[render] ${preference} 초기화 실패`, err);
      try { app.destroy(true); } catch (destroyErr) { console.error('[render] 실패한 앱 정리 오류', destroyErr); }
    }
  }
  const error = new Error('RENDER_UNAVAILABLE');
  error.code = 'RENDER_UNAVAILABLE';
  throw error;
}

function shardTexture(doc) {
  const c = doc.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 8, 8);
  return Texture.from(c);
}

function dotTexture(doc) {
  const c = doc.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 16);
  return Texture.from(c);
}

// FR-048 · NFR-001 · devguide §7.9 BattleScene 생성 — WebGL 실패 시 Canvas 렌더러(필터 없음), 둘 다 실패하면 RENDER_UNAVAILABLE
export async function createBattleScene({ stageHost, overlayHost, mode, mySlot, players }) {
  const app = await initApp(stageHost);
  const canvas = app.canvas;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
  stageHost.appendChild(canvas);
  const filtersOn = app.renderer.name !== 'canvas';
  let layout = computeBattleLayout(app.screen.width, app.screen.height, mode);
  const isMobile = layout.device === 'mobile' || layout.device === 'mobileLandscape';
  const skin = createSkinCache();
  const shared = getMountedBackground();
  const ownBg = shared ? null : createParallax({ width: app.screen.width, height: app.screen.height, isMobile });
  const game = new Container();
  const fx = new Container();
  const screenFx = new Container();
  if (ownBg) app.stage.addChild(ownBg.container);
  app.stage.addChild(game, screenFx);
  const views = {
    me: new BoardView({ skin, cellSize: layout.cellSize, isMine: true, filtersOn }),
    opponent: layout.opponentBoard ? new BoardView({ skin, cellSize: layout.oppCellSize, isMine: false, filtersOn }) : null,
  };
  const hud = new HudView({ skin, mode });
  if (views.opponent) game.addChild(views.opponent.root);
  game.addChild(views.me.root, hud.root, fx);
  const dot = dotTexture(globalThis.document);
  const shard = shardTexture(globalThis.document);
  const particles = createParticlePool({ ...poolSizeFor(isMobile), createSprite: () => {
    const s = new Sprite(dot);
    s.anchor.set(0.5);
    fx.addChild(s);
    return s;
  } });
  const layoutCbs = new Set();
  const updaters = new Map();
  let updaterSeq = 0;
  const rt = { app, mode, mySlot, players, filtersOn, isMobile, stageHost, overlayHost, game, fx, screenFx, views, hud, skin,
    background: shared ?? ownBg, particles, dotTexture: dot, shardTexture: shard, hitstop: createHitstopClock(), shake: createScreenShake(),
    layout: () => layout, boardOf: (target) => (target === 'opponent' ? views.opponent : views.me),
    addUpdater(fn) { updaterSeq += 1; const id = `fx#${updaterSeq}`; updaters.set(id, fn); return () => updaters.delete(id); }, hooks: { comboEnd: new Set(), destroy: new Set() }, destroyed: false };

  function applyLayout() {
    layout = computeBattleLayout(app.screen.width, app.screen.height, mode);
    const stale = skin.retire();
    if (stale.length) app.ticker.addOnce(() => app.ticker.addOnce(() => stale.forEach((t) => t.destroy(true))));
    views.me.resize(layout.cellSize, layout.myBoard.x, layout.myBoard.y);
    if (views.opponent && layout.opponentBoard) views.opponent.resize(layout.oppCellSize, layout.opponentBoard.x, layout.opponentBoard.y);
    hud.setLayout(layout);
    ownBg?.resize(app.screen.width, app.screen.height);
    for (const cb of layoutCbs) {
      try { cb(scene.layout()); } catch (err) { console.error('[render] onLayout 처리기 오류', err); }
    }
  }
  applyLayout();

  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = Math.max(1, stageHost.clientWidth);
      const h = Math.max(1, stageHost.clientHeight);
      if (rt.destroyed || (w === app.screen.width && h === app.screen.height)) return;
      app.renderer.resize(w, h);
      applyLayout();
    }, LAYOUT.resizeDebounceMs);
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null;
  if (observer) observer.observe(stageHost);
  else globalThis.addEventListener('resize', onResize);

  const failed = new Set();
  const guard = (name, fn) => {
    if (failed.has(name)) return;
    try { fn(); } catch (err) {
      failed.add(name);
      console.error(`[render] 프레임 오류 — ${name} 연출 건너뜀`, err);
    }
  };
  app.ticker.add((ticker) => {
    const now = performance.now();
    const dt = ticker.deltaMS;
    guard('shake', () => { const o = rt.shake.sample(now); game.position.set(o.x, o.y); });
    guard('particles', () => particles.update(dt, rt.hitstop.isFrozen(now)));
    guard('boards', () => { views.me.update(now); views.opponent?.update(now); });
    guard('hud', () => hud.drawFaith(now));
    if (ownBg) guard('background', () => ownBg.update(dt, now));
    for (const [id, fn] of updaters) guard(id, () => fn(dt, now));
  });

  let lastCombo = 0;
  const scene = {
    // FR-006 내 보드 (컨트롤러가 매 프레임)
    renderMyBoard(state) { guard('renderMyBoard', () => views.me.render(state)); },
    // FR-006 상대 보드 (opponentState)
    renderOpponentBoard(state) { if (state && views.opponent) guard('renderOpponentBoard', () => views.opponent.render(state)); },
    // D4-15 Pixi HUD + 콤보 종료 감지(EVT-13 원복)
    updateHud(h) {
      guard('updateHud', () => {
        hud.update(h);
        const combo = h?.me?.combo ?? 0;
        if (lastCombo > 0 && combo === 0) for (const cb of rt.hooks.comboEnd) cb();
        lastCombo = combo;
      });
    },
    layout() {
      const { cellSize, myBoard, opponentBoard, lane, hold, next, armor, meter, faith } = layout;
      return { cellSize, myBoard, opponentBoard, lane, hold, next, armor, meter, faith };
    },
    onLayout(cb) { layoutCbs.add(cb); return () => layoutCbs.delete(cb); },
    destroy() {
      if (rt.destroyed) return;
      rt.destroyed = true;
      for (const cb of rt.hooks.destroy) {
        try { cb(); } catch (err) { console.error('[render] 파괴 처리기 오류', err); }
      }
      clearTimeout(resizeTimer);
      observer?.disconnect();
      if (!observer) globalThis.removeEventListener('resize', onResize);
      views.me.destroy();
      views.opponent?.destroy();
      hud.destroy();
      ownBg?.destroy();
      killTweensInTree(app.stage); // 광야 BUG-007: 연출(투사체·영·천사·엠블럼)이 남긴 트윈이 파괴된 객체를 매 프레임 건드리지 않게
      app.destroy(true, { children: true });
      skin.clear();
      dot.destroy(true);
      shard.destroy(true);
    },
  };
  Object.defineProperty(scene, '_rt', { value: rt, enumerable: false });
  return scene;
}

/** 표시 객체 트리 전체(자신·scale·filters·자식)의 GSAP 트윈을 대상별로 끝낸다 (배열 kill은 시작 전 트윈을 남긴다 — BUG-007) */
export function killTweensInTree(node, kill = (t) => gsap.killTweensOf(t)) {
  if (!node) return;
  try {
    kill(node);
    if (node.scale) kill(node.scale);
    for (const f of node.filters ?? []) kill(f);
    for (const child of node.children ?? []) killTweensInTree(child, kill);
  } catch (err) {
    console.error('[render] 트윈 정리 오류', err);
  }
}
