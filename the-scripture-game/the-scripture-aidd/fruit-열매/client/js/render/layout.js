// layout.js — 가로형 1280×720 / 세로형 720×1280 선택·배율 계산·캔버스/DOM 동기화만
// TASK-040 | REQ-013 FR-011 FR-048 NFR-001 | ARCH-004 | SCR-005 | design-vision §3.5.1·§3.5.2·§3.5.4·§5.2 | D3-03 D3-14
// 좌표표의 숫자는 design-vision §3.5 좌표표 원문 그대로(가상 px, 왼쪽 위 원점). 캔버스와 DOM 오버레이는 같은 배율·원점.

/** D3-03 가상 해상도 2벌 */
export const VIRTUAL = Object.freeze({
  landscape: Object.freeze({ width: 1280, height: 720 }),
  portrait: Object.freeze({ width: 720, height: 1280 }),
});

// §5.2 최소 크기 · §5.2 크기 변경 디바운스 · D3-14 휴대폰 짧은 변
const MIN_LANDSCAPE_SCALE = 0.55;
const MIN_PORTRAIT_SCALE = 0.45;
const RESIZE_DEBOUNCE_MS = 150;
const PHONE_SHORT_SIDE_PX = 600;

/**
 * Pixi가 그리는 대전 요소의 가상 좌표 (design-vision §3.5.1·§3.5.2·§3.5.4). 글자·버튼(HUD)은 DOM 몫이라 여기 없다.
 * board: 보드 왼쪽 위 + 칸 크기 / next: 첫 칸 높이 first, 이후 rest / collision: 가운데 충돌점(A-04)
 */
export const BATTLE_GEOMETRY = Object.freeze({
  landscape: Object.freeze({
    versus: Object.freeze({
      myBoard: { x: 296, y: 84, cell: 30 }, oppBoard: { x: 946, y: 140, cell: 22 },
      hold: { x: 24, y: 72, w: 240, h: 96 }, next: { x: 626, y: 84, w: 100, h: 412, first: 72, rest: 52 },
      gauge: { x: 272, y: 84, w: 16, h: 600 }, pending: { x: 602, y: 84, w: 12, h: 600 },
      oppPending: { x: 1172, y: 140, w: 8, h: 440 }, oppHold: { x: 890, y: 140, w: 50, h: 50 },
      collision: { x: 806, y: 330 }, callout: { x: 446, y: 384 },
    }),
    practice: Object.freeze({
      myBoard: { x: 490, y: 84, cell: 30 }, oppBoard: null,
      hold: { x: 370, y: 84, w: 96, h: 80 }, next: { x: 800, y: 84, w: 100, h: 412, first: 72, rest: 52 },
      gauge: { x: 466, y: 84, w: 16, h: 600 }, pending: null, oppPending: null, oppHold: null, collision: null,
      callout: { x: 640, y: 384 },
    }),
  }),
  portrait: Object.freeze({
    versus: Object.freeze({
      myBoard: { x: 136, y: 96, cell: 32 }, oppBoard: { x: 584, y: 96, cell: 12 },
      hold: { x: 16, y: 96, w: 96, h: 80 }, next: { x: 480, y: 96, w: 80, h: 336, first: 64, rest: 44 },
      gauge: { x: 116, y: 96, w: 12, h: 640 }, pending: { x: 460, y: 96, w: 10, h: 640 },
      oppPending: { x: 706, y: 96, w: 6, h: 240 }, oppHold: null,
      // A-04 세로형 충돌점: 내 보드 위 가운데(296,96)와 상대 보드 위 가운데(644,96) 사이 가운데
      collision: { x: 470, y: 96 }, callout: { x: 296, y: 416 },
    }),
    practice: Object.freeze({
      myBoard: { x: 136, y: 96, cell: 32 }, oppBoard: null,
      hold: { x: 16, y: 96, w: 96, h: 80 }, next: { x: 480, y: 96, w: 80, h: 336, first: 64, rest: 44 },
      gauge: { x: 116, y: 96, w: 12, h: 640 }, pending: null, oppPending: null, oppHold: null, collision: null,
      callout: { x: 296, y: 416 },
    }),
  }),
});

/**
 * §5.2 배치 선택 표 — 위에서부터 처음 맞는 것.
 * @param {{ width: number, height: number, coarse: boolean }} view CSS px 창 크기, 터치 기기 여부
 * @returns {{ kind: "landscape" | "portrait", rotatePrompt: boolean }}
 */
export function chooseArrangement({ width, height, coarse }) {
  const shortSide = Math.min(width, height);
  // D3-14 휴대폰(터치 + 짧은 변 < 600)은 세로형만 — 가로로 들면 회전 안내 덮개(아래에서는 세로형이 계속 그려짐)
  if (coarse && shortSide < PHONE_SHORT_SIDE_PX) return { kind: "portrait", rotatePrompt: width > height };
  if (width / height >= 1.0) {
    // §5.2 최소 크기: 가로형 배율 < 0.55면 세로형으로
    const s = Math.min(width / VIRTUAL.landscape.width, height / VIRTUAL.landscape.height);
    if (s >= MIN_LANDSCAPE_SCALE) return { kind: "landscape", rotatePrompt: false };
  }
  return { kind: "portrait", rotatePrompt: false };
}

