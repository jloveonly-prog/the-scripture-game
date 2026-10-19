// TASK-040-2 · FR-048 · FR-061 · NFR-001 · WCAG 2.2.2 — 4층 시차 배경(남흑 하늘·하늘의 빛·구름·빛 입자) + 피격 색조·콤보 배경 빛.
// 메뉴 화면 공통 배경은 mountBackground(host)로 부팅 시 1회 (devguide §7.9). 대전 장면은 이 배경이 있으면 그 위에 투명하게 겹친다.
// prefers-reduced-motion: reduce 이면 정지 화면(입자 0, 구름 정지) — design-vision §6.2.
import 'pixi.js/unsafe-eval'; // CSP script-src 'self' — 메뉴 화면은 pixi-app보다 먼저 렌더러를 만든다 (여호수아 스모크, devguide §3.3-7)
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { gsap } from 'gsap';
import { COLORS, toCss } from './piece-skin.js';
import { prefersReducedMotion } from '../fx/fx-intensity.js';

/** design-vision §2.1·§4.5·§4.6 배경 수치 (입자 수·구름 수·속도는 장식 값 — 원문 미지정, 성능 예산 §4.12 안) */
const BG = Object.freeze({
  skyAlpha: 0.8, comboStep: 0.04, comboCap: 0.24, comboRevertMs: 600, cloudAlpha: 0.35, hitAlpha: 0.35, hitRestoreMs: 1200,
  particles: Object.freeze({ desktop: 60, mobile: 30 }), clouds: 5, cloudSpeed: 6, particleRise: 14, twinkleMs: 2400,
});

