// holy-fx.js — HolyLayer(빛기둥·천사·위인 스킬 빛·예수님 실루엣) 생성·갱신·제거만
// TASK-045 | REQ-008 REQ-010 REQ-013 FR-014~FR-017 FR-035 FR-039 FR-049 FR-054 C-002 | ARCH-004 | TBL-011 TBL-012 |
// design-vision §2.4·§2.5 GLW-holy·§2.8 z80·§2.13.2·§2.13.5·§4.6.5·§4.6.7·§4.6.8 | RTM §5 DCL-007 ④
// C-002: 예수님 실루엣은 얼굴 없는 단색 빛(shapes-angels JESUS_LIGHT)뿐. HolyLayer는 흔들림 루트 밖(DCL-007 ④)이라 흔들리지 않고,
// 밝기 필터(screenRoot)도 닿지 않는다. 실루엣보다 위에 그리는 그래픽 0 — 같은 층의 빛 띠는 실루엣 아래에 넣는다.
// 이벤트 동안 isShielded(side) = true → 03-B는 그 보드로 오는 빛의 화살 연출을 그리지 않는다(§2.13.5 겹침 행).
import { Container, FillGradient, Graphics } from "pixi.js";
import { buildShape } from "../art/to-pixi.js";
import { ANGEL_SHAPES, JESUS_LIGHT } from "../art/shapes-angels.js";
import { EMBLEMS } from "../art/shapes-heroes-armor.js";
import { GLW } from "./filters.js";

const TAU = Math.PI * 2;

/**
 * 세로 빛기둥 — 가로 단면 = --g-holy (radial: #FFFFFF 0% → #FFF8E7 35% → 투명 70%, §2.1), 아래 끝 1/4은 보드 위로 옅어짐.
 * 피벗 = 위 가운데. @param {number} w @param {number} h
 */
function beam(w, h) {
  const c = new Container({ label: "beam" });
  const across = new FillGradient({
    type: "linear", start: { x: -w / 2, y: 0 }, end: { x: w / 2, y: 0 }, textureSpace: "global",
    colorStops: [{ offset: 0.15, color: "rgba(255,248,231,0)" }, { offset: 0.325, color: "#FFF8E7" },
      { offset: 0.5, color: "#FFFFFF" }, { offset: 0.675, color: "#FFF8E7" }, { offset: 0.85,
        color: "rgba(255,248,231,0)" }],
  });
  const body = h * 0.75;
  c.addChild(new Graphics().rect(-w / 2, 0, w, body).fill(across));
  const steps = 8;
  for (let i = 0; i < steps; i += 1) {
    const slice = new Graphics().rect(-w / 2, body + ((h - body) * i) / steps, w,
      (h - body) / steps + 0.5).fill(across);
    slice.alpha = 1 - (i + 1) / (steps + 1);
    c.addChild(slice);
  }
  return c;
}

/**
 * @param {{ pixi: any, particles: any, filters: any, background?: any }} deps background = P3 빛살 순간(§2.12)
 */
