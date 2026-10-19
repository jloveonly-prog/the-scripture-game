// TASK-010-2 · FR-003 · FR-004 · FR-014 · FR-017 · FR-025 · FR-029 · FR-035 · FR-045 — 보드 격자 조작 순수 함수 (동형).
// 단일 책임: 충돌·고정·줄 삭제·쓰레기/납 줄·블록 제거·3×3 폭파·착지 후보 평가. 입력 격자는 바꾸지 않고 새 격자를 돌려준다.
// meta = 격자와 같은 20×10 배열(특수 칸 정보 {kind, pieceIndex, armorId} 또는 null) — 줄 이동을 격자와 똑같이 따라간다 (R-09 pieceIndex 보고용).
import { BOARD_COLS, BOARD_ROWS, createEmptyGrid } from './encode.js';
import { PIECES, PIECE_TYPES, absoluteCells } from './pieces.js';
import { CELL } from '../net/protocol.js';

/** data-ark §8.8.10 착지 평가 가중 (지운 줄 +, 구멍·높이 합·울퉁불퉁함 −). 수치 원천이 정경에 없어 공개 휴리스틱 값을 이름 있는 상수로 둔다 */
export const LANDING_WEIGHTS = Object.freeze({ lines: 0.760666, holes: 0.35663, height: 0.510066, bumpiness: 0.184483 });

const EMPTY = CELL.EMPTY;
const emptyRow = (fill = EMPTY) => Array(BOARD_COLS).fill(fill);
const cloneGrid = (grid) => grid.map((row) => row.slice());
const cloneMeta = (meta) => (meta ? meta.map((row) => row.slice()) : null);

/** meta 빈 배열 (특수 칸 정보 없음) */
export function createEmptyMeta() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

/** FR-003 충돌 판정 — 벽·바닥 밖이나 고정 블록과 겹치면 false. 보드 위(행 < 0)는 빈 공간으로 본다 */
export function fits(grid, active) {
  for (const [r, c] of absoluteCells(active)) {
    if (c < 0 || c >= BOARD_COLS || r >= BOARD_ROWS) return false;
    if (r >= 0 && grid[r][c] !== EMPTY) return false;
  }
  return true;
}

/** FR-003 하드 드롭 거리 (고스트 위치 = y + 거리) */
export function dropDistance(grid, active) {
  let d = 0;
  while (fits(grid, { ...active, y: active.y + d + 1 })) d += 1;
  return d;
}

/** FR-003 고스트 = 그대로 떨어뜨린 자세 */
export function ghostOf(grid, active) {
  return active ? { ...active, y: active.y + dropDistance(grid, active) } : null;
}

/**
 * FR-003 고정 — 블록 코드로 칸을 채우고, special이 있으면 그 칸만 특수 칸 코드로 둔다.
 * @param {{cell:[number,number], code:string, info:object}|null} special
 * @returns {{grid, meta, lockOut:boolean, cells:number[][]}} lockOut = 보드 위에 걸친 채 고정 (Top-out)
 */
export function placePiece(grid, meta, active, special = null) {
  const next = cloneGrid(grid);
  const nextMeta = cloneMeta(meta);
  const code = PIECES[PIECE_TYPES[active.type - 1]].code;
  const cells = absoluteCells(active);
  let lockOut = false;
  for (const [r, c] of cells) {
    if (r < 0) { lockOut = true; continue; }
    const isSpecial = special && special.cell[0] === r && special.cell[1] === c;
    next[r][c] = isSpecial ? special.code : code;
    if (nextMeta) nextMeta[r][c] = isSpecial ? special.info : null;
  }
  return { grid: next, meta: nextMeta, lockOut, cells };
}

/** FR-004 다 찬 줄 (납 줄은 지워지지 않는다 — FR-029) */
export function fullRows(grid) {
  const rows = [];
  grid.forEach((row, r) => {
    if (row.every((cell) => cell !== EMPTY) && !row.includes(CELL.LEAD)) rows.push(r);
  });
  return rows;
}

