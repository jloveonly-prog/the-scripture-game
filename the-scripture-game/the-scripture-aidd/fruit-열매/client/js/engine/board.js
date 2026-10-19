// board.js — 보드 격자 연산만 (충돌·고정·줄 삭제·구멍 쓰레기 삽입·납 블록 줄·구멍 뚫기·밀어올림·위험선 판정)
// TASK-010-2 | REQ-001 FR-001 FR-003 FR-004 FR-025 FR-029 FR-055 | ARCH-002 | CODE-009 | TBL-018 `board`
// 보드 = { width, height, cells, marks }. cells는 행 우선(위→아래) CODE-009 셀 코드 배열 (API-012 board 200자와 같은 순서),
// marks는 같은 칸 순서의 특수·갑주 칸 표식(FR-036·FR-044~FR-046 — 칸과 함께 움직이고, 그 줄이 지워질 때 보고된다).
// y < 0(보드 위)은 비어 있는 공간으로 본다 — 블록은 위로 삐져나와 움직일 수 있고, 그 상태로 고정되면 Top-out.
// 순수 모듈 (D-12).
import { CELL, cellCode, pieceCells } from "./piece.js";

/**
 * @typedef {{ kind: string, pieceIndex: number, armorId?: string }} Mark CODE-013 특수 칸 표식
 * @typedef {{ width: number, height: number, cells: number[], marks: Array<Mark | null> }} Board
 * @typedef {{ type: string, x: number, y: number, rot: number }} Piece
 */

/** 빈 보드 (FR-001 10×20 — 크기는 rules.board). @param {number} width @param {number} height @returns {Board} */
export function createBoard(width, height) {
  const size = width * height;
  return { width, height, cells: new Array(size).fill(CELL.EMPTY), marks: new Array(size).fill(null) };
}

/** @param {Board} board @returns {Board} */
export function cloneBoard(board) {
  return { width: board.width, height: board.height, cells: board.cells.slice(), marks: board.marks.slice() };
}

/** 칸 값. 좌우·바닥 밖은 -1(벽), 보드 위(y<0)는 빈칸. @param {Board} board @param {number} x @param {number} y @returns {number} */
export function getCell(board, x, y) {
  if (x < 0 || x >= board.width || y >= board.height) return -1;
  if (y < 0) return CELL.EMPTY;
  return board.cells[y * board.width + x];
}

/**
 * 칸 쓰기 — 빈칸으로 만들면 표식도 지운다.
 * @param {Board} board @param {number} x @param {number} y @param {number} value @param {Mark | null} [mark]
 */
function setCell(board, x, y, value, mark = null) {
  if (x < 0 || x >= board.width || y < 0 || y >= board.height) return;
  board.cells[y * board.width + x] = value;
  board.marks[y * board.width + x] = value === CELL.EMPTY ? null : mark;
}

/** 블록이 충돌 없이 들어가는가 (FR-002·FR-003). @param {Board} board @param {Piece} piece @returns {boolean} */
export function fits(board, piece) {
  return pieceCells(piece).every(([x, y]) => getCell(board, x, y) === CELL.EMPTY);
}

/**
 * 블록 고정. 보드 위(y<0)에 걸린 칸이 있으면 lockOut = true (Top-out, UC-007 E3).
 * @param {Board} board @param {Piece} piece
 * @param {{ cellIndex: number, mark: Mark } | null} [special] 블록 4칸 중 cellIndex번째 칸에 붙일 특수 표식 (engine/specials.js)
 * @returns {{ lockOut: boolean }}
 */
export function lockPiece(board, piece, special = null) {
  const code = cellCode(piece.type);
  let lockOut = false;
  pieceCells(piece).forEach(([x, y], i) => {
    if (y < 0) lockOut = true;
    else setCell(board, x, y, code, special && special.cellIndex === i ? special.mark : null);
  });
  return { lockOut };
}

/** @param {Board} board @param {number} y @returns {number[]} */
function row(board, y) {
  return board.cells.slice(y * board.width, (y + 1) * board.width);
}

/**
 * 행 목록에 있는 특수 표식 (지운 줄의 특수 칸 — API-013 `specials`).
 * @param {Board} board @param {number[]} rows
 * @returns {Array<Mark & { x: number, y: number }>}
 */
export function marksInRows(board, rows) {
  const found = [];
  for (const y of rows) {
    for (let x = 0; x < board.width; x += 1) {
      const mark = board.marks[y * board.width + x];
      if (mark) found.push({ ...mark, x, y });
    }
  }
  return found;
}

