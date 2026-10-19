// scoring.js — T-Spin(3코너)·콤보·B2B 판정 + 점수 계산만
// TASK-010-2 | REQ-001 FR-003 FR-004 | ARCH-002 | TBL-018 `scoring` | API-013 `combo`(0 = 첫 삭제)·`b2b`·`tspin`
// 순수 모듈 (D-12). 점수 수치는 rules.scoring에서만 읽는다.
import { T_CORNERS } from "./piece.js";
import { getCell } from "./board.js";

/**
 * @typedef {{ combo: number, lastDifficult: boolean, score: number }} ScoreState
 *   combo: −1 = 콤보 없음(API-012), 0 = 첫 삭제 / lastDifficult: 직전 줄 삭제가 테트리스·T-Spin이었는가
 */

/** @returns {ScoreState} */
export function createScoreState() {
  return { combo: -1, lastDifficult: false, score: 0 };
}

/**
 * T-Spin 판정 (FR-004): T 블록 + 마지막 조작이 회전 + T 상자 네 모서리 중 3개 이상이 막힘(벽·바닥 포함).
 * @param {import("./board.js").Board} board 고정 직전 보드
 * @param {{type: string, x: number, y: number, rot: number}} piece
 * @param {boolean} lastMoveWasRotation
 * @returns {boolean}
 */
export function detectTSpin(board, piece, lastMoveWasRotation) {
  if (piece.type !== "T" || !lastMoveWasRotation) return false;
  let blocked = 0;
  for (const [cx, cy] of T_CORNERS) {
    if (getCell(board, piece.x + cx, piece.y + cy) !== 0) blocked += 1;
  }
  return blocked >= 3;
}

/**
 * 블록 1개 고정 결과를 점수 상태에 반영 (FR-004 콤보·B2B·점수).
 * - 줄 삭제가 있으면 콤보 +1(첫 삭제 0), 없으면 콤보 끊김(−1).
 * - B2B: 이번 삭제가 테트리스 또는 T-Spin이고 직전 삭제도 그랬을 때 (spec-tablet §9.8 #8, API-013 검증 규칙).
 * - 점수: T-Spin이면 scoring.tspin[lines], 아니면 scoring.lines[lines] → B2B면 ×b2bMultiplier → + comboPer×combo.
 * @param {ScoreState} state
 * @param {{ lines: number, tspin: boolean }} result
 * @param {{ lines: Record<string, number>, tspin: Record<string, number>, b2bMultiplier: number, comboPer: number }}
 * scoring rules.scoring
 * @returns {{ combo: number, b2b: boolean, points: number, difficult: boolean }}
 */
export function applyLockResult(state, result, scoring) {
  const { lines, tspin } = result;
  if (lines === 0) {
    state.combo = -1;
    // FR-004 T-Spin(줄 없음)도 점수 — B2B 상태는 줄 삭제가 아니므로 유지
    const points = tspin ? scoring.tspin["0"] : 0;
    state.score += points;
    return { combo: -1, b2b: false, points, difficult: false };
  }
  state.combo += 1;
  const difficult = lines === 4 || tspin;
  const b2b = difficult && state.lastDifficult;
  state.lastDifficult = difficult;
  let base = tspin ? scoring.tspin[String(lines)] : scoring.lines[String(lines)];
  // FR-004 rules.scoring.b2bMultiplier
  if (b2b) base *= scoring.b2bMultiplier;
  // FR-004 rules.scoring.comboPer (콤보 0 = 첫 삭제는 보너스 없음)
  const points = Math.round(base + scoring.comboPer * state.combo);
  state.score += points;
  return { combo: state.combo, b2b, points, difficult };
}

/**
 * 드롭 점수 (FR-003 rules.scoring.softDropPerCell / hardDropPerCell).
 * @param {ScoreState} state
 * @param {number} cells 내려간 칸 수
 * @param {"soft" | "hard"} kind
 * @param {{ softDropPerCell: number, hardDropPerCell: number }} scoring
 * @returns {number}
 */
export function addDropPoints(state, cells, kind, scoring) {
  const points = cells * (kind === "hard" ? scoring.hardDropPerCell : scoring.softDropPerCell);
  state.score += points;
  return points;
}