export function createHolyFx({ pixi, particles, filters, background }) {
  // HolyLayer 안에서도 예수님 빛이 항상 맨 위 — 이벤트 중 다른 빛기둥이 와도 실루엣 위에 그려지지 않는다 (C-002)
  const layer = new Container({ label: "holy:pillars" });
  const jesusLayer = new Container({ label: "holy:jesus" });
  pixi.layers.holy.addChild(layer, jesusLayer);
  /** @type {{ me: any, opp: any, screen: any }} */
  const ctx = { me: null, opp: null, screen: { x: 0, y: 0, width: 1280, height: 720 } };
  let reduced = false;
  /** @type {Set<(dt: number) => void>} */ const live = new Set();
  const shieldUntil = { me: 0, opp: 0 };
  let time = 0;

  /**
   * §4.6.5 천사 공통 · §4.6.7 위인 스킬 공통 빛기둥 — 화면 위 → 보드 위, scaleY 0→1 220ms expo.out, 600ms 유지, 500ms 소멸.
   * @param {{ side: "me" | "opp", angel?: string, emblem?: string }} o angel = angels.json `visual`, emblem =
   *   heroes.json
   *   `emblem` (폭: 천사 160 · 스킬 140 · 상대 화면 110)
   */
  function pillar(o) {
    const board = o.side === "me" ? ctx.me : ctx.opp;
    if (!board) return;
    const b = board.rect();
    const me = o.side === "me";
    const width = me ? (o.angel ? 160 : 140) : 110;
    const k = width / 160;
    const root = new Container({ label: "pillar" });
    // 화면 위 → 내 보드 위(보드 가운데 높이까지 내려앉으며 옅어짐)
    const col = beam(width, Math.max(40, b.y + b.height * 0.5 - ctx.screen.y));
    col.position.set(b.x + b.width / 2, ctx.screen.y);
    root.addChild(col);
    const glow = filters.holy(col);
    let figure = null;
    let tick = null;
    if (o.angel && ANGEL_SHAPES[o.angel]) {
      // §2.13.2 천사 그림(192 상자) 투명도 0→1 300ms, 기둥과 함께 소멸
      const size = 192 * k;
      figure = buildShape(ANGEL_SHAPES[o.angel], size);
      figure.pivot.set(size / 2, size / 2);
      figure.position.set(b.x + b.width / 2, Math.max(b.y + size * 0.15, ctx.screen.y + size / 2));
      tick = angelMotion(figure, o.angel, size);
    } else if (o.emblem && EMBLEMS[o.emblem]) {
      // §4.6.7 위인 엠블럼 96px이 기둥 안에서 빛남 (GLW-gold)
      const size = 96 * k;
      figure = buildShape(EMBLEMS[o.emblem], size);
      figure.pivot.set(size / 2, size / 2);
      figure.position.set(b.x + b.width / 2, Math.max(b.y + size * 0.3, ctx.screen.y + size / 2));
    }
    let figGlow = null;
    if (figure) {
      figure.alpha = 0;
      root.addChild(figure);
      figGlow = o.emblem ? filters.glow(figure, GLW.gold) : null;
    }
    layer.addChild(root);
    col.scale.y = reduced ? 1 : 0;
    col.alpha = reduced ? 0 : 1;
    // 감소 모드: 기둥이 자라는 대신 투명도 페이드
    pixi.animate(220, (t) => { if (reduced) col.alpha = t; else col.scale.y = t; }, { ease: "expo.out" });
    if (figure) pixi.animate(300, (t) => { figure.alpha = t; });
    if (tick) live.add(tick);
    particles.emit("PT-feather", { x: b.x + b.width / 2, y: b.y + 20, area: { w: width, h: 60 },
      count: o.angel ? 18 : 12 });
    if (me) background?.flashRays();
    pixi.animate(500, (t) => { root.alpha = 1 - t; }, {
      delayMs: 220 + 600, onComplete: () => {
        if (tick) live.delete(tick);
        glow?.release();
        figGlow?.release();
        root.destroy({ children: true });
      },
    });
  }

  /** §2.13.2 천사별 움직임 — 그룹 바퀴(바깥 시계·안쪽 반시계 1회전/초)·스랍 숯불(0.6초 깜빡임)·섬기는 영들(0.3회전/초 + 하강) */
  function angelMotion(figure, visual, size) {
    const find = (name) => figure.getChildByLabel(name, true);
    if (visual === "four_faces_wheels") {
      const outer = find("outer");
      const inner = find("inner");
      return (dt) => {
        if (outer) outer.rotation += (dt / 1000) * TAU;
        if (inner) inner.rotation -= (dt / 1000) * TAU;
        if (Math.random() < dt / 45) particles.emit("PT-ember", { x: figure.x, y: figure.y, area: { w: size * 0.7,
          h: size * 0.7 }, count: 1, color: 0xff8a3d });
      };
    }
    if (visual === "six_wings") {
      const coal = find("coal");
      let t = 0;
      return (dt) => {
        t += dt;
        if (coal) coal.alpha = 0.9 + 0.1 * Math.sin((t / 600) * TAU);
        if (Math.random() < dt / 45) particles.emit("PT-ember", { x: figure.x, y: figure.y, area: { w: size,
          h: size * 0.6 }, count: 1 });
      };
    }
    if (visual === "small_lights") {
      const orbit = find("orbit");
      return (dt) => {
        if (orbit) orbit.rotation += (dt / 1000) * 0.3 * TAU;
        figure.y += (dt / 1000) * 40;
      };
    }
    return null;
  }

  /** G-01 미가엘 canceled: 빛의 검 흰 선(두께 6, 길이 보드 폭 + 40)이 보드를 가로로 벰 120ms expo.out @param {"me" | "opp"} side */
  function slash(side) {
    const board = side === "me" ? ctx.me : ctx.opp;
    if (!board) return;
    const b = board.rect();
    const g = new Graphics().rect(0, -3, b.width + 40, 6).fill(0xffffff);
    g.position.set(b.x - 20, b.y + b.height * 0.45);
    g.scale.x = 0;
    layer.addChild(g);
    pixi.animate(120, (t) => { g.scale.x = t; }, { ease: "expo.out" });
    pixi.animate(300, (t) => { g.alpha = 1 - t; }, { delayMs: 200, onComplete: () => g.destroy() });
  }

  /**
   * §4.6.8 예수님 "세상을 이기었노라" (effect source=jesus, by = null) — 전체 3,900ms, 게임은 멈추지 않는다.
   * 상대 화면(side = "opp"): 같은 빛기둥·실루엣을 상대 보드 크기로 투명도 0.45, 2,400ms, 밝기는 낮추지 않는다.
   * @param {{ side: "me" | "opp", garbageRows?: number[] }} o garbageRows = 빛 입자로 올라갈 쓰레기 줄 y(보드 칸)
   */
  function jesus(o) {
    const board = o.side === "me" ? ctx.me : ctx.opp;
    if (!board) return;
    const me = o.side === "me";
    const b = board.rect();
    const total = me ? 3900 : 2400;
    shieldUntil[o.side] = time + total;
    const root = new Container({ label: "jesus" });
    jesusLayer.addChild(root);
    // 0~300ms 스테이지(HolyLayer 제외 = screenRoot) 밝기 1→0.25 (감소 모드 0.5까지만)
    let dim = null;
    if (me) {
      dim = filters.adjustment(pixi.screenRoot, { brightness: 1 });
      const low = reduced ? 0.5 : 0.25;
      if (dim) pixi.animate(300, (t) => { dim.filter.brightness = 1 - (1 - low) * t; }, { ease: "sine.inOut" });
    }
    // 300~900ms 폭 220 세로 빛기둥 + GodrayFilter(HolyLayer 안) · 실루엣 투명도 0→0.55
    // 화면 위 가운데에서 내려오는 한 줄기 빛 — 보드 위쪽 1/4에서 옅어져 실루엣(최대 0.55) 아래 블록이 보이게
    const width = 220 * (b.width / (ctx.me ? ctx.me.rect().width : b.width));
    const col = beam(width, b.y + b.height * 0.25 - ctx.screen.y);
    col.position.set(b.x + b.width / 2, ctx.screen.y);
    col.alpha = 0;
    const band = new Graphics().rect(0, 0, b.width, 48).fill({ color: 0xfff8e7, alpha: 0.8 });
    band.position.set(b.x, b.y);
    band.alpha = 0;
    const size = b.height * 0.9;
    const sil = buildShape(JESUS_LIGHT, size);
    sil.pivot.set(size / 2, size / 2);
    sil.position.set(b.x + b.width / 2, b.y + b.height / 2);
    // 그리는 순서: 기둥 → 빛 띠 → 실루엣(맨 위 — 실루엣에 닿는 그래픽 0)
    root.addChild(col, band, sil);
    const rays = filters.godray(col, { frozen: reduced });
    const bloom = filters.holy(sil, 2.0); // §2.13.5 AdvancedBloomFilter bloomScale 2.0
    // §2.13.5 최대 투명도 0.55(상대 화면 0.45) — 번짐 뒤에 거는 AlphaFilter라 Bloom 결과까지 이 값 안 (블록이 보이게)
    const peak = me ? 0.55 : 0.45;
    const fade = filters.postAlpha(sil, 0);
    // 빛은 더해진다 — 마지막 필터 패스를 가산 혼합으로 합성해 회색 덧칠이 아닌 역광 빛으로 (블록은 그대로 보임)
    if (fade) fade.filter.blendMode = "add";
    const setSil = (a) => { if (fade) fade.filter.alpha = a; else sil.alpha = a; };
    pixi.animate(600, (t) => { col.alpha = 0.8 * t; setSil(peak * t); }, { delayMs: me ? 300 : 0 });
    if (me) {
      // 900~1,600ms 빛 띠(높이 48, #FFF8E7 0.8)가 보드 위→아래로 훑음 + 쓰레기 줄 절반이 PT-flake 24/줄로 올라감
      pixi.animate(700, (t) => { band.alpha = 1; band.y = b.y + (b.height - 48) * t; }, {
        delayMs: 900, ease: "none", onComplete: () => { band.alpha = 0; },
      });
      (o.garbageRows ?? []).forEach((row, i) => {
        pixi.animate(1, () => {
          const c = board.cellCenter(4.5, row);
          particles.emit("PT-flake", { x: c.x, y: c.y, area: { w: b.width, h: board.cell }, count: 24,
            target: { x: c.x, y: b.y - 60 } });
        }, { delayMs: 900 + i * 60 });
      });
    }
    // 3,300~3,900ms 실루엣·빛기둥 소멸, 밝기 1.0 복귀 (상대 화면: 2,400ms 안에서)
    const fadeAt = me ? 3300 : 1800;
    pixi.animate(600, (t) => {
      root.alpha = 1 - t;
      if (dim) dim.filter.brightness = (reduced ? 0.5 : 0.25) + (1 - (reduced ? 0.5 : 0.25)) * t;
    }, {
      delayMs: fadeAt, ease: "sine.inOut",
      onComplete: () => {
        rays?.release();
        bloom.release();
        fade?.release();
        dim?.release();
        root.destroy({ children: true });
      },
    });
  }

  return {
    pillar, slash, jesus,
    /** @param {{ me: any, opp?: any, screen?: any }} t layout 변경 시 */
    setTargets(t) {
      Object.assign(ctx, { me: t.me, opp: t.opp ?? null, screen: t.screen ?? ctx.screen });
    },
    /** §2.13.5 이벤트 동안 그 보드로 오는 빛의 화살 연출을 그리지 않는다 @param {"me" | "opp"} side */
    isShielded(side) {
      return time < shieldUntil[side];
    },
    /** @param {number} dtMs */
    update(dtMs) {
      time += dtMs;
      for (const fn of live) {
        try {
          fn(dtMs);
        } catch (err) {
          live.delete(fn);
          console.error("holy-fx 움직임 실패", err);
        }
      }
    },
    /** @param {boolean} on */
    setReduced(on) {
      reduced = on;
    },
    destroy() {
      live.clear();
      layer.destroy({ children: true });
      jesusLayer.destroy({ children: true });
    },
  };
}
