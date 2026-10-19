// holy-fx.js — HolyLayer(빛기둥·천사·위인 스킬 빛·예수님 실루엣) 생성·갱신·제거만
// TASK-045 | REQ-008 REQ-010 REQ-013 FR-014~FR-017 FR-035 FR-039 FR-049 FR-054 C-002 | ARCH-004 | TBL-011 TBL-012 |
// design-vision §2.4·§2.5 GLW-holy·§2.8 z80·§2.13.2·§2.13.5·§4.6.5·§4.6.7·§4.6.8 | RTM §5 DCL-007 ④
// C-002: 예수님 실루엣은 얼굴 없는 단색 빛(shapes-angels JESUS_LIGHT)뿐. HolyLayer는 흔들림 루트 밖(DCL-007 ④)이라 흔들리지 않고,
// 밝기 필터(screenRoot)도 닿지 않는다. 실루엣보다 위에 그리는 그래픽 0 — 같은 층의 빛 띠는 실루엣 아래에 넣는다.
// 이벤트 동안 isShielded(side) = true → 03-B는 그 보드로 오는 빛의 화살 연출을 그리지 않는다(§2.13.5 겹침 행).
import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { buildShape } from "../art/to-pixi.js";
import { ANGEL_SHAPES, JESUS_LIGHT } from "../art/shapes-angels.js";
import { EMBLEMS } from "../art/shapes-heroes-armor.js";
import { GLW } from "./filters.js";

const TAU = Math.PI * 2;

/** 빛기둥 단면 3겹 (RTM §5 DCL-009 ③ — design-vision §4.6.5): [반폭 배율, 최대 투명도, 색] — 바깥 번짐·몸체(--g-holy)·심 */
const BEAM_LAYERS = [[1.1, 0.16, "255,248,231"], [0.5, 0.5, "255,248,231"], [0.07, 0.9, "255,255,255"]];
/** §4.6.8 빛 띠 6px × 8줄 투명도 (가운데 최대 0.8) */
const BAND_ALPHA = [0.15, 0.4, 0.65, 0.8, 0.8, 0.65, 0.4, 0.15];
const BEAM_FADE = 0.4; // 아래쪽 이 비율 구간에서 투명으로 옅어짐
/** @type {Texture | null} 구운 빛기둥 텍스처 1장 (모든 기둥 공용 — 실시간 필터 0, NFR-001) */
let beamTexture = null;

/** --g-holy 단면 비율 [위치, 투명도 배율] — 가운데 → 35% 크림 → 70% 투명 (§2.1) */
const HOLY_STOPS = [[0, 0], [0.15, 0.35], [0.325, 0.8], [0.5, 1], [0.675, 0.8], [0.85, 0.35], [1, 0]];

/** 빛기둥 텍스처 굽기(1회) — 가로 = 3겹 단면(겹마다 --g-holy), 세로 = 아래 40% 옅어짐 */
function bakeBeam() {
  if (beamTexture) return beamTexture;
  const [W, H] = [128, 256];
  const cv = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = cv.getContext("2d");
  const half = W / 2 / BEAM_LAYERS[0][0]; // 몸체 반폭(px) — 바깥 번짐이 텍스처 가장자리에 닿음
  g.globalCompositeOperation = "lighter";
  for (const [k, a, rgb] of BEAM_LAYERS) {
    const grad = g.createLinearGradient(W / 2 - half * k, 0, W / 2 + half * k, 0);
    for (const [o, m] of HOLY_STOPS) grad.addColorStop(o, `rgba(${rgb},${a * m})`);
    g.fillStyle = grad;
    g.fillRect(W / 2 - half * k, 0, 2 * half * k, H);
  }
  g.globalCompositeOperation = "destination-in";
  const v = g.createLinearGradient(0, 0, 0, H);
  for (const [o, m] of [[0, 1], [1 - BEAM_FADE, 0.85], [1, 0]]) v.addColorStop(o, `rgba(0,0,0,${m})`);
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return (beamTexture = Texture.from(cv));
}

/** 빛기둥 컨테이너(scaleY 자람용) — 피벗 = 위 가운데 @param {number} w 몸체 폭 @param {number} h */
const beam = (w, h) => new Container({ label: "beam", children: [beamSprite(w, h)] });

/**
 * 몸체 폭 w(--g-holy 단면) + 바깥 번짐(폭 2.2w) + 흰 심 — 가산 혼합: 빛이 아래 그림에 더해져 블록·천사가 비친다.
 * @param {number} w @param {number} h
 */
function beamSprite(w, h) {
  const sp = new Sprite({ texture: bakeBeam(), anchor: { x: 0.5, y: 0 }, blendMode: "add" });
  sp.width = w * 2 * BEAM_LAYERS[0][0];
  sp.height = h;
  return sp;
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
      // 천사 그림 = GLW-holy의 Glow(바깥 빛), 엠블럼 = GLW-gold. 기둥은 구운 번짐이라 필터 0, 흰 날개에 Bloom을 걸면
      // 형태가 흰 덩어리로 뭉개진다 (RTM §5 DCL-009 ③)
      figGlow = filters.glow(figure, o.emblem ? GLW.gold : GLW.holy);
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
    // GodrayFilter는 필터 영역 전체(사각형)에 빛살 안개를 더하므로, 기둥 모양 알파 마스크로 한 줄기 빛 안에만 남긴다
    // (마스크 없으면 투명도 0에서도 회색 사각형 — RTM §5 DCL-009 ③)
    const shaftH = b.y + b.height * 0.25 - ctx.screen.y;
    const col = new Container({ label: "jesus:shaft" });
    const light = beamSprite(width, shaftH);
    const mask = beamSprite(width, shaftH);
    col.addChild(light, mask);
    col.mask = mask;
    col.position.set(b.x + b.width / 2, ctx.screen.y);
    col.alpha = 0;
    // 빛 띠 높이 48·최대 0.8 — 위아래 가장자리를 옅게(빛의 띠로 읽히게, 흰 막대 아님)
    const band = new Graphics();
    BAND_ALPHA.forEach((a, i) => band.rect(0, i * 6, b.width, 6).fill({ color: 0xfff8e7, alpha: a }));
    band.position.set(b.x, b.y);
    band.alpha = 0;
    const size = b.height * 0.9;
    const sil = buildShape(JESUS_LIGHT, size);
    sil.pivot.set(size / 2, size / 2);
    sil.position.set(b.x + b.width / 2, b.y + b.height / 2);
    // 그리는 순서: 기둥 → 빛 띠 → 실루엣(맨 위 — 실루엣에 닿는 그래픽 0)
    root.addChild(col, band, sil);
    const rays = filters.godray(light, { frozen: reduced });
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
