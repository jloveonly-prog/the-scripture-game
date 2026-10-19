// placement.ts — 엔진 착지 후보·평가 위에 난이도(evalNoise·mistakeRate·lineBias) 적용만
// TASK-019 | REQ-005 FR-021 | ARCH-013 | D-10 | TBL-018 `bot` (evalNoise·mistakeRate·lineBias·biasMaxHeight — DCL-006)
// ·`placement.weights` | task-wall A-05
// (Node에서 import 가능)
// RTM §5 DCL-004: 착지 후보 열거·보드 평가는 엔진(ARCH-002 client/js/engine/placement.js)이 맡고 — 솔로몬·가브리엘 힌트와 같은
// 함수 — 이 파일은 그 점수에 난이도 노이즈·실수율·줄 수 보정만 더한다 (D-12 엔진 이중 구현 금지). 봇은 홀드·T-Spin 기술 없음 (OQ #6).
import { board as engineBoard, placement as enginePlacement } from "../../../client/js/engine/index.js";
import type { Rules } from "../content";

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

/** 난이도 1단계의 착지 판단 수치 (TBL-018 `bot.<level>` — lineBias·biasMaxHeight는 RTM §5 DCL-006) */
export interface BotJudgement {
  evalNoise: number;
  mistakeRate: number;
  /** 지운 줄 수(0~4)별 엔진 점수 보정 — 한 줄씩 지우지 않고 모아서 지우는 "공격 설계" (FR-024: 1줄 공격 0) */
  lineBias: readonly number[];
  /** 가장 높은 열이 이 높이를 넘으면 lineBias를 접고 생존 우선 */
  biasMaxHeight: number;
}

/**
 * FR-021 착지 판단 품질 중 공격 설계 (봇 전용 보정 — 엔진 점수와 솔로몬·가브리엘 힌트는 그대로):
 * 쌓인 높이가 biasMaxHeight 이하일 때만 지운 줄 수별 lineBias를 더한다.
 * @returns 엔진 점수에 더할 값 (같은 단위)
 */
function lineBiasOf(c: Placement, level: BotJudgement, stackHeight: number): number {
  if (stackHeight > level.biasMaxHeight) return 0;
  return level.lineBias[c.linesCleared] ?? 0;
}

/**
 * FR-021 난이도별 착지 판단: 엔진 점수(rules.placement.weights) + 줄 수 보정(lineBias)을 0~1로 정규화한 뒤 ±evalNoise
 * 무작위를 더해 최고를 고르고, mistakeRate 확률로는 아무 후보나 고른다 (쉬움 = 실수 잦음 — UC-005 4a).
 * @param random [0,1) 서버 무작위 (주입 — 테스트 결정성)
 * @returns 후보가 없으면 null (그대로 하드 드롭)
 */
export function choosePlacement(
  board: EngineBoard, type: string, level: BotJudgement,
  weights: Rules["placement"]["weights"], random: () => number,
): Placement | null {
  const stackHeight = Math.max(...engineBoard.columnHeights(board));
  const candidates: Placement[] = enginePlacement.enumeratePlacements(board, type, weights)
    .map((c: Placement) => ({ ...c, score: c.score + lineBiasOf(c, level, stackHeight) }));
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
