// TASK-011-1 · FR-011 · D3-13 — 터치 제스처 → 동작, 진동 피드백 (design-vision §4.4).
// 단일 책임: 내 보드 영역의 끌기·탭·쓸기를 키보드와 같은 동작 문자열로 바꾸고, 사건별 진동 패턴을 고른다. 판정·송신 없음.

/** design-vision §4.4 판정 기준 */
export const TAP_MAX_MOVE_PX = 10;
export const TAP_MAX_MS = 200;
export const SWIPE_VELOCITY_PX_PER_MS = 1.2;
export const SWIPE_MIN_CELLS = 2;
/** design-vision §4.4 진동 패턴 (ms) — 착지·하드 드롭 착지·공격 보냄·공격 받음 */
export const VIBRATION = Object.freeze({ land: 15, hardDrop: 25, attackSent: 20, attackHit: Object.freeze([40, 30, 40]) });

const patternLength = (p) => (Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p);

/**
 * FR-011·EVT-19 한 프레임에 겹친 진동 중 가장 긴 것 1개 (하드 드롭 착지는 일반 착지를 대신한다)
 * @param {Array<keyof VIBRATION>} kinds
 */
export function pickVibration(kinds) {
  let best = null;
  for (const kind of kinds) {
    const p = VIBRATION[kind];
    if (p !== undefined && (best === null || patternLength(p) > patternLength(best))) best = p;
  }
  return best;
}

/** FR-011 진동 — 미지원 기기는 아무것도 하지 않는다 */
export function vibrate(pattern, nav = globalThis.navigator) {
  if (pattern === null || pattern === undefined || !nav || typeof nav.vibrate !== 'function') return false;
  try {
    return nav.vibrate(Array.isArray(pattern) ? pattern.slice() : pattern);
  } catch (err) {
    console.error('vibrate', err?.message);
    return false;
  }
}

/**
 * FR-011 터치 입력기 (design-vision §4.4 제스처 표).
 * @param {{ surface: EventTarget, onAction: (a:string)=>void, getCellSize: ()=>number, clock?: ()=>number }} opts
 * @returns {{ dispose(): void }}
 */
export function createTouchInput({ surface, onAction, getCellSize, clock = () => Date.now() }) {
  let g = null; // { x0, y0, t0, stepX, maxTouches, moved, decided: null|'hard'|'soft'|'hold', acted }

  const fire = (action) => {
    try {
      onAction(action);
    } catch (err) {
      console.error('input-touch', err?.message);
    }
  };
  const cell = () => Math.max(1, Number(getCellSize()) || 1);

  function onStart(e) {
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (!g) g = { x0: t.clientX, y0: t.clientY, t0: clock(), stepX: t.clientX, maxTouches: e.touches.length, moved: 0, decided: null, acted: false };
    else g.maxTouches = Math.max(g.maxTouches, e.touches.length);
  }

  function onMove(e) {
    if (!g || e.touches.length !== 1) return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    const size = cell();
    const dx = t.clientX - g.x0;
    const dy = t.clientY - g.y0;
    g.moved = Math.max(g.moved, Math.hypot(dx, dy));
    if (g.decided === 'hard' || g.decided === 'hold') return;
    // 가로로 끌기 — 셀 너비만큼 움직일 때마다 1칸
    while (t.clientX - g.stepX >= size) { g.stepX += size; g.acted = true; fire('right'); }
    while (g.stepX - t.clientX >= size) { g.stepX -= size; g.acted = true; fire('left'); }
    if (g.decided) return;
    if (dy > SWIPE_MIN_CELLS * size) {
      const velocity = dy / Math.max(1, clock() - g.t0);
      g.decided = velocity > SWIPE_VELOCITY_PX_PER_MS ? 'hard' : 'soft';
      g.acted = true;
      fire(g.decided === 'hard' ? 'hardDrop' : 'softDropStart');
    } else if (-dy > SWIPE_MIN_CELLS * size) {
      g.decided = 'hold';
      g.acted = true;
      fire('hold');
    }
  }

  function onEnd(e) {
    if (!g || e.touches.length > 0) return; // 모든 손가락이 떨어질 때 판정
    if (e.cancelable) e.preventDefault();
    if (g.decided === 'soft') fire('softDropEnd');
    const quick = clock() - g.t0 < TAP_MAX_MS && g.moved < TAP_MAX_MOVE_PX;
    if (!g.acted && quick) fire(g.maxTouches >= 2 ? 'rotateCcw' : 'rotateCw');
    g = null;
  }

  function onCancel() {
    if (g && g.decided === 'soft') fire('softDropEnd');
    g = null;
  }

  const opts = { passive: false };
  surface.addEventListener('touchstart', onStart, opts);
  surface.addEventListener('touchmove', onMove, opts);
  surface.addEventListener('touchend', onEnd, opts);
  surface.addEventListener('touchcancel', onCancel, opts);

  return {
    dispose() {
      surface.removeEventListener('touchstart', onStart, opts);
      surface.removeEventListener('touchmove', onMove, opts);
      surface.removeEventListener('touchend', onEnd, opts);
      surface.removeEventListener('touchcancel', onCancel, opts);
      g = null;
    },
  };
}