/** FR-004 지정한 줄을 지우고 위 줄을 내린다 */
export function removeRows(grid, meta, rows) {
  const drop = new Set(rows);
  const kept = grid.filter((_, r) => !drop.has(r));
  const keptMeta = meta ? meta.filter((_, r) => !drop.has(r)) : null;
  while (kept.length < BOARD_ROWS) {
    kept.unshift(emptyRow());
    if (keptMeta) keptMeta.unshift(emptyRow(null));
  }
  return { grid: kept.map((row) => row.slice()), meta: keptMeta ? keptMeta.map((row) => row.slice()) : null };
}

/** 아래에서 줄을 밀어 올린다. 위로 밀려 나간 줄에 블록이 있으면 overflow (Top-out) */
export function pushUpRows(grid, meta, rowsIn) {
  const newRows = rowsIn.slice(-BOARD_ROWS); // 보드 높이보다 많으면 넘친 만큼은 이미 천장 밖
  const k = newRows.length;
  let overflow = rowsIn.length > BOARD_ROWS;
  for (let r = 0; r < k; r += 1) if (grid[r].some((cell) => cell !== EMPTY)) overflow = true;
  const next = [...grid.slice(k).map((row) => row.slice()), ...newRows.map((row) => row.slice())];
  const nextMeta = meta ? [...meta.slice(k).map((row) => row.slice()), ...newRows.map(() => emptyRow(null))] : null;
  return { grid: next, meta: nextMeta, overflow };
}

/** FR-025 구멍 1칸(holeColumn) 쓰레기 줄 count개 삽입 */
export function insertGarbage(grid, meta, count, holeColumn) {
  const hole = Math.min(Math.max(Math.trunc(holeColumn) || 0, 0), BOARD_COLS - 1);
  const rows = Array.from({ length: Math.max(0, count) }, () => {
    const row = emptyRow(CELL.GARBAGE);
    row[hole] = EMPTY;
    return row;
  });
  return pushUpRows(grid, meta, rows);
}

/** FR-029 악(wickedness) — 지워지지 않는 회색 납 줄 1줄 삽입 */
export function insertLeadRow(grid, meta) {
  return pushUpRows(grid, meta, [emptyRow(CELL.LEAD)]);
}

/** 납 줄 행 번호 (아래 → 위) */
export function leadRowIndices(grid) {
  const rows = [];
  for (let r = BOARD_ROWS - 1; r >= 0; r -= 1) if (grid[r].includes(CELL.LEAD)) rows.push(r);
  return rows;
}

/** 쓰레기 줄 = 쓰레기 칸만 있는 줄 (아래 → 위) */
export function garbageRowIndices(grid) {
  const rows = [];
  for (let r = BOARD_ROWS - 1; r >= 0; r -= 1) {
    const row = grid[r];
    if (row.includes(CELL.GARBAGE) && row.every((cell) => cell === CELL.GARBAGE || cell === EMPTY)) rows.push(r);
  }
  return rows;
}

/** FR-017·FR-035·FR-039 맨 아래 쓰레기 줄 최대 rows줄 제거 (부족하면 있는 만큼 — UC-009 5a) */
export function removeBottomGarbage(grid, meta, rows) {
  const targets = garbageRowIndices(grid).slice(0, Math.max(0, rows));
  return { ...removeRows(grid, meta, targets), removed: targets };
}

/** 칸 비우기 (블록 제거·폭파 공통) */
function clearCells(grid, meta, cells) {
  const next = cloneGrid(grid);
  const nextMeta = cloneMeta(meta);
  for (const [r, c] of cells) {
    next[r][c] = EMPTY;
    if (nextMeta) nextMeta[r][c] = null;
  }
  return { grid: next, meta: nextMeta, cells };
}

const columnHeight = (grid, c) => {
  for (let r = 0; r < BOARD_ROWS; r += 1) if (grid[r][c] !== EMPTY) return BOARD_ROWS - r;
  return 0;
};

/** FR-014 다윗 물맷돌 — 가장 높은 열(동률이면 왼쪽)의 꼭대기 블록 count개 제거. 빈 보드면 제거 0 (UC-009 5b) */
export function destroyTopBlocks(grid, meta, count) {
  let best = -1;
  let bestHeight = 0;
  for (let c = 0; c < BOARD_COLS; c += 1) {
    const h = columnHeight(grid, c);
    if (h > bestHeight) { best = c; bestHeight = h; }
  }
  const cells = [];
  if (best >= 0) {
    for (let r = 0; r < BOARD_ROWS && cells.length < count; r += 1) if (grid[r][best] !== EMPTY) cells.push([r, best]);
  }
  return clearCells(grid, meta, cells);
}

