// TASK-011-1 · FR-011 · FR-034 · FR-035 · FR-037 · FR-064 — 키보드 → 동작 변환 (design-vision §4.3, DAS/ARR = balance.json input).
// 단일 책임: KeyboardEvent.code를 동작 문자열로 바꾸고 좌우 자동 반복(DAS 150ms → ARR 33ms)을 만든다. 판정·송신 없음.
// 동작: left·right·softDropStart·softDropEnd·hardDrop·rotateCw·rotateCcw·hold·skill·angel:<id>·armor:<id>·reaction:<id>·pause·quiz:<0~3>
import { ANGEL_IDS, ARMOR_IDS, REACTION_IDS } from '../net/protocol.js';

const FIXED = Object.freeze({
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'softDropStart', Space: 'hardDrop',
  ArrowUp: 'rotateCw', KeyX: 'rotateCw', KeyZ: 'rotateCcw', ControlLeft: 'rotateCcw', ControlRight: 'rotateCcw',
  KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold', KeyA: 'skill', Escape: 'pause', KeyP: 'pause',
});
/** 갑주 키 Q~Y = CODE-006 순서 · 천사 키 1~5 = CODE-004 순서 · 리액션 7~9 = CODE-010 순서 */
const ARMOR_KEYS = Object.freeze(['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY']);
const ANGEL_KEYS = Object.freeze(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']);
const REACTION_KEYS = Object.freeze(['Digit7', 'Digit8', 'Digit9']);
const QUIZ_CHOICES = 4;
/** SCR-005에서만 브라우저 기본 동작(스크롤·단축키)을 막는 키 */
const PREVENT_DEFAULT = Object.freeze(new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ControlLeft', 'ControlRight']));

/**
 * FR-011 키 코드 → 동작. 말씀 대결 중에는 1~4가 보기 선택 (천사 키와 겹치지 않음 — design-vision §4.3)
 * @returns {string|null}
 */
export function mapKey(code, { quizActive = false } = {}) {
  if (quizActive) {
    const q = ANGEL_KEYS.indexOf(code);
    if (q >= 0 && q < QUIZ_CHOICES) return `quiz:${q}`;
  }
  if (FIXED[code]) return FIXED[code];
  const angel = ANGEL_KEYS.indexOf(code);
  if (angel >= 0) return `angel:${ANGEL_IDS[angel]}`;
  const armor = ARMOR_KEYS.indexOf(code);
  if (armor >= 0) return `armor:${ARMOR_IDS[armor]}`;
  const reaction = REACTION_KEYS.indexOf(code);
  if (reaction >= 0) return `reaction:${REACTION_IDS[reaction]}`;
  return null;
}

/**
 * FR-011 좌우 자동 반복 계산 (순수) — 누른 지 elapsedMs일 때까지 나와야 할 반복 횟수 (최초 1회 제외)
 */
export function repeatCount(elapsedMs, dasMs, arrMs) {
  if (elapsedMs < dasMs) return 0;
  return arrMs > 0 ? Math.floor((elapsedMs - dasMs) / arrMs) + 1 : 1;
}

/**
 * FR-011 키보드 입력기.
 * @param {{ target: EventTarget, onAction: (action:string)=>void, dasMs:number, arrMs:number, isQuizActive?: ()=>boolean, clock?: ()=>number }} opts
 * @returns {{ update(now:number): void, releaseAll(): void, dispose(): void }}
 */
export function createKeyboardInput({ target, onAction, dasMs, arrMs, isQuizActive = () => false, clock = () => Date.now() }) {
  const held = new Set();
  let horizontal = null; // { action, pressedAt, emitted }

  const fire = (action) => {
    try {
      onAction(action);
    } catch (err) {
      console.error('input-keyboard', err?.message);
    }
  };

  function onKeyDown(e) {
    const action = mapKey(e.code, { quizActive: isQuizActive() });
    if (!action) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat || held.has(e.code)) return; // 브라우저 자체 반복 무시 — DAS/ARR은 직접 계산
    held.add(e.code);
    if (action === 'left' || action === 'right') horizontal = { code: e.code, action, pressedAt: clock(), emitted: 0 };
    fire(action);
  }

  function onKeyUp(e) {
    if (!held.delete(e.code)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    const action = mapKey(e.code, { quizActive: false });
    if (action === 'softDropStart') fire('softDropEnd');
    if (horizontal && horizontal.code === e.code) {
      // 반대쪽 키가 아직 눌려 있으면 그쪽으로 다시 DAS 시작
      const other = [...held].find((code) => FIXED[code] === 'left' || FIXED[code] === 'right');
      horizontal = other ? { code: other, action: FIXED[other], pressedAt: clock(), emitted: 0 } : null;
    }
  }

  function releaseAll() {
    if ([...held].some((code) => FIXED[code] === 'softDropStart')) fire('softDropEnd');
    held.clear();
    horizontal = null;
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', releaseAll);

  return {
    // FR-011 프레임마다 호출 — DAS/ARR 반복 발생
    update(now) {
      if (!horizontal) return;
      const due = repeatCount(now - horizontal.pressedAt, dasMs, arrMs);
      while (horizontal && horizontal.emitted < due) {
        horizontal.emitted += 1;
        fire(horizontal.action);
      }
    },
    releaseAll,
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', releaseAll);
      held.clear();
      horizontal = null;
    },
  };
}
