// board-codec.js — 보드 ↔ 200자 문자열(CODE-009) 인코딩/디코딩만
// TASK-011 | REQ-001 FR-006 | API-012 `state.board` · API-020 `opponentState.board` | CODE-009 | ARCH-003
// 형식: 행 우선(위→아래), 칸마다 숫자 1자 0~9 (0 빈칸, 1~7 IOTSZJL, 8 쓰레기, 9 납 블록). 길이 = width × height.

/**
 * 칸 배열 → 문자열 (API-012).
 * @param {ArrayLike<number>} cells
 * @returns {string}
 */
export function encodeBoard(cells) {
  let out = "";
  for (let i = 0; i < cells.length; i += 1) {
    const c = cells[i];
    if (!Number.isInteger(c) || c < 0 || c > 9) throw new RangeError(`CODE-009 범위 밖 칸 값 ${c} @${i}`);
    out += String(c);
  }
  return out;
}

/**
 * 문자열이 CODE-009 보드인가 — 정확히 width × height자, [0-9]만 (API-012 검증 규칙).
 * @param {unknown} text @param {number} width @param {number} height
 * @returns {boolean}
 */
export function isBoardString(text, width, height) {
  return typeof text === "string" && text.length === width * height && /^[0-9]*$/.test(text);
}

/**
 * 문자열 → 칸 배열 (API-020 상대 보드 표시용).
 * @param {string} text @param {number} width rules.board.width @param {number} height rules.board.height
 * @returns {number[]}
 */
export function decodeBoard(text, width, height) {
  if (!isBoardString(text, width, height)) throw new RangeError("CODE-009 보드 문자열 형식 오류");
  const cells = new Array(text.length);
  for (let i = 0; i < text.length; i += 1) cells[i] = text.charCodeAt(i) - 48;
  return cells;
}
