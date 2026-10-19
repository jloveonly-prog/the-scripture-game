// TASK-041-2 · FR-052 · FR-053 · FR-054 · FR-057 · NFR-001 — pixi-filters 프리셋(design-vision §2.7)과 섬광·충격파·블룸·빛기둥·일렁임·채도 연출 실행기.
// 섬광·블룸·Godray·충격파 밝기는 fx-intensity 배율, 화면 25% 이상 섬광은 333ms 상한. 동시 필터 = 화면 전체 2 + 국소 2 (§4.12). Canvas 렌더러면 필터 생략.
import { Graphics, Sprite, Texture, ColorMatrixFilter, DisplacementFilter } from 'pixi.js';
import { GlowFilter, ShockwaveFilter, AdvancedBloomFilter, GodrayFilter, MotionBlurFilter, KawaseBlurFilter } from 'pixi-filters';
import { gsap } from 'gsap';
import { scaleFlashAlpha, scaleBrightness, tryFlash } from './fx-intensity.js';
import { COLORS } from '../render/piece-skin.js';

/** design-vision §2.7 필터 규격 (기본값 — 배율 적용 전) */
export const FILTER_PRESETS = Object.freeze({
  fallGlow: Object.freeze({ distance: 12, outerStrength: 1.2, innerStrength: 0, quality: 0.2 }),
  hardDropTrail: Object.freeze({ alpha: 0.6, velocity: Object.freeze({ x: 0, y: 40 }), ms: 180 }),
  hardDropWave: Object.freeze({ amplitude: 18, wavelength: 80, speed: 600, radius: 220, brightness: 1.1, ms: 350 }),
  tetrisWave: Object.freeze({ amplitude: 40, wavelength: 160, speed: 900, radius: 600, brightness: 1.3, ms: 600 }),
  jerichoWave: Object.freeze({ amplitude: 12, wavelength: 80, speed: 600, radius: 120, brightness: 1, ms: 400 }),
  tetrisBloom: Object.freeze({ threshold: 0.5, bloomScale: 1.2, brightness: 1.2, ms: 300 }),
  pillar: Object.freeze({ widthRatio: 0.6, angle: 15, gain: 0.6, lacunarity: 2.75, alpha: 0.8, parallel: true, ms: 1200 }),
  jesusRay: Object.freeze({ gain: 0.8, lacunarity: 2.5, parallel: false, bloomBrightness: 1.3, alpha: 1 }),
  babylon: Object.freeze({ scale: 20, periodMs: 1200, blur: 2 }),
  defeatGrayMs: 300,
  quizDim: Object.freeze({ saturation: 0.5, brightness: 0.7, inMs: 350, outMs: 200 }),
  victoryGlow: Object.freeze({ distance: 16, outerStrength: 2, ms: 600 }),
});
/** design-vision §2.7 섬광 (불투명도·ms) */
export const FLASHES = Object.freeze({
  white: Object.freeze({ color: COLORS.lightWhite, alpha: 0.9, ms: 60 }),
  gold: Object.freeze({ color: COLORS.lightGoldBright, alpha: 0.55, ms: 160 }),
  red: Object.freeze({ color: COLORS.danger, alpha: 0.45, ms: 140 }),
  resultWhite: Object.freeze({ color: COLORS.lightWhite, alpha: 0.9, ms: 200 }),
});
/** design-vision §4.12 동시 실시간 필터 상한 */
export const FILTER_BUDGET = Object.freeze({ screen: 2, local: 2 });

// NFR-001 동시 필터 예산 — acquire 실패 시 그 연출의 필터만 생략
export function createFilterBudget(limits = FILTER_BUDGET) {
  const used = { screen: 0, local: 0 };
  return {
    acquire(kind) {
      if (used[kind] >= limits[kind]) return false;
      used[kind] += 1;
      return true;
    },
    release(kind) {
      used[kind] = Math.max(0, used[kind] - 1);
    },
    used: () => ({ ...used }),
  };
}

const addFilter = (target, f) => { target.filters = [...(target.filters ?? []), f]; };
const removeFilter = (target, f) => {
  if (!target.destroyed) target.filters = (target.filters ?? []).filter((x) => x !== f);
  f.destroy?.();
};