/** FR-029 아바돈 황충 — 지정 열마다 최상단 블록 1개 제거 */
export function removeColumnTops(grid, meta, columns) {
  const cells = [];
  for (const c of new Set(columns)) {
    if (!Number.isInteger(c) || c < 0 || c >= BOARD_COLS) continue;
    for (let r = 0; r < BOARD_ROWS; r += 1) {
      if (grid[r][c] !== EMPTY) { cells.push([r, c]); break; }
    }
  }
  return clearCells(grid, meta, cells);
}

/** FR-045 여리고 나팔 — 중심 size×size 폭파 (보드 안 칸만 — UC-014 E1) */
export function blastArea(grid, meta, center, size) {
  const half = Math.floor(size / 2);
  const cells = [];
  for (let r = center[0] - half; r <= center[0] + half; r += 1) {
    for (let c = center[1] - half; c <= center[1] + half; c += 1) {
      if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS && grid[r][c] !== EMPTY) cells.push([r, c]);
    }
  }
  return clearCells(grid, meta, cells);
}

/** FR-061·D3-12 니어미스 — 빈칸이 정확히 1개인 줄 (납 줄 제외) */
export function singleGapRows(grid) {
  const rows = [];
  grid.forEach((row, r) => {
    if (!row.includes(CELL.LEAD) && row.filter((cell) => cell === EMPTY).length === 1) rows.push(r);
  });
  return rows;
}

/** data-ark §8.8.10 착지 평가 특징 — 구멍 수·높이 합·울퉁불퉁함 */
export function gridFeatures(grid) {
  const heights = [];
  let holes = 0;
  for (let c = 0; c < BOARD_COLS; c += 1) {
    const h = columnHeight(grid, c);
    heights.push(h);
    for (let r = BOARD_ROWS - h; r < BOARD_ROWS; r += 1) if (grid[r][c] === EMPTY) holes += 1;
  }
  let bumpiness = 0;
  for (let c = 1; c < BOARD_COLS; c += 1) bumpiness += Math.abs(heights[c] - heights[c - 1]);
  return { holes, aggregateHeight: heights.reduce((a, b) => a + b, 0), bumpiness, maxHeight: Math.max(...heights) };
}

/**
 * FR-015·FR-021 착지 후보 전부 (회전 4 × 열, 위에서 곧게 떨어뜨린 자리). 각 후보 = 자세·지운 줄·평가 점수.
 * @returns {Array<{type, rot, x, y, lines, score}>} 점수 내림차순
 */
export function enumeratePlacements(grid, type, weights = LANDING_WEIGHTS) {
  const seen = new Set();
  const out = [];
  const piece = PIECES[PIECE_TYPES[type - 1]];
  if (!piece) return out;
  for (let rot = 0; rot < 4; rot += 1) {
    const topRow = Math.min(...piece.cells[rot].map(([r]) => r));
    for (let x = -2; x < BOARD_COLS; x += 1) {
      const start = { type, rot, x, y: -topRow };
      if (!fits(grid, start)) continue;
      const landed = ghostOf(grid, start);
      const key = absoluteCells(landed).map(([r, c]) => `${r}:${c}`).sort().join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const placed = placePiece(grid, null, landed).grid;
      const rows = fullRows(placed);
      const after = rows.length ? removeRows(placed, null, rows).grid : placed;
      const f = gridFeatures(after);
      const score = weights.lines * rows.length - weights.holes * f.holes - weights.height * f.aggregateHeight
        - weights.bumpiness * f.bumpiness;
      out.push({ ...landed, lines: rows.length, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** FR-015 솔로몬·FR-035 가브리엘 착지 힌트 — 최고 점수 후보 (없으면 null) */
export function findBestPlacement(grid, type, weights = LANDING_WEIGHTS) {
  const [best] = enumeratePlacements(grid, type, weights);
  return best ? { type: best.type, rot: best.rot, x: best.x, y: best.y } : null;
}

export { createEmptyGrid };
