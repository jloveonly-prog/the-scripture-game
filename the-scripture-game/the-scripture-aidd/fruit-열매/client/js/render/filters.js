// filters.js — pixi-filters 부착·해제·동시 3개 상한만
// TASK-042 | REQ-013 FR-048 FR-052 FR-053 FR-054 FR-056 NFR-001 | ARCH-004 | D-13 | design-vision §2.5·§4.6·§4.9
// 무거운 필터(Shockwave·AdvancedBloom·Blur·Displacement·Godray·RGBSplit)는 동시 3개까지 — 넘으면 가장 오래된 장식용부터 해제.
// 게임 정보용(info — S-12 바벨론 흐림·물결)은 해제하지 않는다(§4.9, D3-09). 필터는 효과 중에만 부착(D-13).
import { AlphaFilter, BlurFilter, ColorMatrixFilter, DisplacementFilter, Graphics, Rectangle, Sprite } from "pixi.js";
import { AdjustmentFilter, AdvancedBloomFilter, GlowFilter, GodrayFilter, RGBSplitFilter,
  ShockwaveFilter } from "pixi-filters";

const MAX_HEAVY = 3;
const HEAVY = new Set(["shockwave", "bloom", "blur", "displacement", "godray", "rgbsplit"]);

/** §2.5 발광 토큰 */
export const GLW = Object.freeze({
  special: { distance: 10, outerStrength: 2.5, innerStrength: 0.3, quality: 0.25 },
  gold: { distance: 16, outerStrength: 4, innerStrength: 0.5, quality: 0.25, color: 0xe8b84a },
  holy: { distance: 24, outerStrength: 5, quality: 0.25, color: 0xfff8e7 },
  holyBloom: { threshold: 0.45, bloomScale: 1.4, brightness: 1.1, blur: 8 },
  evil: { distance: 14, outerStrength: 3, quality: 0.25, color: 0x8e2a5a },
});

/**
 * @param {{ renderer: any, onTick: (fn: (dt: number) => void) => () => void,
 *   animate: (ms: number, step: (k: number) => void, o?: any) => { cancel: () => void, done: Promise<void> } }} pixi
 */
