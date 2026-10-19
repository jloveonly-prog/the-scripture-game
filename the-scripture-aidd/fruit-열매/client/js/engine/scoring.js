// TASK-010-3 · FR-004 · R-06 · R-07 · R-08 — 줄 삭제 판정(콤보·B2B·T-Spin)과 점수 (동형 순수 모듈).
// 단일 책임: 고정 1회의 결과를 판정한다. 공격력·악한 영은 서버(attack.ts)만 계산한다 (R-01).
// 점수 배점은 정경(balance.json)에 없어 화면 표시용 가이드라인 표준 배점을 이름 있는 상수로 둔다 (공격력과 무관).
import { BOARD_COLS, BOARD_ROWS } from './encode.js';
import { PIECE_TYPES } from './pieces.js';
import { CELL, LIMITS } from '../net/protocol.js';

/** 줄 수별 배점 (0~4줄) */
export const LINE_POINTS = Object.freeze([0, 100, 300, 500, 800]);
/** T-Spin 줄 수별 배점 (0~3줄) */
export const TSPIN_POINTS = Object.freeze([400, 800, 1200, 1600]);
/** B2B 배율 · 콤보 1당 가산 · 드롭 1칸 배점 */
export const B2B_MULTIPLIER = 1.5;
export const COMBO_POINTS = 50;
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

const TYPE_T = PIECE_TYPES.indexOf('T') + 1;
/** T 상자(3×3) 네 모서리 [행, 열] */
const T_CORNERS = Object.freeze([[0, 0], [0, 2], [2, 0], [2, 2]]);

/** 판정 상태 초기값 — combo −1 = 콤보 아님, b2bReady = 직전 삭제가 테트리스·T-Spin */
export function createScoringState() {
  return { combo: -1, b2bReady: false, score: 0 };
}

/**
 * FR-004 T-Spin 판정 (3모서리 규칙) — T 블록, 마지막 성공 동작이 회전, 고정 전 격자에서 T 상자 네 모서리 중 3개 이상이 막힘(벽·바닥 포함).
 */
export function isTSpin(grid, active, lastActionWasRotate) {
  if (!active || active.type !== TYPE_T || !lastActionWasRotate) return false;
  let blocked = 0;
  for (const [dr, dc] of T_CORNERS) {
    const r = active.y + dr;
    const c = active.x + dc;
    if (c < 0 || c >= BOARD_COLS || r >= BOARD_ROWS) blocked += 1;
    else if (r >= 0 && grid[r][c] !== CELL.EMPTY) blocked += 1;
  }
  return blocked >= 3;
}

/**
 * FR-004 고정 1회 판정. lines ≥ 1이면 `clear`(API-204) 필드(combo·b2b·tspin)를, 0이면 콤보 끊김 여부를 돌려준다.
 * @param {{combo:number, b2bReady:boolean, score:number}} prev
 * @param {{lines:number, tspin:boolean}} result
 * @returns {{state, combo:number, b2b:boolean, tspin:boolean, points:number, comboBroken:boolean}}
 */
export function judgeLock(prev, { lines, tspin }) {
  const state = { ...prev };
  if (!Number.isInteger(lines) || lines < 0 || lines > 4) throw new RangeError('judgeLock: lines 0~4');
  const tspinValid = Boolean(tspin) && lines <= 3; // R-08
  if (lines === 0) {
    const comboBroken = prev.combo >= 1;
    state.combo = -1;
    const points = tspinValid ? TSPIN_POINTS[0] : 0;
    state.score = clampScore(state.score + points);
    return { state, combo: 0, b2b: false, tspin: tspinValid, points, comboBroken };
  }
  const difficult = lines === 4 || tspinValid;
  const b2b = difficult && prev.b2bReady; // R-07: 직전 삭제가 테트리스·T-Spin이고 사이에 다른 종류 삭제 없음
  state.b2bReady = difficult;
  state.combo = Math.min(prev.combo + 1, LIMITS.COMBO_MAX); // R-06: 연속 삭제 블록 수 − 1
  let base = tspinValid ? TSPIN_POINTS[lines] : LINE_POINTS[lines];
  if (b2b) base = Math.floor(base * B2B_MULTIPLIER);
  const points = base + COMBO_POINTS * state.combo;
  state.score = clampScore(state.score + points);
  return { state, combo: state.combo, b2b, tspin: tspinValid, points, comboBroken: false };
}

/** FR-004 드롭 배점 가산 (소프트 1칸 1점, 하드 1칸 2점) */
export function addDropPoints(prev, cells, hard) {
  const per = hard ? HARD_DROP_POINTS : SOFT_DROP_POINTS;
  return { ...prev, score: clampScore(prev.score + Math.max(0, cells) * per) };
}

function clampScore(score) {
  return Math.min(Math.max(0, Math.floor(score)), LIMITS.SCORE_MAX);
}