/**
 * §5.2 배율 = min(창 너비 / 가상 너비, 창 높이 / 가상 높이), 가운데 정렬 + 안전 영역 여백.
 * @param {{ width: number, height: number }} view
 * @param {"landscape" | "portrait"} kind
 * @param {{ top: number, right: number, bottom: number, left: number }} safe env(safe-area-inset-*) CSS px
 */
export function computeFit(view, kind, safe) {
  const v = VIRTUAL[kind];
  const availW = Math.max(1, view.width - safe.left - safe.right);
  const availH = Math.max(1, view.height - safe.top - safe.bottom);
  const scale = Math.min(availW / v.width, availH / v.height);
  const offsetX = safe.left + (availW - v.width * scale) / 2;
  const offsetY = safe.top + (availH - v.height * scale) / 2;
  // 화면 전체를 가상 좌표로 본 사각형 — 배경 P0가 레터박스 여백까지 이어 그려지게 (§5.2 "P0 그라데이션 연장")
  const screen = { x: -offsetX / scale, y: -offsetY / scale, width: view.width / scale, height: view.height / scale };
  // §5.2 세로형 배율 < 0.45 → "창을 키워 주세요" 안내 (DOM 몫 — 여기서는 판정만)
  const tooSmall = kind === "portrait" && scale < MIN_PORTRAIT_SCALE;
  return { kind, width: v.width, height: v.height, scale, offsetX, offsetY, screen, tooSmall };
}

/** env(safe-area-inset-*) 실측 — 숨긴 탐침 요소의 padding으로 읽는다 (§5.2 안전 영역). */
function readSafeArea() {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  try {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;"
      + "padding:env(safe-area-inset-top) env(safe-area-inset-right) "
      + "env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const out = {
      top: parseFloat(cs.paddingTop) || 0, right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0, left: parseFloat(cs.paddingLeft) || 0,
    };
    probe.remove();
    return out;
  } catch {
    return zero;
  }
}

/**
 * 창 크기 감시 → 배치·배율 계산 → Pixi 렌더러 크기·레터박스 컨테이너·DOM 오버레이 루트 동기화.
 * @param {{ pixi: { renderer: any, letterbox: any }, overlayRoot?: HTMLElement | null,
 *   onChange?: (fit: ReturnType<typeof computeFit> & { rotatePrompt: boolean, coarse: boolean }) => void }} options
 */
export function createLayout({ pixi, overlayRoot = null, onChange }) {
  const coarseQuery = typeof matchMedia === "function" ? matchMedia("(pointer: coarse)") : null;
  let timer = 0;
  /** @type {any} */ let current = null;

  function apply() {
    const view = { width: window.innerWidth, height: window.innerHeight };
    const coarse = !!coarseQuery?.matches;
    const choice = chooseArrangement({ ...view, coarse });
    const fit = { ...computeFit(view, choice.kind, readSafeArea()), rotatePrompt: choice.rotatePrompt, coarse };
    // 캔버스는 창 전체(여백까지 P0가 이어짐), 내용은 레터박스 컨테이너의 배율·원점으로
    pixi.renderer.resize(view.width, view.height);
    pixi.letterbox.scale.set(fit.scale);
    pixi.letterbox.position.set(fit.offsetX, fit.offsetY);
    if (overlayRoot) {
      // §5.2 DOM 오버레이 루트 = 가상 해상도 크기 + transform: scale(배율), 캔버스와 같은 원점
      const st = overlayRoot.style;
      st.position = "absolute";
      st.left = "0";
      st.top = "0";
      st.width = `${fit.width}px`;
      st.height = `${fit.height}px`;
      st.transformOrigin = "0 0";
      st.transform = `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale})`;
    }
    const kindChanged = !current || current.kind !== fit.kind;
    current = fit;
    // 배치 종류가 바뀌면 호출자가 HUD·보드를 다시 배치한다(게임 상태 유지 — §5.2 크기 변경)
    try {
      onChange?.({ ...fit, kindChanged });
    } catch (err) {
      console.error("layout onChange 실패", err);
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = window.setTimeout(apply, RESIZE_DEBOUNCE_MS);
  }

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  coarseQuery?.addEventListener?.("change", schedule);
  apply();

  return {
    /** 현재 배치·배율 */
    get current() {
      return current;
    },
    /** 즉시 다시 계산 (화면 진입 시) */
    refresh: apply,
    destroy() {
      clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      coarseQuery?.removeEventListener?.("change", schedule);
    },
  };
}
