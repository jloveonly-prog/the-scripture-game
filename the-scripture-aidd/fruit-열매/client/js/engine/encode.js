// TASK-004 · FR-006 · FR-008 · CODE-009 — 보드 압축 문자열(200자) ↔ 격자 변환 (동형: 엔진·렌더·서버 판정·봇 공용).
// 단일 책임: `state.board` 형식 변환만. 격자 = 20행 × 10열 셀 코드 문자('0'~'9','a'~'i'), 0행이 맨 위.
// 보드 문자열에는 고정 블록만 담는다 — 낙하 중 블록은 `state.active`로 따로 보낸다 (api-gate API-203).

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
const BOARD_PATTERN = /^[0-9a-i]{200}$/;

/** 빈 격자 (모든 칸 '0') */
export function createEmptyGrid() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill('0'));
}

/** 형식 검사 — 정확히 200자, CODE-009 문자만 */
export function isValidBoardString(board) {
  return typeof board === 'string' && BOARD_PATTERN.test(board);
}

/** 격자 → 200자 문자열 (위→아래, 왼→오른) */
export function encodeBoard(grid) {
  if (!Array.isArray(grid) || grid.length !== BOARD_ROWS) throw new RangeError('encodeBoard: 20행 격자가 아닙니다');
  let out = '';
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== BOARD_COLS) throw new RangeError('encodeBoard: 10열 행이 아닙니다');
    out += row.join('');
  }
  if (!BOARD_PATTERN.test(out)) throw new RangeError('encodeBoard: 허용되지 않은 셀 코드');
  return out;
}

/** 200자 문자열 → 격자 (형식 오류는 RangeError) */
export function decodeBoard(board) {
  if (!isValidBoardString(board)) throw new RangeError('decodeBoard: 보드 문자열 형식 오류');
  const grid = [];
  for (let r = 0; r < BOARD_ROWS; r += 1) grid.push(board.slice(r * BOARD_COLS, (r + 1) * BOARD_COLS).split(''));
  return grid;
}

/** 문자열에서 한 칸 읽기 (범위 밖은 null) */
export function cellAt(board, row, col) {
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return null;
  return board[row * BOARD_COLS + col];
}