// FR-052 연출 실행기 생성 (rt = pixi-app 런타임)
export function createFilterFx(rt) {
  const budget = createFilterBudget();
  const screen = rt.app.screen;
  rt.game.filterArea = screen;
  const noise = noiseTexture(globalThis.document);

  /** 기간 한정 필터: 예산 확보 → 붙임 → tween(onUpdate) → 제거 */
  function timed(target, kind, filter, ms, tweenVars = {}) {
    if (!rt.filtersOn || !budget.acquire(kind)) {
      filter.destroy?.();
      return null;
    }
    addFilter(target, filter);
    gsap.to(filter, { ...tweenVars, duration: ms / 1000, ease: tweenVars.ease ?? 'none', onComplete: () => {
      removeFilter(target, filter);
      budget.release(kind);
    } });
    return filter;
  }

  return {
    // FR-052 · FR-057 사각형 섬광 (흰·금·붉은) — 배율 × 섬광, 넓은 섬광은 333ms 상한
    flash(r, preset, now = performance.now()) {
      const alpha = scaleFlashAlpha(preset.alpha);
      if (alpha <= 0 || !tryFlash(now, (r.width * r.height) / Math.max(1, screen.width * screen.height))) return false;
      const g = new Graphics().rect(r.x, r.y, r.width, r.height).fill(preset.color);
      g.alpha = alpha;
      rt.fx.addChild(g);
      gsap.to(g, { alpha: 0, duration: preset.ms / 1000, ease: 'expo.out', onComplete: () => g.destroy() });
      return true;
    },
    // FR-051 하드 드롭 빛줄기 (블록 폭 × 낙하 거리, 세로 그라데이션 0.6→0, MotionBlur, 180ms)
    trail(x, y, width, height, color) {
      const g = new Graphics();
      const strips = 8;
      for (let i = 0; i < strips; i += 1) g.rect(x, y + (height * i) / strips, width, height / strips + 1).fill({ color, alpha: FILTER_PRESETS.hardDropTrail.alpha * (i / strips) });
      rt.fx.addChild(g);
      if (rt.filtersOn) g.filters = [new MotionBlurFilter({ velocity: FILTER_PRESETS.hardDropTrail.velocity })];
      gsap.to(g, { alpha: 0, duration: FILTER_PRESETS.hardDropTrail.ms / 1000, onComplete: () => g.destroy({ children: true }) });
    },
    // FR-051 · FR-052 · FR-044 충격파 (하드 드롭·테트리스·여리고 국소) — 중심 = 게임 레이어 좌표
    shockwave(center, preset) {
      const f = new ShockwaveFilter({ center: { x: center.x, y: center.y }, amplitude: preset.amplitude, wavelength: preset.wavelength,
        speed: preset.speed, radius: preset.radius, brightness: scaleBrightness(preset.brightness), time: 0 });
      return timed(rt.game, 'screen', f, preset.ms, { time: preset.ms / 1000, ease: 'expo.out' });
    },
    // FR-052 테트리스 블룸 300ms (brightness 초과분 × 섬광 배율)
    bloom(preset = FILTER_PRESETS.tetrisBloom, ms = preset.ms) {
      const f = new AdvancedBloomFilter({ threshold: preset.threshold, bloomScale: preset.bloomScale, brightness: scaleBrightness(preset.brightness) });
      return timed(rt.game, 'screen', f, ms, { bloomScale: 0 });
    },
    // FR-054 EVT-29 빛기둥 — 대상 보드 위→아래, 폭 = 보드 폭 × 0.6, Godray 1200ms
    pillar(board) {
      const p = FILTER_PRESETS.pillar;
      const g = new Graphics().rect(board.x + board.width * ((1 - p.widthRatio) / 2), board.y, board.width * p.widthRatio, board.height).fill(COLORS.angelCore);
      g.alpha = 0;
      rt.fx.addChild(g);
      if (rt.filtersOn && budget.acquire('local')) {
        const f = new GodrayFilter({ angle: p.angle, gain: p.gain * scaleFlashAlpha(1), lacunarity: p.lacunarity, alpha: 0, parallel: p.parallel, time: 0 });
        f.blendMode = 'add';
        g.filters = [f];
        gsap.to(f, { time: 2, duration: p.ms / 1000, onComplete: () => budget.release('local') });
        gsap.timeline().to(f, { alpha: p.alpha, duration: 0.2 }).to(f, { alpha: 0, duration: (p.ms - 200) / 1000 });
      }
      gsap.timeline({ onComplete: () => g.destroy() }).to(g, { alpha: scaleFlashAlpha(0.35), duration: 0.2 }).to(g, { alpha: 0, duration: (p.ms - 200) / 1000 });
    },
    // FR-039 EVT-32 예수님 빛 — 화면(모바일·상대 화면은 보드 크기) Godray + Bloom, durationMs 동안
    jesusRays(area, centerTop, ms, withBloom = true) {
      const p = FILTER_PRESETS.jesusRay;
      const g = new Graphics().rect(area.x, area.y, area.width, area.height).fill(COLORS.jesusLight);
      g.alpha = 0;
      rt.screenFx.addChild(g);
      let ray = null;
      if (rt.filtersOn && budget.acquire('screen')) {
        ray = new GodrayFilter({ gain: p.gain * scaleFlashAlpha(1), lacunarity: p.lacunarity, parallel: p.parallel, center: centerTop, time: 0, alpha: 0 });
        ray.blendMode = 'add';
        g.filters = [ray];
        gsap.to(ray, { time: 3, duration: ms / 1000, onComplete: () => budget.release('screen') });
        gsap.timeline().to(ray, { alpha: p.alpha, duration: 0.4 }).to(ray, { alpha: 0, duration: 0.4 }, Math.max(0.4, ms / 1000 - 0.4));
      }
      if (withBloom) this.bloom({ ...FILTER_PRESETS.tetrisBloom, brightness: p.bloomBrightness }, ms);
      gsap.timeline({ onComplete: () => g.destroy() }).to(g, { alpha: scaleFlashAlpha(0.3), duration: 0.4 }).to(g, { alpha: scaleFlashAlpha(0.3), duration: Math.max(0, ms - 800) / 1000 })
        .to(g, { alpha: 0, duration: 0.4 });
    },
    // FR-030 큰 음녀 바벨론 — Displacement(생성 노이즈, scale 20, 1.2초 주기) + KawaseBlur 2, durationMs
    babylon(view, ms) {
      if (!rt.filtersOn || !budget.acquire('local')) return;
      const p = FILTER_PRESETS.babylon;
      const sprite = new Sprite(noise);
      sprite.renderable = false;
      view.root.addChild(sprite);
      const disp = new DisplacementFilter({ sprite, scale: p.scale });
      const blur = new KawaseBlurFilter({ strength: p.blur });
      addFilter(view.root, disp);
      addFilter(view.root, blur);
      const move = gsap.to(sprite, { x: noise.width, duration: p.periodMs / 1000, repeat: -1, ease: 'none' });
      gsap.delayedCall(ms / 1000, () => {
        move.kill();
        removeFilter(view.root, disp);
        removeFilter(view.root, blur);
        if (!sprite.destroyed) sprite.destroy();
        budget.release('local');
      });
    },
    // FR-007 EVT-48 패배 굳음 — 회색 전환 300ms (ColorMatrix desaturate + alpha 트윈 — GrayscaleFilter는 세기 값이 없어 전환 불가)
    grayscale(view) {
      if (!rt.filtersOn || view.grayFilter) return;
      const f = new ColorMatrixFilter();
      f.desaturate();
      f.alpha = 0;
      view.grayFilter = f;
      addFilter(view.root, f);
      gsap.to(f, { alpha: 1, duration: FILTER_PRESETS.defeatGrayMs / 1000 });
    },
    clearGrayscale(view) {
      if (!view?.grayFilter) return;
      gsap.killTweensOf(view.grayFilter);
      removeFilter(view.root, view.grayFilter);
      view.grayFilter = null;
    },
    // FR-040 EVT-34/37 두 보드 채도 50%·밝기 70% (정지 표시) / 원복 200ms
    dimBoards(on) {
      const q = FILTER_PRESETS.quizDim;
      for (const view of [rt.views.me, rt.views.opponent]) {
        if (!view || !rt.filtersOn) continue;
        if (on && !view.dimFilter) {
          const f = new ColorMatrixFilter();
          f.saturate(q.saturation - 1, false);
          f.brightness(q.brightness, true);
          f.alpha = 0;
          view.dimFilter = f;
          addFilter(view.root, f);
          gsap.to(f, { alpha: 1, duration: q.inMs / 1000 });
        } else if (!on && view.dimFilter) {
          const f = view.dimFilter;
          view.dimFilter = null;
          gsap.to(f, { alpha: 0, duration: q.outMs / 1000, onComplete: () => removeFilter(view.root, f) });
        }
      }
    },
    // FR-007 EVT-48 승리 보드 금빛 발광 폭 600ms
    victoryGlow(view) {
      const v = FILTER_PRESETS.victoryGlow;
      const f = new GlowFilter({ distance: v.distance, outerStrength: 0, innerStrength: 0, color: COLORS.lightGold, quality: 0.2 });
      timed(view.root, 'local', f, v.ms / 2, { outerStrength: v.outerStrength, yoyo: true, repeat: 1, ease: 'power2.out' });
    },
    destroy() {
      noise.destroy(true);
    },
  };
}

function noiseTexture(doc) {
  const size = 64;
  const c = doc.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(c);
  tex.source.addressMode = 'repeat';
  return tex;
}