export function createFilters(pixi) {
  /** @type {Array<{ target: any, filter: any, kind: string, info: boolean, onRelease?: () => void }>} */
  const live = [];
  let light = false;

  /** @param {any} entry */
  function remove(entry) {
    const i = live.indexOf(entry);
    if (i < 0) return;
    live.splice(i, 1);
    const t = entry.target;
    if (t && !t.destroyed) t.filters = (t.filters ?? []).filter((f) => f !== entry.filter);
    try {
      entry.onRelease?.();
    } catch (err) {
      console.error("filter 해제 정리 실패", err);
    }
  }

  /**
   * 필터 부착. kind ∈ HEAVY면 상한 검사 — 자리가 없고 장식용이면 붙이지 않는다(null).
   * @param {any} target @param {any} filter @param {{ kind: string, info?: boolean, onRelease?: () => void }} o
   */
  function attach(target, filter, o) {
    if (!target || target.destroyed) return null;
    if (HEAVY.has(o.kind)) {
      const heavy = live.filter((e) => HEAVY.has(e.kind));
      if (heavy.length >= MAX_HEAVY) {
        const victim = heavy.find((e) => !e.info);
        if (victim) remove(victim);
        else if (!o.info) return null;
      }
    }
    const entry = { target, filter, kind: o.kind, info: !!o.info, onRelease: o.onRelease };
    target.filters = [...(target.filters ?? []), filter];
    live.push(entry);
    return { filter, release: () => remove(entry) };
  }

  /** 대상의 지역 좌표 → 필터 입력 좌표(대상 화면 경계 왼쪽 위 기준, 논리 px) + 배율 @param {any} target */
  function filterSpace(target, x, y) {
    const b = target.getBounds();
    const screen = pixi.renderer.screen;
    const g = target.toGlobal({ x, y });
    const scale = Math.abs(target.worldTransform.a) || 1;
    return { x: g.x - Math.max(screen.x, b.x), y: g.y - Math.max(screen.y, b.y), scale };
  }

  /** 시간 한정 필터 — durationMs 뒤 자동 해제 @param {any} h @param {number} ms @param {(k: number) => void} [step] */
  function timed(h, ms, step) {
    if (!h) return null;
    const tw = pixi.animate(ms, (k) => step?.(k), { ease: "none", onComplete: () => h.release() });
    return { ...h, release: () => { tw.cancel(); h.release(); } };
  }

  return {
    attach,
    /**
     * ShockwaveFilter (J-05·C-04·A-01·A-04) — center는 대상 지역 좌표, 수치는 가상 px(배율 반영), time 0→0.5s
     * @param {any} target @param {{ x: number, y: number, amplitude: number, wavelength?: number, speed?: number,
     *   brightness?: number, radius?: number }} o
     */
    shockwave(target, o) {
      const fs = filterSpace(target, o.x, o.y);
      const f = new ShockwaveFilter({
        center: { x: fs.x, y: fs.y }, amplitude: o.amplitude * fs.scale, wavelength: (o.wavelength ?? 90) * fs.scale,
        speed: (o.speed ?? 520) * fs.scale, brightness: o.brightness ?? 1, radius: (o.radius ?? 260) * fs.scale,
          time: 0,
      });
      return timed(attach(target, f, { kind: "shockwave" }), 500, (k) => { f.time = 0.5 * k; });
    },
    /** AdvancedBloomFilter (C-04 300ms·M-04 600ms) — 가벼운 그리기면 끔(§4.9) @param {any} target @param {any} o */
    bloom(target, o) {
      if (light) return null;
      const f = new AdvancedBloomFilter({ threshold: o.threshold, bloomScale: o.bloomScale,
        brightness: o.brightness ?? 1,
        blur: o.blur ?? 8, quality: 4 });
      const h = attach(target, f, { kind: "bloom", info: false });
      return o.durationMs ? timed(h, o.durationMs) : h;
    },
    /** RGBSplitFilter (C-04 150ms, S-13 6px 200ms) @param {any} target @param {any} o */
    rgbSplit(target, o) {
      const f = new RGBSplitFilter({ red: o.red, green: o.green, blue: o.blue });
      return timed(attach(target, f, { kind: "rgbsplit" }), o.durationMs);
    },
    /**
     * GodrayFilter (§4.6.8 — 아래 방향, gain 0.6, lacunarity 2.5, parallel, alpha 0.8). RTM §5 DCL-007 ⑥: pixi-filters
     * 6.1.5의 angle은 0 = 세로 빛살(90 = 가로)이라 "아래 방향" = angle 0. frozen = 감소 모드(time 고정)
     * @param {any} target @param {{ frozen?: boolean }} [o]
     */
    godray(target, o = {}) {
      const f = new GodrayFilter({ angle: 0, gain: 0.6, lacunarity: 2.5, parallel: true, alpha: 0.8, time: 0 });
      const h = attach(target, f, { kind: "godray" });
      if (!h || o.frozen) return h;
      const off = pixi.onTick((dt) => { f.time += dt / 1000; });
      return { ...h, release: () => { off(); h.release(); } };
    },
    /** GLW-special·gold·evil GlowFilter — 가벼운 그리기면 구운 텍스처만(null) @param {any} target @param {any} token */
    glow(target, token, color) {
      if (light) return null;
      return attach(target, new GlowFilter({ ...token, ...(color !== undefined ? { color } : {}) }), { kind: "glow" });
    },
    /** GLW-holy = Glow + AdvancedBloom (§2.5) @param {any} target @param {number} [bloomScale] 예수님 이벤트 2.0 */
    holy(target, bloomScale = GLW.holyBloom.bloomScale) {
      const g = this.glow(target, GLW.holy);
      const b = light ? null : attach(target, new AdvancedBloomFilter({ ...GLW.holyBloom, bloomScale, quality: 4 }),
        { kind: "bloom" });
      return { release: () => { g?.release(); b?.release(); } };
    },
    /**
     * 필터 뒤 투명도 (AlphaFilter — 앞선 필터 결과에 곱함). Pixi v8은 부모 alpha를 필터 입력에 먼저 곱하므로
     * Bloom이 그 빛을 다시 키운다 — §2.13.5 "최대 투명도 0.55"는 번짐 뒤에 걸어야 지켜진다. @param {any} target
     */
    postAlpha(target, alpha) {
      return attach(target, new AlphaFilter({ alpha }), { kind: "alpha" });
    },
    /** AdjustmentFilter (§4.6.8 밝기·Q-01 채도·M-03 회색) — 가벼운 필터 @param {any} target @param {any} o */
    adjustment(target, o) {
      return attach(target, new AdjustmentFilter({ gamma: 1, contrast: 1, saturation: 1, brightness: 1, ...o }),
        { kind: "adjustment" });
    },
    /** ColorMatrixFilter (배경 붉은 어둠 §2.12, S-12 색상 +20°) @param {any} target @param {boolean} [info] */
    colorMatrix(target, info = false) {
      return attach(target, new ColorMatrixFilter(), { kind: "colormatrix", info });
    },
    /** BlurFilter (S-12 strength = params.blur — 게임 정보) @param {any} target @param {number} strength */
    blur(target, strength, info = true) {
      return attach(target, new BlurFilter({ strength, quality: 4 }), { kind: "blur", info });
    },
    /**
     * DisplacementFilter 사인 물결 (S-12 — 진폭 params.waveAmplitude px, 파장 120px, cyclesPerSec 2·감소 1)
     * @param {any} target @param {{ amplitude: number, wavelength: number, cyclesPerSec: number, info?: boolean }} o
     */
    wave(target, o) {
      const g = new Graphics();
      for (let x = 0; x < o.wavelength; x += 1) {
        const v = Math.round(127.5 + 127.5 * Math.sin((x / o.wavelength) * Math.PI * 2));
        g.rect(x, 0, 1, 8).fill((v << 16) | (v << 8) | 128);
      }
      const tex = pixi.renderer.generateTexture({ target: g, frame: new Rectangle(0, 0, o.wavelength, 8) });
      g.destroy();
      tex.source.addressMode = "repeat";
      const map = new Sprite(tex);
      map.width = target.width + o.wavelength;
      map.height = target.height;
      target.addChild(map);
      // DisplacementFilter scale ≈ 최대 이동 px × 2 (맵 값 0~1 → −0.5~0.5)
      const f = new DisplacementFilter({ sprite: map, scale: o.amplitude * 2 });
      const h = attach(target, f, {
        kind: "displacement", info: o.info ?? true,
        onRelease: () => { off(); map.destroy(); tex.destroy(true); },
      });
      let phase = 0;
      const off = pixi.onTick((dt) => {
        phase = (phase + (dt / 1000) * o.cyclesPerSec * o.wavelength) % o.wavelength;
        map.x = -phase;
      });
      if (!h) {
        off();
        map.destroy();
      }
      return h;
    },
    /** NFR-001 §4.9 가벼운 그리기: Bloom 끔, Glow는 구운 텍스처만 — 이미 붙은 장식 Bloom·Glow도 해제 @param {boolean} on */
    setLight(on) {
      light = on;
      if (on) for (const e of [...live]) if (!e.info && (e.kind === "bloom" || e.kind === "glow")) remove(e);
    },
    get heavyCount() {
      return live.filter((e) => HEAVY.has(e.kind)).length;
    },
    /** 대상의 필터 전부 해제 (보드 파괴·라운드 리셋) @param {any} target */
    releaseAll(target) {
      for (const e of [...live]) if (e.target === target) remove(e);
    },
  };
}
