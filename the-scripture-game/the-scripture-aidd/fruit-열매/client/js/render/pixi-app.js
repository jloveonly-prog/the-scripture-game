// pixi-app.js — Pixi Application 생성·레이어 컨테이너·틱 등록만
// TASK-040 | REQ-013 FR-048 NFR-001 | ARCH-004 | SCR-005 | design-vision §2.8·§4.9 | D-13 D3-03 | RTM §5 DCL-007
// Application은 1개(D-13). 모든 글자는 DOM — Pixi는 그래픽만(D3-04).
import { Application, Container } from "pixi.js";
import { gsap } from "gsap";

/** design-vision §2.8 Pixi 스테이지 zIndex 11개 (오름차순) */
export const LAYER = Object.freeze({
  BACKGROUND: 0,
  BOARD_FRAME: 10,
  BOARD_CELL: 20,
  GUIDE: 25,
  ACTIVE_PIECE: 30,
  BOARD_FX: 40,
  PARTICLE: 50,
  SPIRIT: 60,
  PROJECTILE: 70,
  HOLY: 80,
  SCREEN_FX: 90,
});

/** --c-abyss — §4.9 "배경 투명 아님(#07060D)" */
const ABYSS = 0x07060d;

/** 렌더러를 만들 수 없을 때(WebGL·WebGPU 모두 실패) 화면이 FatalModal로 안내하도록 구분하는 오류 */
export class RenderInitError extends Error {
  /** @param {unknown} cause */
  constructor(cause) {
    super("그래픽을 시작할 수 없습니다");
    this.name = "RenderInitError";
    this.cause = cause;
  }
}

/** @param {string} label @param {number} zIndex */
function layer(label, zIndex) {
  const c = new Container({ label, zIndex });
  c.sortableChildren = true;
  return c;
}

/**
 * Pixi Application 1개 + §2.8 레이어. 구조 (RTM §5 DCL-007):
 * stage → letterbox(배율·원점 — layout.js) → [screenRoot(SHK "화면", z0~z70), holy(z80), screenFx(z90)]
 * holy는 흔들림 루트 밖 — 예수님 실루엣은 흔들리거나 어두워지지 않는다 (C-002, §2.13.5).
 * 보드 레이어(z10~z40)는 board-view가 보드마다 컨테이너 1개 안의 하위 zIndex로 만든다 → screenRoot의 boards에 추가.
 * @param {{ mount: HTMLElement, preference?: "webgl" | "webgpu" }} options
 */
export async function createPixiApp({ mount, preference = "webgl" }) {
  const app = new Application();
  const settings = {
    // §4.9 resolution = min(devicePixelRatio, 2), antialias, 배경 #07060D, autoDensity
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    antialias: true,
    background: ABYSS,
    autoDensity: true,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  try {
    // architecture §3 "WebGL/WebGPU 배치 렌더링" — pixi.js 8.22 autoDetect는 배열 순서대로 시도한다(캔버스 렌더러는 넣지 않음:
    // §2.5 발광·§4.6 충격파 등 pixi-filters가 동작하지 않는다)
    await app.init({ ...settings, preference: [preference, preference === "webgl" ? "webgpu" : "webgl"] });
  } catch (err) {
    throw new RenderInitError(err);
  }
  app.canvas.setAttribute("aria-hidden", "true"); // §6.1 캔버스는 aria-hidden, 정보는 알림 영역(§6.4)
  app.canvas.style.display = "block";
  mount.appendChild(app.canvas);

  const stage = app.stage;
  const letterbox = new Container({ label: "Letterbox" });
  const screenRoot = layer("ScreenRoot", 0);
  const layers = {
    background: layer("BackgroundLayer", LAYER.BACKGROUND),
    // 보드 컨테이너들(내부 zIndex 10·20·25·30·40)을 담는 자리 — 보드끼리 겹치지 않음(DCL-007 ⑤)
    boards: layer("BoardLayers", LAYER.BOARD_FRAME),
    particle: layer("ParticleLayer", LAYER.PARTICLE),
    spirit: layer("SpiritLayer", LAYER.SPIRIT),
    projectile: layer("ProjectileLayer", LAYER.PROJECTILE),
    holy: layer("HolyLayer", LAYER.HOLY),
    screenFx: layer("ScreenFxLayer", LAYER.SCREEN_FX),
  };
  screenRoot.addChild(layers.background, layers.boards, layers.particle, layers.spirit, layers.projectile);
  letterbox.addChild(screenRoot, layers.holy, layers.screenFx);
  stage.addChild(letterbox);

  /** @type {Set<(dtMs: number, rawMs: number) => void>} */
  const tickers = new Set();
  // rAF 1개(Pixi Ticker). dtMs = 속도 반영(히트스톱 ticker.speed = 0이면 0 — §2.10 HS), rawMs = 실제 경과(품질 감시용)
  const onFrame = (ticker) => {
    for (const fn of tickers) {
      try {
        fn(ticker.deltaMS, ticker.elapsedMS);
      } catch (err) {
        console.error("tick 실패", err);
      }
    }
  };
  app.ticker.add(onFrame);

  /** @type {Set<{ update: (dt: number) => boolean }>} */
  const tweens = new Set();
  tickers.add((dtMs) => {
    for (const tw of tweens) {
      try {
        if (!tw.update(dtMs)) tweens.delete(tw);
      } catch (err) {
        tweens.delete(tw);
        console.error("animate 실패", err);
      }
    }
  });

  return {
    app,
    renderer: app.renderer,
    stage,
    letterbox,
    screenRoot,
    layers,
    /** 매 프레임 콜백 등록 — 해제 함수 반환 @param {(dtMs: number, rawMs: number) => void} fn */
    onTick(fn) {
      tickers.add(fn);
      return () => tickers.delete(fn);
    },
    /**
     * 틱 구동 트윈 — GSAP 이징(§2.9 토큰 이름)을 쓰되 시간은 Pixi 틱(dtMs)으로 흘러 히트스톱에 함께 멈춘다.
     * @param {number} durationMs @param {(k: number) => void} step k = 이징 적용 진행 0→1
     * @param {{ ease?: string, delayMs?: number, onComplete?: () => void }} [opts]
     * @returns {{ cancel: () => void, done: Promise<void> }}
     */
    animate(durationMs, step, opts = {}) {
      const ease = gsap.parseEase(opts.ease ?? "power2.out") ?? ((k) => k);
      let elapsed = -(opts.delayMs ?? 0);
      let resolve = () => {};
      const done = new Promise((r) => {
        resolve = r;
      });
      const tw = {
        update(dt) {
          elapsed += dt;
          if (elapsed < 0) return true;
          const k = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
          step(ease(k));
          if (k < 1) return true;
          opts.onComplete?.();
          resolve();
          return false;
        },
      };
      tweens.add(tw);
      return {
        cancel() {
          tweens.delete(tw);
          resolve();
        },
        done,
      };
    },
    destroy() {
      app.ticker.remove(onFrame);
      tickers.clear();
      tweens.clear();
      app.destroy({ removeView: true }, { children: true });
    },
  };
}