function skyTexture(doc, height) {
  const canvas = doc.createElement('canvas');
  canvas.width = 4;
  canvas.height = Math.max(2, Math.round(height));
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, toCss(COLORS.skyGlow, 1));
  grad.addColorStop(1, toCss(COLORS.bgAbyss, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return Texture.from(canvas);
}

// FR-048 시차 배경 4층 생성 (Pixi 컨테이너 — 대전 장면·메뉴 배경 공용)
export function createParallax({ width, height, reducedMotion = prefersReducedMotion(), isMobile = false, doc = globalThis.document, rand = Math.random }) {
  const container = new Container();
  const abyss = new Graphics();
  const sky = new Sprite();
  const clouds = new Container();
  const motes = new Container();
  const tint = new Graphics();
  container.addChild(abyss, sky, clouds, motes, tint);
  const light = { boost: 0 };
  const cloudList = [];
  const moteList = [];
  let W = width;
  let H = height;
  let skyTex = null;

  function build() {
    abyss.clear().rect(0, 0, W, H).fill(COLORS.bgAbyss);
    skyTex?.destroy(true);
    skyTex = skyTexture(doc, H * 0.7);
    sky.texture = skyTex;
    sky.width = W;
    sky.height = H * 0.7;
    tint.clear().rect(0, 0, W, H).fill(COLORS.hitTint);
    tint.alpha = 0;
    clouds.removeChildren().forEach((c) => c.destroy());
    cloudList.length = 0;
    for (let i = 0; i < BG.clouds; i += 1) {
      const g = new Graphics();
      const cw = W * (0.25 + rand() * 0.2);
      g.ellipse(0, 0, cw / 2, cw / 7).fill(COLORS.cloud).ellipse(cw * 0.18, -cw / 14, cw / 4, cw / 9).fill(COLORS.cloud);
      g.alpha = BG.cloudAlpha;
      g.position.set(rand() * W, H * (0.15 + rand() * 0.5));
      clouds.addChild(g);
      cloudList.push({ g, speed: BG.cloudSpeed * (0.5 + rand()) });
    }
    motes.removeChildren().forEach((m) => m.destroy());
    moteList.length = 0;
    const count = reducedMotion ? 0 : (isMobile ? BG.particles.mobile : BG.particles.desktop);
    for (let i = 0; i < count; i += 1) {
      const g = new Graphics().circle(0, 0, 1 + rand() * 1.5).fill(rand() < 0.5 ? COLORS.lightGoldBright : COLORS.lightWhite);
      g.position.set(rand() * W, rand() * H);
      motes.addChild(g);
      moteList.push({ g, speed: BG.particleRise * (0.5 + rand()), phase: rand() * BG.twinkleMs });
    }
    applyLight();
  }

  function applyLight() {
    sky.alpha = Math.min(1, BG.skyAlpha * (1 + light.boost));
  }

  build();
  return {
    container,
    resize(w, h) {
      W = w;
      H = h;
      build();
    },
    /** 매 프레임 — 감소된 움직임이면 정지 */
    update(dtMs, now) {
      if (reducedMotion) return;
      const dt = dtMs / 1000;
      for (const c of cloudList) {
        c.g.x += c.speed * dt;
        if (c.g.x - c.g.width / 2 > W) c.g.x = -c.g.width / 2;
      }
      for (const m of moteList) {
        m.g.y -= m.speed * dt;
        if (m.g.y < -4) m.g.y = H + 4;
        m.g.alpha = 0.35 + 0.65 * Math.abs(Math.sin(((now + m.phase) / BG.twinkleMs) * Math.PI));
      }
    },
    // FR-048 · EVT-21 공격 받음 — --hit-tint 35% 색조 → 1200ms 복원
    hitTint(strength = BG.hitAlpha) {
      gsap.killTweensOf(tint);
      tint.alpha = strength;
      gsap.to(tint, { alpha: 0, duration: BG.hitRestoreMs / 1000, ease: 'power2.out' });
    },
    // FR-061 · EVT-13 배경 빛 밝기 +4%/콤보(상한 +24%), 0이면 600ms에 원복
    setComboLight(combo) {
      const target = Math.min(Math.max(0, combo) * BG.comboStep, BG.comboCap);
      gsap.to(light, { boost: target, duration: combo > 0 ? 0.1 : BG.comboRevertMs / 1000, overwrite: true, onUpdate: applyLight });
    },
    destroy() {
      for (const target of [tint, light]) gsap.killTweensOf(target); // 광야 BUG-007 — 배열 kill은 지연 트윈을 남긴다
      container.destroy({ children: true });
      skyTex?.destroy(true);
    },
  };
}

let mounted = null;

/** 대전 장면이 메뉴 공통 배경을 공유할 때 (피격 색조·콤보 빛을 그 배경에 건다) */
export function getMountedBackground() {
  return mounted?.parallax ?? null;
}

// FR-048 · NFR-001 메뉴 공통 4층 배경 — 부팅 시 1회. 그래픽 초기화 실패 시 단색 바탕(--bg-abyss)으로 계속
export function mountBackground(host) {
  const app = new Application();
  const handle = { parallax: null, destroyed: false, ready: false };
  const fallback = () => { host.style.backgroundColor = toCss(COLORS.bgAbyss); };
  const start = async () => {
    try {
      await app.init({ resizeTo: host, backgroundAlpha: 1, background: COLORS.bgAbyss, antialias: true, preference: 'webgl',
        resolution: Math.min(globalThis.devicePixelRatio || 1, 2), autoDensity: true });
    } catch (err) {
      console.error('[background] 그래픽 초기화 실패 — 단색 배경으로 진행', err);
      fallback();
      return;
    }
    if (handle.destroyed) {
      app.destroy(true);
      return;
    }
    const canvas = app.canvas;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    host.appendChild(canvas);
    const reduce = prefersReducedMotion();
    handle.parallax = createParallax({ width: app.screen.width, height: app.screen.height, reducedMotion: reduce,
      isMobile: Math.min(app.screen.width, app.screen.height) < 768 });
    app.stage.addChild(handle.parallax.container);
    let w = app.screen.width;
    let h = app.screen.height;
    let failed = false;
    app.ticker.add((ticker) => {
      if (failed) return;
      try {
        if (app.screen.width !== w || app.screen.height !== h) {
          w = app.screen.width;
          h = app.screen.height;
          handle.parallax.resize(w, h);
        }
        handle.parallax.update(ticker.deltaMS, performance.now());
      } catch (err) {
        if (!failed) console.error('[background] 프레임 오류 — 배경 움직임 정지', err);
        failed = true;
      }
    });
    if (reduce) app.ticker.maxFPS = 1;
    handle.ready = true;
  };
  start();
  mounted = handle;
  return {
    destroy() {
      handle.destroyed = true;
      if (mounted === handle) mounted = null;
      if (handle.ready) {
        handle.parallax?.destroy();
        app.destroy(true);
      }
    },
  };
}
