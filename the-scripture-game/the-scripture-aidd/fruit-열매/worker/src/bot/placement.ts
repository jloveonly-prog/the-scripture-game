// placement.ts — 착지 후보 열거·평가(높이·구멍·줄)·evalNoise 적용만
// TASK-019 | REQ-005 FR-021 | ARCH-013 | D-10 | TBL-018 `bot` (evalNoise·mistakeRate) | task-wall A-05 (Node에서 import
// 가능)
// 엔진(ARCH-002)을 상대 경로로 재사용한다 (D-12 — 엔진 이중 구현 금지). 후보는 스폰 높이에서 회전·좌우 이동 후 하드 드롭으로
// 닿는 위치만 본다(봇은 홀드·T-Spin 기술 없음 — OQ #6 봇은 블록을 놓고 말씀 대결에 답하기만).
import { board as B, spawnPiece } from "../../../client/js/engine/index.js";

/** 엔진 보드 (client/js/engine/board.js Board) */
export interface EngineBoard {
  width: number;
  height: number;
  cells: number[];
  marks: Array<{ kind: string; pieceIndex: number; armorId?: string } | null>;
}

export interface Placement {
  rot: number;
  x: number;
  /** 착지 y */
  y: number;
  linesCleared: number;
  /** 평가 점수 (클수록 좋음) */
  score: number;
}

/**
 * 보드 평가 가중치 — 공개 테트리스 AI 휴리스틱(집계 높이·지운 줄·구멍·울퉁불퉁함, Yiyuan Lee 2013 유전 알고리즘 결과값).
 * 게임 규칙 수치가 아니라 평가 알고리즘 상수다 (난이도 차이는 rules.bot의 evalNoise·mistakeRate·moveIntervalMs가 만든다 — FR-021).
 */
const WEIGHTS = Object.freeze({ aggregateHeight: -0.510066, lines: 0.760666, holes: -0.35663, bumpiness: -0.184483 });

/** 판 위 칸 → 특징값 4개로 점수 */
export function evaluateBoard(board: EngineBoard, linesCleared: number): number {
  const heights: number[] = B.columnHeights(board);
  let bumpiness = 0;
  for (let x = 1; x < heights.length; x += 1) bumpiness += Math.abs(heights[x] - heights[x - 1]);
  const aggregate = heights.reduce((a, b) => a + b, 0);
  return WEIGHTS.aggregateHeight * aggregate + WEIGHTS.lines * linesCleared
    + WEIGHTS.holes * B.countHoles(board) + WEIGHTS.bumpiness * bumpiness;
}

/**
 * 블록 1종의 모든 착지 후보 (회전 4 × 가능한 x) — 각 후보를 고정·줄 삭제한 결과 보드로 평가.
 * Top-out(보드 위에 고정)되는 후보는 제외한다.
 */
export function enumeratePlacements(board: EngineBoard, type: string): Placement[] {
  const spawn = spawnPiece(type, board.width);
  const seen = new Set<string>();
  const result: Placement[] = [];
  const rotations = type === "O" ? [0] : [0, 1, 2, 3];
  for (const rot of rotations) {
    for (let x = -2; x < board.width + 2; x += 1) {
      let piece = { type, x, y: spawn.y, rot };
      if (!B.fits(board, piece)) continue;
      while (B.fits(board, { ...piece, y: piece.y + 1 })) piece = { ...piece, y: piece.y + 1 };
      const sim = B.cloneBoard(board);
      if (B.lockPiece(sim, piece).lockOut) continue;
      const lines = B.clearRows(sim, B.findFullRows(sim));
      const key = sim.cells.join("");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ rot, x, y: piece.y, linesCleared: lines, score: evaluateBoard(sim, lines) });
    }
  }
  return result;
}

/**
 * FR-021 난이도별 착지 판단: 점수를 0~1로 정규화한 뒤 ±evalNoise 무작위를 더해 최고를 고르고,
 * mistakeRate 확률로는 아무 후보나 고른다 (쉬움 = 실수 잦음 — UC-005 4a).
 * @param random [0,1) 서버 무작위 (주입 — 테스트 결정성)
 * @returns 후보가 없으면 null (그대로 하드 드롭)
 */
export function choosePlacement(
  board: EngineBoard, type: string, level: { evalNoise: number; mistakeRate: number }, random: () => number,
): Placement | null {
  const candidates = enumeratePlacements(board, type);
  if (candidates.length === 0) return null;
  if (random() < level.mistakeRate) return candidates[Math.min(candidates.length - 1,
    Math.floor(random() * candidates.length))];
  const scores = candidates.map((c) => c.score);
  const min = Math.min(...scores);
  const span = Math.max(...scores) - min || 1;
  let best = candidates[0];
  let bestValue = -Infinity;
  for (const c of candidates) {
    const value = (c.score - min) / span + level.evalNoise * (random() * 2 - 1);
    if (value > bestValue) {
      bestValue = value;
      best = c;
    }
  }
  return best;
}
