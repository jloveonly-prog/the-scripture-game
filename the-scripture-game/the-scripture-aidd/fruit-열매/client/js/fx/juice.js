// juice.js — 이벤트 디스패처·같은 프레임 시작·감소 모드 분기만
// TASK-053 | REQ-013 FR-051~FR-056 FR-057 FR-061 NFR-006 | ARCH-005 | design-vision §4.6 전체·§4.8·§6.3 | D3-08~D3-10
// 이벤트 ID(J·C·A·S·G·R·H·Q·X·D·M·RX·AC·RT·GR·SV·UI + JESUS) → 표 행(juice-table-core·juice-table-powers)이 시각·모션·소리·
// 히트스톱·진동을 한 번에 시작한다. emit()은 대기열에 넣고, Pixi 틱(rAF 1개) 안에서 한꺼번에 실행 → 같은 rAF 콜백(FR-061).
// 소리는 Tone.now() 즉시, 히트스톱은 그 프레임부터. 게임 효과 반영은 호출자가 먼저 한다 — 연출이 반영을 늦추지 않는다(NFR-002).
import { gsap } from "gsap";
import { CORE } from "./juice-table-core.js";
import { FLOW } from "./juice-table-flow.js";
import { POWERS } from "./juice-table-powers.js";
import { QUIZ } from "./juice-table-quiz.js";
import { resetBoard } from "./board-motion.js";

/** §2.10 진동 HP 토큰 (ms 또는 패턴) */
export const HP = Object.freeze({
  "HP-tap": 10, "HP-light": 15, "HP-mid": 25, "HP-heavy": [30, 40, 60], "HP-hit": [40, 30, 40], "HP-dread": [80, 60,
    80],
  "HP-boss": [120, 60, 120, 60, 200], "HP-holy": [20, 40, 20, 40, 60], "HP-win": [50, 50, 120], "HP-lose": 200,
});
/** 표 전체 — 키 = design-vision §4.6 이벤트 ID */
export const JUICE_TABLE = Object.freeze({ ...CORE, ...FLOW, ...POWERS, ...QUIZ });

/**
 * @param {{ pixi: any, particles: any, filters: any, background?: any, spiritFx?: any, holyFx?: any,
 *   boards: () => { me: any, opp: any }, geometry: () => any, overlay: any, reactions?: any, confetti?: any, arrows:
 * any,
 *   shake: any, hitstop: any, flash: any, sfx?: any, aux?: any, bgm?: any, mixer?: any,
 *   hud?: Record<string, () => (HTMLElement | null)>, onUi?: (name: string, data: any) => void,
 *   vibrate?: (pattern: number | number[]) => boolean }} deps
 *   geometry = { kind, screen(layout), ...BATTLE_GEOMETRY[kind][mode] }.
 *   hud = 03-C HUD 요소 찾기(hold·pending·gauge·skill·angels·armorSlot·chips) — 있으면 그 요소에 GSAP 모션을 건다.
 *   onUi = HUD 상태 갱신 알림(03-C가 처리 — 예: "chips"·"armed") — 03-B는 HUD를 만들지 않는다.
 */
