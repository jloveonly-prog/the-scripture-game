// spirit-appear.js — 악한 영 등장 연출(실루엣·연기·비네트·사탄 변장·용 통과·메뚜기 갉음)만
// TASK-045 (D-03A 분할 — task-wall §3.4 #15-1, devguide L-18) | REQ-007 REQ-013 FR-027~FR-030 FR-049 FR-054 C-011 |
// ARCH-004 | TBL-013 | design-vision §2.8 z60·z90·§2.13.3·§4.6.4 공통 등장 연출·S-09·S-13·S-14
// 받는 쪽(API-021 attack target = 나, spiritApplied = true): 실루엣 1.2초 + 연기 + 비네트. 보낸 쪽: 상대 보드 위 축소 800ms.
import { FillGradient, Graphics } from "pixi.js";
import { buildShape } from "../art/to-pixi.js";
import { SPIRIT_SHAPES } from "../art/shapes-spirits.js";
import { ANGEL_SHAPES } from "../art/shapes-angels.js";
import { GLW } from "./filters.js";

/**
 * @param {{ pixi: any, particles: any, filters: any }} deps
 */
export function createSpiritAppear({ pixi, particles, filters }) {
  const layer = pixi.layers.spirit;
  /** @type {{ me: any, opp: any, screen: any }} */
  const ctx = { me: null, opp: null, screen: { x: 0, y: 0, width: 1280, height: 720 } };
  let reduced = false;
  let time = 0;
  const vignette = new Graphics();
  vignette.alpha = 0;
  pixi.layers.screenFx.addChild(vignette);
  const vig = { peakUntil: 0, holdTimed: false, activeTimed: false };

  /** @param {{ me: any, opp?: any, screen?: any }} t */
  function setTargets(t) {
    Object.assign(ctx, { me: t.me, opp: t.opp ?? null, screen: t.screen ?? ctx.screen });
    drawVignette();
  }

  /** ScreenFx(90) 비네트: 내 보드 둘레·화면 가장자리 radial 어둠 (#07060D, 중앙 투명 → 가장자리 0.7) */
  function drawVignette() {
    vignette.clear();
    if (!ctx.me) return;
    const b = ctx.me.rect();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const s = ctx.screen;
    const far = Math.max(...[[s.x, s.y], [s.x + s.width, s.y], [s.x, s.y + s.height], [s.x + s.width, s.y + s.height]]
      .map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const grad = new FillGradient({
      type: "radial", center: { x: cx, y: cy }, innerRadius: 0, outerCenter: { x: cx, y: cy }, outerRadius: far,
      textureSpace: "global",
      colorStops: [{ offset: 0, color: "rgba(7,6,13,0)" }, { offset: (b.width / 2) / far, color: "rgba(7,6,13,0)" },
        { offset: 1, color: "rgba(7,6,13,0.7)" }],
    });
    vignette.rect(s.x, s.y, s.width, s.height).fill(grad);
  }

  /** 실루엣 그래픽 (§2.13.3) — 사탄은 천사 날개 모양 재색칠 @param {string} id @param {number} width @param {string} [variant] */
  function silhouette(id, width, variant) {
    const shape = SPIRIT_SHAPES[id];
    if (!shape) return null;
    if (shape.ref) return buildShape(ANGEL_SHAPES[shape.ref], width, { recolor: shape[variant ?? "disguise"] });
    return buildShape(shape, width);
  }

  /**
   * §4.6.4 공통 등장 연출 (받는 쪽 side = "me", 보낸 쪽 축소판 side = "opp" — 800ms).
   * @param {string} spiritId
   * @param {{ side: "me" | "opp", applied?: boolean, timed?: boolean, durationMs?: number, disguiseMs?: number }} o
   *   applied = attack.spiritApplied (false면 그래픽 없음 — 자막만, DOM), timed = 시간형(duration > 0),
   *   durationMs = attack.duration, disguiseMs = spirits.json params.disguiseMs (S-13)
   */
  function appear(spiritId, o) {
    const board = o.side === "me" ? ctx.me : ctx.opp;
    if (!board || o.applied === false) return;
    const b = board.rect();
    const me = o.side === "me";
    // S-14 용: 보드 위 실루엣 대신 두 보드 뒤를 가로지르는 거대한 몸통 (받는 쪽)
    if (spiritId === "dragon" && me) return dragonPass(o);
    if (spiritId === "satan_angel_of_light" && me) return satanSequence(b, o);
    const sil = silhouette(spiritId, b.width);
    if (!sil) return;
    const h = b.width; // buildShape = 긴 변 기준 정사각 상자
    // 실루엣: 보드 위쪽에서 투명도 0→0.85 300ms, 1,200ms 유지, 연기로 흩어짐 600ms (보낸 쪽: 축소 800ms)
    const [inMs, holdMs, outMs] = me ? [300, 1200, 600] : [150, 400, 250];
    const drop = me && !reduced ? 12 : 0; // 감소 모드: 제자리 페이드
    sil.position.set(b.x, b.y - drop);
    sil.alpha = 0;
    layer.addChild(sil);
    const glow = filters.glow(sil, GLW.evil);
    pixi.animate(inMs, (k) => { sil.alpha = 0.85 * k; sil.y = b.y - drop * (1 - k); }, { ease: "power2.out" });
    pixi.animate(outMs, (k) => { sil.alpha = 0.85 * (1 - k); }, {
      delayMs: inMs + holdMs, ease: "power2.in",
      onComplete: () => { glow?.release(); sil.destroy({ children: true }); },
    });
    pixi.animate(1, () => {
      particles.emit("PT-smoke", { x: b.x + b.width / 2, y: b.y + h * 0.4, area: { w: b.width * 0.8, h: h * 0.5 },
        count: me ? 30 : 10 });
    }, { delayMs: inMs + holdMs });
    if (!me) return;
    // 연기 PT-smoke 30 — 보드 아래 모서리 두 곳에서 위로
    particles.emit("PT-smoke", { x: b.x + 12, y: b.y + b.height - 10, count: 15 });
    particles.emit("PT-smoke", { x: b.x + b.width - 12, y: b.y + b.height - 10, count: 15 });
    // 비네트: 등장 300ms, 시간형은 효과 끝까지 0.45, 보드 상태형은 1,200ms 뒤 500ms 소멸
    vig.peakUntil = time + (o.timed ? 300 : 1500);
    vig.holdTimed = !!o.timed;
  }

  /**
   * S-13 0~disguiseMs: 천사 공통 연출과 같은 빛기둥·날개(색 #CFE3FF, 자막 없음) → 날개에 금 8개(150ms)
   * → RGBSplit 6px 200ms → 색 반전 #3B0F2E/#8E2A5A(120ms). 감소 모드: 색수차 없이 바로 반전.
   */
  function satanSequence(b, o) {
    const shape = SPIRIT_SHAPES.satan_angel_of_light;
    const at = o.disguiseMs ?? 1500;
    const size = 192;
    const top = ctx.screen.y;
    const pillar = new Graphics();
    const grad = new FillGradient({
      type: "linear", start: { x: -80, y: 0 }, end: { x: 80, y: 0 }, textureSpace: "global",
      colorStops: [{ offset: 0, color: "rgba(207,227,255,0)" }, { offset: 0.5, color: "#CFE3FF" },
        { offset: 1, color: "rgba(207,227,255,0)" }],
    });
    pillar.rect(-80, 0, 160, b.y + b.height * 0.5 - top).fill(grad);
    pillar.position.set(b.x + b.width / 2, top);
    pillar.scale.y = 0;
    const sil = silhouette("satan_angel_of_light", size, "disguise");
    // 천사 공통 연출(holy-fx pillar)과 같은 자리: 기둥 끝, 보드 위쪽에 걸침
    const cy = Math.max(b.y + size * 0.15, top + size / 2);
    sil.position.set(b.x + b.width / 2 - size / 2, cy - size / 2);
    sil.alpha = 0;
    const cracks = new Graphics();
    cracks.position.copyFrom(sil.position);
    layer.addChild(pillar, sil, cracks);
    pixi.animate(220, (k) => { pillar.scale.y = k; }, { ease: reduced ? "none" : "expo.out" });
    pixi.animate(300, (k) => { sil.alpha = k; });
    const kk = size / shape.box.w;
    pixi.animate(150, (t) => {
      cracks.clear();
      for (const [x0, y0, x1, y1] of shape.cracks) {
        cracks.moveTo(x0 * kk, y0 * kk).lineTo((x0 + (x1 - x0) * t) * kk, (y0 + (y1 - y0) * t) * kk);
      }
      cracks.stroke({ width: 2, color: 0x3b0f2e });
    }, { delayMs: Math.max(0, at - 270) });
    pixi.animate(1, () => {
      if (!reduced) filters.rgbSplit(sil, { red: [-6, 0], green: [0, 0], blue: [6, 0], durationMs: 200 });
      const inv = silhouette("satan_angel_of_light", size, "inverted");
      inv.position.copyFrom(sil.position);
      inv.alpha = 0;
      layer.addChild(inv);
      const glow = filters.glow(inv, GLW.evil);
      const flip = reduced ? 0 : 200;
      pixi.animate(120, (t) => { inv.alpha = 0.85 * t; sil.alpha = 1 - t; pillar.alpha = 1 - t; }, { delayMs: flip });
      pixi.animate(600, (t) => { inv.alpha = 0.85 * (1 - t); cracks.alpha = 1 - t; }, {
        delayMs: flip + 1200,
        onComplete: () => {
          glow?.release();
          for (const g of [inv, sil, pillar, cracks]) g.destroy({ children: true });
        },
      });
      particles.emit("PT-smoke", { x: b.x + b.width / 2, y: b.y, area: { w: size, h: size / 2 }, count: 30 });
    }, { delayMs: Math.max(0, at - 120) });
    vig.peakUntil = time + at + 300;
    vig.holdTimed = true;
  }

  /** S-14 용: 스테이지 밝기 1→0.4 300ms, 용 실루엣이 두 보드 뒤를 오른쪽→왼쪽 2,000ms sine.inOut */
  function dragonPass(o) {
    const s = ctx.screen;
    const dragon = buildShape(SPIRIT_SHAPES.dragon, 960);
    // buildShape 상자는 긴 변(960) 정사각 — 몸통(높이 300)이 보드 높이 가운데를 지나게 상자 가운데를 맞춤
    const y = (ctx.me ? ctx.me.rect().y + ctx.me.rect().height / 2 : s.y + s.height / 2) - 480;
    pixi.layers.background.addChild(dragon);
    if (reduced) {
      dragon.position.set(s.x + s.width / 2 - 480, y);
      dragon.alpha = 0;
      pixi.animate(600, (k) => { dragon.alpha = k; });
      pixi.animate(600, (k) => { dragon.alpha = 1 - k; }, { delayMs: 1600,
        onComplete: () => dragon.destroy({ children: true }) });
    } else {
      pixi.animate(2000, (k) => { dragon.position.set(s.x + s.width - (s.width + 960) * k, y); }, {
        ease: "sine.inOut", onComplete: () => dragon.destroy({ children: true }),
      });
    }
    const dim = filters.adjustment(pixi.screenRoot, { brightness: 1 });
    if (!dim) return;
    pixi.animate(300, (k) => { dim.filter.brightness = 1 - 0.6 * k; });
    pixi.animate(400, (k) => { dim.filter.brightness = 0.4 + 0.6 * k; }, {
      delayMs: o.durationMs ?? 4000, onComplete: () => dim.release(),
    });
  }

  /** S-09 아바돈: PT-locust 30이 목표 칸으로 600ms → 칸마다 PT-dust 8 (150ms씩 60ms 간격) @param {Array<[number, number]>} cells */
  function gnaw(cells) {
    if (!ctx.me || !cells.length) return;
    const b = ctx.me.rect();
    cells.forEach(([x, y], i) => {
      const target = ctx.me.cellCenter(x, y);
      particles.emit("PT-locust", { x: b.x + b.width / 2, y: b.y - 20, area: { w: b.width, h: 40 },
        count: Math.ceil(30 / cells.length), target, life: 600 });
      pixi.animate(1, () => particles.emit("PT-dust", { ...target, count: 8, color: 0x6a6480 }),
        { delayMs: 600 + i * 60 });
    });
  }

  /** @param {number} dtMs */
  function update(dtMs) {
    time += dtMs;
    // 비네트 0.7(등장) → 시간형 효과가 남아 있는 동안 0.45 → 0 (등장 300ms·소멸 500ms)
    const vt = time < vig.peakUntil ? 0.7 : vig.holdTimed && vig.activeTimed ? 0.45 : 0;
    vignette.alpha += (vt - vignette.alpha) * Math.min(1, dtMs / (vt > vignette.alpha ? 100 : 170));
  }

  return {
    setTargets, appear, gnaw, update,
    /** 시간형 저주가 남아 있는가 (curseView.chips) — 비네트 0.45 유지 @param {boolean} on */
    setTimedActive(on) {
      vig.activeTimed = on;
    },
    clearVignette() {
      vig.peakUntil = 0;
      vig.holdTimed = false;
    },
    /** @param {boolean} on */
    setReduced(on) {
      reduced = on;
    },
    destroy() {
      vignette.destroy();
    },
  };
}
