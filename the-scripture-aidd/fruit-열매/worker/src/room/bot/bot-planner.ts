// TASK-012 · REQ-005 · FR-021 · D-11 — 봇 착지 후보 평가와 다음 조작 선택 (data-ark §8.8.10).
// 단일 책임: 착지 후보(엔진 board.js 공용 평가 — 지운 줄 + / 구멍·높이 합·울퉁불퉁함 −) 중 목표를 고르고, 목표까지의 다음 조작 1개를 정한다.
// "실수" = 차선 후보 중 무작위 선택 (난이도별 mistakeRate — balance.json bots).
import { enumeratePlacements } from '../../../../client/js/engine/board.js';

export interface Pose { type: number; rot: number; x: number; y: number }
export interface Placement extends Pose { lines: number; score: number }
export type BotStep = 'rotateCw' | 'rotateCcw' | 'left' | 'right' | 'drop';

const ROTATIONS = 4;

// FR-021 착지 목표 선택 — 최선 후보, 확률 mistakeRate로 차선 후보 중 무작위 (후보 없으면 null)
export function planPlacement(grid: string[][], type: number, mistakeRate: number, rand: () => number): Placement | null {
  const candidates = enumeratePlacements(grid, type) as Placement[];
  if (candidates.length === 0) return null;
  if (candidates.length > 1 && rand() < mistakeRate) {
    return candidates[1 + Math.floor(rand() * (candidates.length - 1))];
  }
  return candidates[0];
}

// FR-021 목표 자세까지 다음 조작 1개 — 회전 먼저(가까운 방향), 그다음 좌우, 맞으면 하드 드롭
export function nextStep(active: Pose, target: Pose): BotStep {
  if (active.rot !== target.rot) {
    const diff = (target.rot - active.rot + ROTATIONS) % ROTATIONS;
    return diff === ROTATIONS - 1 ? 'rotateCcw' : 'rotateCw';
  }
  if (active.x < target.x) return 'right';
  if (active.x > target.x) return 'left';
  return 'drop';
}