/**
 * 완성된 가로줄 (FR-004). 납 블록이 든 줄은 지워지지 않는다 (FR-029 "지워지지 않는 회색 납 블록").
 * @param {Board} board
 * @returns {number[]} 행 번호 (위→아래)
 */
export function findFullRows(board) {
  const full = [];
  for (let y = 0; y < board.height; y += 1) {
    const cells = row(board, y);
    if (cells.every((c) => c !== CELL.EMPTY) && !cells.includes(CELL.LEAD)) full.push(y);
  }
  return full;
}

/**
 * 행 목록을 지우고 위를 내린다. blasts가 있으면 먼저 지워지지 않는 줄의 (2r+1)×(2r+1) 범위 칸을 비운다
 * (FR-045 여리고 나팔 "주변 3×3 블록 폭파", UC-014 E1 보드 밖 칸 무시).
 * @param {Board} board
 * @param {number[]} rows findFullRows 결과
 * @param {Array<{x: number, y: number, radius: number}>} [blasts]
 * @returns {number} 지운 줄 수
 */
export function clearRows(board, rows, blasts = []) {
  const removing = new Set(rows);
  for (const blast of blasts) {
    for (let y = blast.y - blast.radius; y <= blast.y + blast.radius; y += 1) {
      if (removing.has(y)) continue;
      for (let x = blast.x - blast.radius; x <= blast.x + blast.radius; x += 1) {
        if (getCell(board, x, y) > CELL.EMPTY && getCell(board, x, y) !== CELL.LEAD) setCell(board, x, y, CELL.EMPTY);
      }
    }
  }
  removeRows(board, removing);
  return removing.size;
}

/** @param {Board} board @param {Set<number>} removing */
function removeRows(board, removing) {
  const kept = [];
  const keptMarks = [];
  for (let y = 0; y < board.height; y += 1) {
    if (removing.has(y)) continue;
    kept.push(...row(board, y));
    keptMarks.push(...board.marks.slice(y * board.width, (y + 1) * board.width));
  }
  board.cells = new Array(removing.size * board.width).fill(CELL.EMPTY).concat(kept);
  board.marks = new Array(removing.size * board.width).fill(null).concat(keptMarks);
}

/**
 * 아래에서 줄들을 밀어 올린다. 위로 밀려 나간 칸에 블록이 있었으면 overflow = true.
 * @param {Board} board @param {number[][]} newRows 아래쪽에 붙일 행들 (위→아래 순서)
 * @returns {boolean} overflow
 */
function pushUp(board, newRows) {
  const n = newRows.length;
  const pushedOut = board.cells.slice(0, n * board.width);
  const overflow = pushedOut.some((c) => c !== CELL.EMPTY);
  board.cells = board.cells.slice(n * board.width).concat(...newRows);
  board.marks = board.marks.slice(n * board.width).concat(new Array(n * board.width).fill(null));
  return overflow;
}

/**
 * 구멍 1칸 쓰레기 줄 삽입 (FR-025, API-022 `rows`·`holeColumn`).
 * @param {Board} board @param {number} rows @param {number} holeColumn 0~width-1
 * @returns {boolean} overflow (보드 위로 블록이 밀려 나감 → Top-out)
 */
export function insertGarbage(board, rows, holeColumn) {
  if (rows <= 0) return false;
  const line = new Array(board.width).fill(CELL.GARBAGE);
  if (holeColumn >= 0 && holeColumn < board.width) line[holeColumn] = CELL.EMPTY;
  return pushUp(board, Array.from({ length: rows }, () => line.slice()));
}

/**
 * 납 블록 줄 삽입 — 구멍 없음 (FR-029 wickedness `params.rows`).
 * @param {Board} board @param {number} rows
 * @returns {boolean} overflow
 */
export function insertLeadRows(board, rows) {
  if (rows <= 0) return false;
  return pushUp(board, Array.from({ length: rows }, () => new Array(board.width).fill(CELL.LEAD)));
}

/** 납 블록 줄 제거 (FR-029 linesToClear 소진, FR-035 스랍 해제, FR-039 저주 제거). @param {Board} board @returns {number} 제거한 줄 수 */
export function removeLeadRows(board) {
  const removing = new Set();
  for (let y = 0; y < board.height; y += 1) if (row(board, y).includes(CELL.LEAD)) removing.add(y);
  removeRows(board, removing);
  return removing.size;
}

