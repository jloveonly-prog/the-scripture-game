// TASK-004 · FR-001 · FR-002 · FR-048 · CODE-009 — 테트로미노 7종의 모양(SRS 회전 상태 4개)과 셀 코드 (동형 데이터).
// 단일 책임: 블록 모양 정의만. 회전 판정·벽차기(srs.js)·낙하(game.js)는 유다 지파 엔진이 맡는다.
// 좌표: [행, 열] — 행은 아래로 증가(보드 0행 = 맨 위, CODE-009와 같은 방향). 상자 왼쪽 위 = active.x, active.y.
// 회전 번호: 0 = 출현 자세, 1 = 오른쪽(R), 2 = 180°, 3 = 왼쪽(L) (api-gate §2.6 active.rot 0~3).

const freeze = Object.freeze;
const shape = (rotations) => freeze(rotations.map((cells) => freeze(cells.map((cell) => freeze(cell)))));

/** CODE-009 셀 코드 '1'~'7' 순서 = I, O, T, S, Z, J, L */
export const PIECE_TYPES = freeze(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);

export const PIECES = freeze({
  I: freeze({ type: 1, code: '1', box: 4, cells: shape([
    [[1, 0], [1, 1], [1, 2], [1, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 1], [1, 1], [2, 1], [3, 1]],
  ]) }),
  O: freeze({ type: 2, code: '2', box: 4, cells: shape([
    [[0, 1], [0, 2], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [1, 2]],
  ]) }),
  T: freeze({ type: 3, code: '3', box: 3, cells: shape([
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 0], [1, 1], [2, 1]],
  ]) }),
  S: freeze({ type: 4, code: '4', box: 3, cells: shape([
    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 1], [1, 2], [2, 0], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
  ]) }),
  Z: freeze({ type: 5, code: '5', box: 3, cells: shape([
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 2], [1, 1], [1, 2], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[0, 1], [1, 0], [1, 1], [2, 0]],
  ]) }),
  J: freeze({ type: 6, code: '6', box: 3, cells: shape([
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [0, 2], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 0], [2, 1]],
  ]) }),
  L: freeze({ type: 7, code: '7', box: 3, cells: shape([
    [[0, 2], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [1, 2], [2, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
  ]) }),
});

/** active.type(1~7) → 조각 정의 */
export function pieceByType(type) {
  const name = PIECE_TYPES[type - 1];
  return name ? PIECES[name] : null;
}

/**
 * 보드 위 절대 좌표 [행, 열] 4칸. `cells` 순서는 위→아래·왼→오른 (특수 칸 cellIndex 0~3의 기준 — devguide §7 C-SPECIAL).
 * @param {{type:number, rot:number, x:number, y:number}} active
 */
export function absoluteCells(active) {
  const piece = pieceByType(active.type);
  if (!piece) return [];
  const rotation = piece.cells[((active.rot % 4) + 4) % 4];
  return rotation.map(([r, c]) => [active.y + r, active.x + c]);
}
