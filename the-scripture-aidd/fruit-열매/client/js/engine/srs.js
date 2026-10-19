// TASK-010-1 · FR-002 · FR-003 — SRS 회전과 벽차기(Wall Kick) 표 (동형 순수 모듈).
// 단일 책임: 회전 시도 → 첫 번째로 들어맞는 벽차기 위치를 돌려준다. 보드 충돌 판정은 board.js `fits`.
// 표 원본: SRS 표준 (x 오른쪽 +, y 위쪽 +). 보드는 행이 아래로 증가하므로 적용 시 행 변화 = −y.
import { PIECES, PIECE_TYPES } from './pieces.js';
import { fits } from './board.js';

const freeze = Object.freeze;

/** J·L·S·T·Z 벽차기 — 키 `from>to` (0 출현, 1 R, 2 180°, 3 L) */
const KICKS_JLSTZ = freeze({
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
});

/** I 벽차기 */
const KICKS_I = freeze({
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
});

const TYPE_I = PIECE_TYPES.indexOf('I') + 1;
const TYPE_O = PIECE_TYPES.indexOf('O') + 1;

/** FR-002 회전 방향 dir(+1 오른쪽, −1 왼쪽)에 쓰는 벽차기 후보 목록 */
export function kickTable(type, fromRot, dir) {
  const toRot = (((fromRot + dir) % 4) + 4) % 4;
  if (type === TYPE_O) return [[0, 0]];
  const table = type === TYPE_I ? KICKS_I : KICKS_JLSTZ;
  return table[`${fromRot}>${toRot}`] ?? [[0, 0]];
}

/**
 * FR-002 SRS 회전 시도. 성공하면 새 자세와 사용한 벽차기 번호(0 = 제자리), 모두 막히면 null (EVT-03 회전 실패).
 * @param {string[][]} grid 고정 블록 격자
 * @param {{type:number, rot:number, x:number, y:number}} active
 * @param {1|-1} dir
 */
export function tryRotate(grid, active, dir) {
  if (dir !== 1 && dir !== -1) throw new RangeError('tryRotate: dir은 1 또는 -1');
  const toRot = (((active.rot + dir) % 4) + 4) % 4;
  const kicks = kickTable(active.type, active.rot, dir);
  for (let i = 0; i < kicks.length; i += 1) {
    const [kx, ky] = kicks[i];
    const candidate = { type: active.type, rot: toRot, x: active.x + kx, y: active.y - ky };
    if (fits(grid, candidate)) return { active: candidate, kickIndex: i };
  }
  return null;
}

/**
 * FR-044~046 회전 시 블록 안 특수 칸 위치(상자 기준 [행, 열]) 따라가기 — SRS 회전은 상자 회전과 같다 (O는 제자리).
 * @returns {[number, number]}
 */
export function rotateLocalCell(type, local, dir) {
  if (type === TYPE_O) return [local[0], local[1]];
  const n = PIECES[PIECE_TYPES[type - 1]].box;
  const [r, c] = local;
  return dir === 1 ? [c, n - 1 - r] : [n - 1 - c, r];
}
