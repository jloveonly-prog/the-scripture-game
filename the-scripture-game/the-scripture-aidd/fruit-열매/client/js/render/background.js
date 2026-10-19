// background.js — 대전 시차 배경 4층 그리기·색조 전환만
// TASK-043 | REQ-013 FR-048 FR-053 FR-055 FR-061 | ARCH-004 | SCR-005 | design-vision §2.1·§2.12 | RTM §5 DCL-007 ②
// P0 하늘 · P1 먼 빛(PT-mote 80) · P2 구름 띠 · P3 빛살 · P4 가까운 빛(PT-mote 24). PT-mote는 이 층 전용 컨테이너(DCL-007 ②).
// 공격 받음·위기 → P0·P2가 붉은 어둠(--c-wrath #2A0A14 / #3A0F1E) 쪽으로 물듦. 콤보 → P1 밝기 고조(FR-061).
import { BlurFilter, ColorMatrixFilter, Container, FillGradient, Graphics, Particle, ParticleContainer, Rectangle,
  Sprite } from "pixi.js";

const SKY = ["#0B0A1F", "#15102E", "#1C1238"]; // --c-sky-top / mid(55%) / bottom
const WRATH = 0x2a0a14; // --c-wrath
const CLOUD = 0x2a2050;
const CLOUD_WRATH = 0x3a0f1e;
const TAU = Math.PI * 2;

