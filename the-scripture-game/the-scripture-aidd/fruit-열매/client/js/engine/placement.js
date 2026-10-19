// placement.js — 착지 후보 열거·보드 평가·최적 착지 선택만 (솔로몬·가브리엘 착지 힌트 + 서버 봇 공용)
// TASK-019 | REQ-003 REQ-005 REQ-008 FR-015 FR-021 FR-035 | ARCH-002 ARCH-013 | D-12 | TBL-018 `placement.weights`
// RTM §5 DCL-004: "최적 착지 위치"의 정경 위치 = 순수 엔진. 클라이언트 힌트(SCR-005 MyBoard "고스트·힌트 ← 로컬 엔진")와
// 서버 봇(worker/src/bot/placement.ts — 여기에 난이도 노이즈만 더함)이 같은 함수를 쓴다 (엔진 이중 구현 금지).
// 후보 = 스폰 높이에서 회전·좌우 이동 후 하드 드롭으로 닿는 위치. 가중치는 rules.placement.weights (인자 주입).
// 순수 모듈 (D-12).
import { spawnPiece } from "./piece.js";
import { clearRows, cloneBoard, columnHeights, countHoles, findFullRows, fits, lockPiece } from "./board.js";

/**
 * @typedef {import("./board.js").Board} Board
 * @typedef {{ aggregateHeight: number, lines: number, holes: number, bumpiness: number }} PlacementWeights
 *   rules.placement.weights
 * @typedef {{ rot: number, x: number, y: number, linesCleared: number, score: number }} Placement
 */

/**
 * 보드 평가 — Σ 가중치 × 특징(집계 높이·지운 줄·구멍·울퉁불퉁함), 클수록 좋음 (TBL-018 placement.weights).
 * @param {Board} board 고정·줄 삭제 후 보드 @param {number} linesCleared @param {PlacementWeights} weights
 * @returns {number}
 */
export function evaluateBoard(board, linesCleared, weights) {
  const heights = columnHeights(board);
  let bumpiness = 0;
  for (let x = 1; x < heights.length; x += 1) bumpiness += Math.abs(heights[x] - heights[x - 1]);
  const aggregate = heights.reduce((a, b) => a + b, 0);
  return weights.aggregateHeight * aggregate + weights.lines * linesCleared
    + weights.holes * countHoles(board) + weights.bumpiness * bumpiness;
}

/**
 * 블록 1종의 모든 착지 후보 (회전 4 × 가능한 x) — 각 후보를 고정·줄 삭제한 결과 보드로 평가.
 * 같은 결과 보드는 한 번만, Top-out(보드 위에 고정)되는 후보는 제외한다.
 * @param {Board} board @param {string} type @param {PlacementWeights} weights
 * @returns {Placement[]}
 */
export function enumeratePlacements(board, type, weights) {
  const spawn = spawnPiece(type, board.width);
  const seen = new Set();
  const result = [];
  const rotations = type === "O" ? [0] : [0, 1, 2, 3];
  for (const rot of rotations) {
    for (let x = -2; x < board.width + 2; x += 1) {
      let piece = { type, x, y: spawn.y, rot };
      if (!fits(board, piece)) continue;
      while (fits(board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 };
      const sim = cloneBoard(board);
      if (lockPiece(sim, piece).lockOut) continue;
      const lines = clearRows(sim, findFullRows(sim));
      const key = sim.cells.join("");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ rot, x, y: piece.y, linesCleared: lines, score: evaluateBoard(sim, lines, weights) });
    }
  }
  return result;
}

/**
 * 최적 착지 1개 (FR-015 솔로몬 hintMs 동안·FR-035 가브리엘 pieces개 동안 매 블록의 힌트 위치). 동점이면 먼저 열거된 후보.
 * @param {Board} board @param {string} type 활성 블록 종류 @param {PlacementWeights} weights
 * @returns {Placement | null} 후보가 없으면 null (힌트 없음)
 */
export function bestPlacement(board, type, weights) {
  let best = null;
  for (const candidate of enumeratePlacements(board, type, weights)) {
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best;
}
