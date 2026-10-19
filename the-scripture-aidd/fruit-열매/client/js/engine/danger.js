// TASK-004 · FR-055 · FR-039 · FR-046 · OQ #7 · D-18 — 위험선(보드 상단 4줄) 판정과 쌓인 높이 (동형: 클라이언트 위기 연출·만나 확률·서버 예수님 이벤트 공용).
// 단일 책임: 고정 블록 격자/문자열에서 위기 여부와 높이를 계산한다.
import { BOARD_COLS, BOARD_ROWS, decodeBoard } from './encode.js';

/** data-ark §8.8.8 위험선 = 상단 4줄 (= balance.json input.dangerRows) */
export const DEFAULT_DANGER_ROWS = 4;

/** 상단 `dangerRows`줄에 고정 블록이 1칸 이상이면 위기 */
export function isInDanger(grid, dangerRows = DEFAULT_DANGER_ROWS) {
  for (let r = 0; r < Math.min(dangerRows, BOARD_ROWS); r += 1) {
    for (let c = 0; c < BOARD_COLS; c += 1) if (grid[r][c] !== '0') return true;
  }
  return false;
}

/** 200자 보드 문자열 기준 위기 판정 (서버 jesus-event — 최신 `state.board`) */
export function isBoardStringInDanger(board, dangerRows = DEFAULT_DANGER_ROWS) {
  return isInDanger(decodeBoard(board), dangerRows);
}

/** 쌓인 높이 = 바닥에서 가장 높은 고정 칸까지의 줄 수 (빈 보드 0, 꽉 차면 20) — 만나 확률 "12줄 이상" 판정 */
export function stackHeight(grid) {
  for (let r = 0; r < BOARD_ROWS; r += 1) {
    for (let c = 0; c < BOARD_COLS; c += 1) if (grid[r][c] !== '0') return BOARD_ROWS - r;
  }
  return 0;
}