const rnd = (a, b) => a + Math.random() * (b - a);
/** @param {number} a @param {number} b @param {number} t */
function mix(a, b, t) {
  const ch = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/**
 * @param {{ renderer: any, layer: Container, screen: { x: number, y: number, width: number, height: number } }} o
 *   screen = layout computeFit().screen (레터박스 여백까지 덮는 가상 좌표 사각형)
 */
export function createBackground({ renderer, layer, screen }) {
  let rect = { ...screen };
  const root = new Container({ label: "Parallax" });
  layer.addChild(root);

  // P0 하늘 — 세로 그라데이션 + ColorMatrixFilter 붉은 어둠
  const sky = new Graphics();
  const skyMatrix = new ColorMatrixFilter();
  sky.filters = [skyMatrix];

  // P1·P4 PT-mote — 전용 ParticleContainer (흰 점 텍스처 1장)
  const dotG = new Graphics().circle(4, 4, 4).fill(0xffffff);
  const dot = renderer.generateTexture({ target: dotG, frame: new Rectangle(0, 0, 8, 8), resolution: 2 });
  dotG.destroy();
  const motes = new ParticleContainer({ texture: dot, dynamicProperties: { position: true, color: true } });
  /** @type {any[]} */ const moteList = [];
  /** @param {number} n @param {[number, number]} px @param {number} vy @param {number} layerNo */
  const addMotes = (n, px, vy, layerNo) => {
    for (let i = 0; i < n; i += 1) {
      const p = new Particle({ texture: dot, anchorX: 0.5, anchorY: 0.5 });
      const s = rnd(px[0], px[1]) / 8;
      p.scaleX = s;
      p.scaleY = s;
      p.tint = 0xfff8e7;
      const m = { p, layerNo, vy, base: rnd(0.2, 0.6), phase: rnd(0, TAU), x0: rnd(0, 1), y: rnd(0, 1) };
      moteList.push(m);
      motes.addParticle(p);
    }
  };
  addMotes(80, [1, 2], 4, 1); // P1 먼 빛: 80개 1~2px, 위로 4px/s
  addMotes(24, [2, 3], 20, 4); // P4 가까운 빛: 24개 2~3px, 위로 20px/s

  // P2 구름 띠 — 흐린 타원 묶음 3장(가로 900~1400, 블러 24, 투명도 0.35), 두 겹 6px/s · 12px/s
  const cloudTex = [900, 1150, 1400].map((w) => {
    const g = new Graphics();
    for (let i = 0; i < 7; i += 1) g.ellipse(w * (0.1 + 0.8 * (i / 6)), 90 + rnd(-20, 20), rnd(110, 220), rnd(30, 55));
    g.fill(0xffffff);
    g.filters = [new BlurFilter({ strength: 24, quality: 4 })];
    const t = renderer.generateTexture({ target: g, frame: new Rectangle(-300, -100, w + 600, 380), resolution: 1 });
    g.destroy();
    return t;
  });
  const cloudLayers = [6, 12].map((speed, k) => {
    const c = new Container();
    const sprites = cloudTex.map((t, i) => {
      const s = new Sprite(t);
      s.alpha = 0.35;
      s.tint = CLOUD;
      s.position.set(i * 900 - 200 + k * 400, 120 + i * 160 + k * 220);
      c.addChild(s);
      return s;
    });
    return { c, speed, sprites };
  });

  // P3 빛살 — 위에서 비스듬히 내려오는 빛줄기 2개(폭 120, --g-holy 단면, 투명도 0.08), ±3° 진자 12초
  const rays = [0.3, 0.68].map((fx) => {
    const g = new Graphics();
    const grad = new FillGradient({
      type: "linear", start: { x: -60, y: 0 }, end: { x: 60, y: 0 }, textureSpace: "global",
      colorStops: [{ offset: 0, color: "rgba(255,248,231,0)" }, { offset: 0.35, color: "rgba(255,248,231,1)" },
        { offset: 0.5, color: "#FFFFFF" }, { offset: 0.65, color: "rgba(255,248,231,1)" },
        { offset: 1, color: "rgba(255,248,231,0)" }],
    });
    g.rect(-60, 0, 120, 1800).fill(grad);
    g.alpha = 0.08;
    g.pivot.set(0, 0);
    return { g, fx };
  });

  root.addChild(sky, ...cloudLayers.map((l) => l.c), ...rays.map((r) => r.g), motes);

  const state = { wrath: 0, wrathTarget: 0, glow: 0, glowTarget: 0, rayBoostMs: 0, time: 0, reduced: false,
    light: false };

  function drawSky() {
    sky.clear();
    const grad = new FillGradient({
      type: "linear", start: { x: 0, y: rect.y }, end: { x: 0, y: rect.y + rect.height }, textureSpace: "global",
      colorStops: [{ offset: 0, color: SKY[0] }, { offset: 0.55, color: SKY[1] }, { offset: 1, color: SKY[2] }],
    });
    sky.rect(rect.x, rect.y, rect.width, rect.height).fill(grad);
    rays.forEach((r) => r.g.position.set(rect.x + rect.width * r.fx, rect.y - 40));
  }
  drawSky();

  /** P0 ColorMatrix: 원색 × (1 − r) + --c-wrath × r */
  function applyWrath() {
    const r = state.wrath;
    const R = ((WRATH >> 16) & 255) / 255;
    const G = ((WRATH >> 8) & 255) / 255;
    const B = (WRATH & 255) / 255;
    skyMatrix.matrix = [1 - r, 0, 0, 0, R * r, 0, 1 - r, 0, 0, G * r, 0, 0, 1 - r, 0, B * r, 0, 0, 0, 1, 0];
    const cloudTint = mix(CLOUD, CLOUD_WRATH, Math.min(1, r / 0.8));
    for (const l of cloudLayers) for (const s of l.sprites) s.tint = cloudTint;
  }
  applyWrath();

  return {
    root,
    /** 레터박스 여백까지 덮도록 (layout onChange) @param {{ x: number, y: number, width: number, height: number }} s */
    resize(s) {
      rect = { ...s };
      drawSky();
    },
    /**
     * §2.12 P0 비율 = min(받을 공격 줄 수 / 8, 1) × 0.6 (위기 중 +0.2, 최대 0.8), 300ms 보간 — A-02·D-01
     * @param {{ pending: number, crisis: boolean }} p pending = status.pending (서버 원천)
     */
    setPressure({ pending, crisis }) {
      state.wrathTarget = Math.min(0.8, Math.min(Math.max(pending, 0) / 8, 1) * 0.6 + (crisis ? 0.2 : 0));
    },
    /** §2.12 P1 콤보 중 밝기 +5%/콤보 (최대 +30%) — FR-061 "배경 빛 고조", 끊기면 원래대로(C-09) @param {number} combo */
    setCombo(combo) {
      state.glowTarget = Math.min(0.3, Math.max(0, combo) * 0.05);
    },
    /** §2.12 P3 천사·스킬 순간 투명도 0.25로 0.5초 */
    flashRays() {
      state.rayBoostMs = 500;
    },
    /** §6.3 감소 모드: P4 정지(투명도만 맥동) @param {boolean} on */
    setReduced(on) {
      state.reduced = on;
    },
    /** §4.9 가벼운 그리기: P4 정지 @param {boolean} on */
    setLight(on) {
      state.light = on;
    },
    /** @param {number} dtMs Pixi 틱 */
    update(dtMs) {
      const dt = dtMs / 1000;
      state.time += dtMs;
      // 300ms 보간 (P0) · 콤보 끊김 600ms (C-09)
      const towards = (cur, target, ms) => cur + (target - cur) * Math.min(1, dtMs / ms);
      const prevWrath = state.wrath;
      state.wrath = towards(state.wrath, state.wrathTarget, 300);
      if (Math.abs(prevWrath - state.wrath) > 1e-4) applyWrath();
      state.glow = towards(state.glow, state.glowTarget, state.glowTarget < state.glow ? 600 : 200);
      for (const l of cloudLayers) {
        for (const s of l.sprites) {
          s.x -= l.speed * dt;
          if (s.x + s.width < rect.x) s.x = rect.x + rect.width + rnd(0, 200);
        }
      }
      const swing = (3 * Math.PI) / 180;
      rays.forEach((r, i) => {
        r.g.rotation = swing * Math.sin((state.time / 12000) * TAU + i * Math.PI) + 0.35 * (i ? -1 : 1);
      });
      state.rayBoostMs = Math.max(0, state.rayBoostMs - dtMs);
      for (const r of rays) r.g.alpha = state.rayBoostMs > 0 ? 0.25 : 0.08;
      const frozen4 = state.reduced || state.light;
      for (const m of moteList) {
        const moving = m.layerNo === 1 || !frozen4;
        if (moving) m.y -= (m.vy * dt) / rect.height;
        if (m.y < 0) m.y += 1;
        const sway = m.layerNo === 1 ? 6 * Math.sin(state.time / 1700 + m.phase) : 0;
        m.p.x = rect.x + m.x0 * rect.width + sway;
        m.p.y = rect.y + m.y * rect.height;
        const pulse = moving ? 1 : 0.6 + 0.4 * Math.sin(state.time / 900 + m.phase);
        m.p.alpha = Math.min(1, m.base * pulse * (m.layerNo === 1 ? 1 + state.glow : 1));
      }
    },
    destroy() {
      root.destroy({ children: true });
      dot.destroy(true);
      for (const t of cloudTex) t.destroy(true);
    },
  };
}