/**
 * 쌓인 블록에 구멍 뚫기 (FR-029 아바돈 "황충이 쌓인 블록을 갉아 구멍 생성"). 납 블록은 대상 아님.
 * @param {Board} board @param {number} count spirits.json abaddon `params.holes`
 * @param {() => number} rand `attack.params.seed`로 만든 PRNG (같은 seed → 같은 위치)
 * @returns {Array<[number, number]>} 비운 칸 [x, y]
 */
export function punchHoles(board, count, rand) {
  const filled = [];
  for (let i = 0; i < board.cells.length; i += 1) {
    if (board.cells[i] !== CELL.EMPTY && board.cells[i] !== CELL.LEAD) filled.push(i);
  }
  const holes = [];
  for (let k = 0; k < count && filled.length > 0; k += 1) {
    const pick = Math.floor(rand() * filled.length);
    const index = filled.splice(pick, 1)[0];
    board.cells[index] = CELL.EMPTY;
    board.marks[index] = null;
    holes.push([index % board.width, Math.floor(index / board.width)]);
  }
  return holes;
}

/** 열 높이 (빈 열 = 0). @param {Board} board @returns {number[]} */
export function columnHeights(board) {
  const heights = new Array(board.width).fill(0);
  for (let x = 0; x < board.width; x += 1) {
    for (let y = 0; y < board.height; y += 1) {
      if (board.cells[y * board.width + x] !== CELL.EMPTY) {
        heights[x] = board.height - y;
        break;
      }
    }
  }
  return heights;
}

/**
 * 가장 높은 열의 꼭대기 블록 count개 파괴 (FR-014 다윗 물맷돌, UC-009 5b 빈 보드 → 대상 없음). 동률이면 왼쪽 열.
 * @param {Board} board @param {number} count rules.heroSkills.sling_stone.blocks
 * @returns {Array<[number, number]>} 파괴한 칸
 */
export function removeTopBlocks(board, count) {
  const heights = columnHeights(board);
  const max = Math.max(...heights);
  if (max === 0) return [];
  const x = heights.indexOf(max);
  const removed = [];
  for (let y = 0; y < board.height && removed.length < count; y += 1) {
    if (board.cells[y * board.width + x] !== CELL.EMPTY) {
      setCell(board, x, y, CELL.EMPTY);
      removed.push([x, y]);
    }
  }
  return removed;
}

/** 쓰레기 줄 여부 — 채워진 칸이 모두 쓰레기(CODE-009 8)인 줄. @param {Board} board @param {number} y @returns {boolean} */
export function isGarbageRow(board, y) {
  const cells = row(board, y).filter((c) => c !== CELL.EMPTY);
  return cells.length > 0 && cells.every((c) => c === CELL.GARBAGE);
}

/** @param {Board} board @returns {number} 보드의 쓰레기 줄 수 */
export function countGarbageRows(board) {
  let n = 0;
  for (let y = 0; y < board.height; y += 1) if (isGarbageRow(board, y)) n += 1;
  return n;
}

/**
 * 맨 아래 쓰레기 줄부터 최대 n줄 제거 (FR-017 바울 3줄, FR-035 섬기는 영들 1줄, FR-039 절반, UC-009 5a 있는 만큼만).
 * @param {Board} board @param {number} n
 * @returns {number} 제거한 줄 수
 */
export function removeGarbageRows(board, n) {
  const removing = new Set();
  for (let y = board.height - 1; y >= 0 && removing.size < n; y -= 1) if (isGarbageRow(board, y)) removing.add(y);
  removeRows(board, removing);
  return removing.size;
}

/**
 * 위기 판정 — 고정 블록이 위험선(상단 dangerRows줄 영역)에 들어옴 (FR-055, OQ #7).
 * @param {Board} board @param {number} dangerRows rules.board.dangerRows
 * @returns {boolean}
 */
export function isInDanger(board, dangerRows) {
  return board.cells.slice(0, dangerRows * board.width).some((c) => c !== CELL.EMPTY);
}

/** 구멍 수 — 위에 블록이 있는 빈칸 (봇 착지 평가용). @param {Board} board @returns {number} */
export function countHoles(board) {
  let holes = 0;
  for (let x = 0; x < board.width; x += 1) {
    let covered = false;
    for (let y = 0; y < board.height; y += 1) {
      const c = board.cells[y * board.width + x];
      if (c !== CELL.EMPTY) covered = true;
      else if (covered) holes += 1;
    }
  }
  return holes;
}
