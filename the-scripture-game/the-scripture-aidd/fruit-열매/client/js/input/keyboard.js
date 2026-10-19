// keyboard.js — 키 → 게임 명령 변환·DAS/ARR 반복만
// TASK-063 | REQ-001 FR-002 FR-003 FR-011 FR-034 FR-035 FR-037 FR-041 FR-064 | ARCH-007 | design-vision §4.3 기본 키 배치 |
// TBL-018 `engine.dasMs`·`arrMs` | D3-06 (키 재설정 없음)
// KeyboardEvent.code(물리 키)로 판정 — 한글 IME 상태에서도 같은 키. 대전 중 화살표·Space·숫자 기본 동작은 막는다.
// 이동·소프트 드롭 외의 키는 event.repeat를 무시한다. 이동 반복은 이 파일의 DAS/ARR (OS 키 반복 사용 안 함).
import { rules } from "../content.js";

/** §4.3 천사 1~5 (CODE-011 순서) · 갑주 Q~Y (Ephesians 6:14~17 순서) · 리액션 8·9·0 (CODE-014 순서) */
const ANGEL_KEYS = ["michael", "gabriel", "cherubim", "seraphim", "ministering_spirits"];
const ARMOR_KEYS = { KeyQ: "belt_of_truth", KeyW: "breastplate_of_righteousness", KeyE: "gospel_shoes",
  KeyR: "shield_of_faith", KeyT: "helmet_of_salvation", KeyY: "sword_of_the_spirit" };
const REACTION_KEYS = { Digit8: 0, Digit9: 1, Digit0: 2 };
/** 단발 엔진 명령 (FR-002·FR-003) */
const ENGINE_KEYS = { Space: "hardDrop", ArrowUp: "rotateCW", KeyX: "rotateCW", KeyZ: "rotateCCW",
  ControlLeft: "rotateCCW", KeyC: "hold", ShiftLeft: "hold" };
/** 브라우저 기본 동작을 막을 키 (스크롤 등) */
const BLOCK = /^(Arrow|Space|Digit|Numpad|Key[ZXCAQWERTY]$)/;

/**
 * @typedef {{ kind: "engine", cmd: string } | { kind: "skill" } | { kind: "angel", id: string } |
 *   { kind: "armor", id: string } | { kind: "reaction", id: string } | { kind: "quiz", choice: number } |
 *   { kind: "escape" }} Command
 * @param {{ onCommand: (c: Command) => void, quizOpen: () => boolean }} o
 */
export function createKeyboard({ onCommand, quizOpen }) {
  const das = rules.engine.dasMs; // FR-011 rules.engine.dasMs 150
  const arr = rules.engine.arrMs; // FR-011 rules.engine.arrMs 40
  /** @type {Array<"left" | "right">} 눌린 방향 (마지막에 누른 방향 우선) */
  let held = [];
  let charge = 0;
  let enabled = true;
  const emit = (c) => {
    try {
      onCommand(c);
    } catch (err) {
      console.error("키 명령 처리 실패", err);
    }
  };
  const typing = (t) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");

  /** @param {KeyboardEvent} e */
  function down(e) {
    if (typing(e.target) || e.altKey || e.metaKey) return;
    const code = e.code;
    if (code === "Escape") {
      if (!e.repeat) emit({ kind: "escape" });
      return;
    }
    if (!enabled) return;
    if (BLOCK.test(code)) e.preventDefault();
    const digit = /^(Digit|Numpad)([0-9])$/.exec(code);
    // FR-041 퀴즈 모달이 열린 동안 1~4 = 보기 (천사 키보다 우선, 천사 키 비활성)
    if (quizOpen()) {
      if (digit && !e.repeat && +digit[2] >= 1 && +digit[2] <= 4) emit({ kind: "quiz", choice: +digit[2] - 1 });
      return;
    }
    if (code === "ArrowLeft" || code === "ArrowRight") {
      const dir = code === "ArrowLeft" ? "left" : "right";
      if (e.repeat) return;
      held = held.filter((d) => d !== dir).concat(dir);
      charge = 0;
      emit({ kind: "engine", cmd: dir }); // 누른 즉시 1칸 → dasMs 후 arrMs마다
      return;
    }
    if (e.repeat) return;
    if (code === "ArrowDown") return emit({ kind: "engine", cmd: "softDropStart" });
    if (ENGINE_KEYS[code]) return emit({ kind: "engine", cmd: ENGINE_KEYS[code] });
    if (code === "KeyA") return emit({ kind: "skill" });
    if (ARMOR_KEYS[code]) return emit({ kind: "armor", id: ARMOR_KEYS[code] });
    if (code in REACTION_KEYS) return emit({ kind: "reaction", id: rules.reactions[REACTION_KEYS[code]].id });
    if (digit && +digit[2] >= 1 && +digit[2] <= 5) emit({ kind: "angel", id: ANGEL_KEYS[+digit[2] - 1] });
  }
  /** @param {KeyboardEvent} e */
  function up(e) {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      held = held.filter((d) => d !== (e.code === "ArrowLeft" ? "left" : "right"));
      charge = 0;
    } else if (e.code === "ArrowDown" && enabled) emit({ kind: "engine", cmd: "softDropEnd" });
  }
  function release() {
    if (held.length) held = [];
    emit({ kind: "engine", cmd: "softDropEnd" });
  }
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", release);

  return {
    /** DAS/ARR 반복 (Pixi 틱 dtMs — 히트스톱 중에는 멈춤) @param {number} dtMs */
    update(dtMs) {
      const dir = held[held.length - 1];
      if (!dir || !enabled) return;
      const before = charge;
      charge += dtMs;
      if (charge < das) return;
      // das 경계를 넘은 뒤 arr마다 1칸 (한 틱에 여러 칸 가능)
      const prevSteps = before < das ? 0 : Math.floor((before - das) / arr) + 1;
      const steps = Math.floor((charge - das) / arr) + 1;
      for (let i = prevSteps; i < steps; i += 1) emit({ kind: "engine", cmd: dir });
    },
    /** 일시정지·말씀 대결·라운드 대기 중 조작 막기 (Esc는 항상) @param {boolean} on */
    setEnabled(on) {
      enabled = on;
      if (!on) held = [];
    },
    destroy() {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
    },
  };
}