export function createJuice(deps) {
  const opts = { shake: true, flash: "strong", reducedMotion: false };
  let touchSeen = false;
  /** @type {Array<[string, any]>} */ const queue = [];
  const vibrate = deps.vibrate ?? ((p) => (typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
    ? navigator.vibrate(p) : false));

  // 표 행이 쓰는 실행 환경 (한 개를 재사용 — 이벤트마다 새 객체 0)
  const f = {
    ...deps, gsap, reduced: false,
    me: () => deps.boards().me, opp: () => deps.boards().opp,
    /** @param {"me" | "opp"} [side] */
    board: (side) => (side === "opp" ? deps.boards().opp : deps.boards().me),
    geo: () => deps.geometry(),
    get shakeOn() {
      return opts.shake;
    },
    /** SFX-xx / AUX-xx 재생 (Tone.now() 즉시) @param {string} id @param {any} [o] */
    sound(id, o) {
      return id.startsWith("AUX") ? deps.aux?.play(id, o) : deps.sfx?.play(id, o);
    },
    /** @param {string} token HS-1~HS-4 */
    hs: (token) => deps.hitstop.request(token),
    /** @param {string} token @param {"screen" | any} [target] @param {any} [o] */
    shk: (token, target, o) => deps.shake.request(token, target, o),
    /** @param {string} token @param {any} [o] */
    fl: (token, o) => deps.flash.request(token, o),
    /** D3-10 진동: 터치 입력이 있었던 세션 + 흔들림 켬일 때만 @param {string | number | number[]} p */
    haptic(p) {
      if (!touchSeen || !opts.shake) return false;
      try {
        return !!vibrate(typeof p === "string" ? HP[p] : p);
      } catch {
        return false;
      }
    },
    /** HUD 요소 (없으면 null) @param {string} name @param {any} [arg] */
    hudEl: (name, arg) => deps.hud?.[name]?.(arg) ?? null,
    /** @param {string} name @param {any} [data] */
    ui(name, data) {
      try {
        deps.onUi?.(name, data);
      } catch (err) {
        console.error("onUi 실패", err);
      }
    },
    /** 감소 모드 대체 ease (§2.9) @param {string} e */
    ease: (e) => (f.reduced && /elastic|back/.test(e) ? "power2.out" : e),
    /** 틱 구동 지연 실행 (히트스톱에 함께 멈춤) @param {number} ms @param {() => void} fn */
    later: (ms, fn) => deps.pixi.animate(1, () => {}, { delayMs: ms, onComplete: fn }),
  };

  /** @param {string} id @param {any} ctx */
  function run(id, ctx) {
    try {
      JUICE_TABLE[id](f, ctx);
    } catch (err) {
      console.error(`연출 ${id} 실패`, err);
    }
  }

  const offTick = deps.pixi.onTick((dtMs) => {
    // 같은 rAF 콜백 안에서 대기 중인 이벤트를 모두 시작 (FR-061)
    for (let i = 0; i < queue.length; i += 1) run(queue[i][0], queue[i][1]);
    queue.length = 0;
    deps.shake.update(dtMs);
  });

  const onPointer = (e) => {
    if (e.pointerType === "touch") touchSeen = true;
  };
  const onTouch = () => {
    touchSeen = true;
  };
  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
  }

  /** §6.3 감소 모드 반영 — 가림 정도(spirit 수치)는 바꾸지 않는다(D3-09) */
  function propagate() {
    f.reduced = opts.reducedMotion || !opts.shake || opts.flash === "weak";
    deps.shake.setEnabled(opts.shake);
    deps.flash.setLevel(opts.flash);
    deps.overlay.setJitter(opts.shake);
    const { me, opp } = deps.boards();
    for (const m of [deps.particles, deps.background, deps.spiritFx, deps.holyFx, deps.overlay, deps.reactions,
      deps.arrows, me, opp]) m?.setReduced?.(f.reduced);
  }

  return {
    /**
     * 연출 요청 — 이번 rAF에서 시작. ctx 형식은 각 표 행의 머리 주석.
     * @param {string} id design-vision §4.6 이벤트 ID @param {any} [ctx] @returns {boolean} 알려진 ID인가
     */
    emit(id, ctx = {}) {
      if (!JUICE_TABLE[id]) return false;
      queue.push([id, ctx]);
      return true;
    },
    /** 대기열을 지금 실행 (이미 rAF 콜백 안에서 부르는 호출자용) */
    flush() {
      for (let i = 0; i < queue.length; i += 1) run(queue[i][0], queue[i][1]);
      queue.length = 0;
    },
    /**
     * FR-057 연출 세기 옵션 (D3-08 첫 기본값은 03-C settings가 prefers-reduced-motion으로 정함)
     * @param {{ shake?: boolean, flash?: "strong" | "medium" | "weak", reducedMotion?: boolean }} o
     */
    setOptions(o) {
      Object.assign(opts, o);
      propagate();
    },
    get options() {
      return { ...opts, reduced: f.reduced };
    },
    /** 보드가 새로 만들어졌을 때(배치 변경) 감소 모드 재적용 */
    refresh: propagate,
    /** 라운드 리셋·화면 이탈: 히트스톱·흔들림·콜아웃·보드 칸 변형 원상 복구 */
    reset() {
      queue.length = 0;
      deps.hitstop.cancel();
      deps.shake.stopAll();
      deps.overlay.clear();
      const { me, opp } = deps.boards();
      for (const b of [me, opp]) if (b) resetBoard(b);
    },
    destroy() {
      offTick();
      if (typeof window !== "undefined") {
        window.removeEventListener("pointerdown", onPointer);
        window.removeEventListener("touchstart", onTouch);
      }
    },
  };
}
