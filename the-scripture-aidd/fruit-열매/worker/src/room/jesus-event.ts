// TASK-021-5 · FR-039 · C-002 · D-18 · R-15 — "세상을 이기었노라" 이벤트 조건(게이지 100 + 위험선)·경기당 1회·효과 지시.
// 단일 책임: 발동 판정과 effect 데이터 생성. 예수님은 선택 캐릭터가 아니며 시스템이 자동 발동한다 (게이지 미소모).
import { CELL, EFFECT_CATEGORIES, JESUS_EFFECT_ID } from '../../../client/js/net/protocol.js';
import { BOARD_COLS, BOARD_ROWS, isValidBoardString } from '../../../client/js/engine/encode.js';
import { isBoardStringInDanger } from '../../../client/js/engine/danger.js';
import { balance } from '../content';
import type { RoomMode } from '../env';

/** TBL-106 예수님 이벤트 구절 (api-gate API-255 예시 — 첫 구절을 자막 verseRef로, John 1:5는 클라이언트 연출이 함께 표시) */
export const JESUS_VERSE_REF = 'John 16:33';
/** api-gate API-255 예시 durationMs 4000 (balance.json에 키 없음 — 연출 지속값을 이름 있는 상수로 둔다) */
export const JESUS_EFFECT_MS = 4000;

export interface JesusInput {
  mode: RoomMode;
  faith: number;
  jesusUsed: boolean;
  /** 최신 state.board (클라이언트 보고값 — R-15) */
  board: string | null;
}

// FR-039 발동 조건: 대전(사람·봇) · 경기당 1회 · 게이지 100 · 최신 보드가 위험선 진입
export function shouldTriggerJesus(input: JesusInput): boolean {
  if (input.mode === 'practice' || input.jesusUsed) return false;
  if (input.faith < balance.faith.max) return false;
  if (input.board === null || !isValidBoardString(input.board)) return false;
  return isBoardStringInDanger(input.board, balance.input.dangerRows);
}

// FR-039 보드의 쓰레기 줄 수 (쓰레기 셀 코드가 있는 줄)
export function countGarbageRows(board: string | null): number {
  if (board === null || !isValidBoardString(board)) return 0;
  let rows = 0;
  for (let r = 0; r < BOARD_ROWS; r += 1) {
    if (board.slice(r * BOARD_COLS, (r + 1) * BOARD_COLS).includes(CELL.GARBAGE)) rows += 1;
  }
  return rows;
}

// FR-039 효과 지시: 모든 저주·암전 제거 + 쓰레기 줄 절반(내림) 제거
export function buildJesusAction(board: string | null): { type: 'overcome'; clearCurses: true; clearVision: true; removeGarbageRows: number } {
  return { type: 'overcome', clearCurses: true, clearVision: true, removeGarbageRows: Math.floor(countGarbageRows(board) / 2) };
}

/** 예수님 이벤트가 해제하는 범주 = "내 보드의 모든 저주와 암전" (봉인 seal은 보드 효과가 아니므로 제외) */
const SEAL_CATEGORY = 'seal';
export function jesusClearedCategories(): string[] {
  return EFFECT_CATEGORIES.filter((c: string) => c !== SEAL_CATEGORY);
}

export const jesusEffectId = (): string => JESUS_EFFECT_ID;
