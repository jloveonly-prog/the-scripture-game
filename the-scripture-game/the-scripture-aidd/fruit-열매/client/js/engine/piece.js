// piece.js — 7종 모양·회전 상태·스폰 위치·셀 코드(CODE-009) 정의만
// TASK-010-1 | REQ-001 FR-001 FR-002 | ARCH-002 | CODE-009 | API-012 `active {type, x, y, rot}`
// 좌표: x는 오른쪽, y는 아래쪽(행 0 = 보드 맨 위). 회전 상태 0(스폰)·1(R)·2·3(L) — SRS 표준 모양.
// 순수 모듈 (D-12).

/** FR-001 7종 테트로미노 */
export const PIECE_TYPES = Object.freeze(["I", "O", "T", "S", "Z", "J", "L"]);

/** CODE-009 보드 셀 코드: 0 빈칸, 1 I, 2 O, 3 T, 4 S, 5 Z, 6 J, 7 L, 8 쓰레기, 9 납 블록 */
export const CELL = Object.freeze({
  EMPTY: 0,
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
  GARBAGE: 8,
  LEAD: 9,
});

/**
 * SRS 회전 상태별 셀 좌표 (상자 원점 기준, [x, y]) — FR-002.
 * @type {Readonly<Record<string, ReadonlyArray<ReadonlyArray<readonly [number, number]>>>>}
 */
const SHAPES = Object.freeze({
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
});

/** T-Spin 3코너 판정용 T 상자 모서리 (FR-004) */
export const T_CORNERS = Object.freeze([
  [0, 0],
  [2, 0],
  [0, 2],
  [2, 2],
]);

/**
 * 블록 종류 → 셀 코드 (CODE-009).
 * @param {string} type
 * @returns {number}
 */
export function cellCode(type) {
  const code = CELL[/** @type {keyof typeof CELL} */ (type)];
  if (typeof code !== "number" || code < CELL.I || code > CELL.L) throw new Error(`unknown piece type ${type}`);
  return code;
}

/**
 * 스폰 상태 (FR-001) — 보드 너비 가운데 정렬: I·O는 4칸 상자, 나머지 3칸 상자. I는 상자 1행에 있으므로 y=-1.
 * @param {string} type
 * @param {number} boardWidth rules.board.width
 * @returns {{type: string, x: number, y: number, rot: number}}
 */
export function spawnPiece(type, boardWidth) {
  const boxWidth = type === "I" || type === "O" ? 4 : 3;
  return { type, x: Math.floor((boardWidth - boxWidth) / 2), y: type === "I" ? -1 : 0, rot: 0 };
}

/**
 * 블록이 차지하는 보드 좌표 4개.
 * @param {{type: string, x: number, y: number, rot: number}} piece
 * @returns {Array<[number, number]>}
 */
export function pieceCells(piece) {
  const shape = SHAPES[piece.type];
  if (!shape) throw new Error(`unknown piece type ${piece.type}`);
  return shape[((piece.rot % 4) + 4) % 4].map(([cx, cy]) => [piece.x + cx, piece.y + cy]);
}
