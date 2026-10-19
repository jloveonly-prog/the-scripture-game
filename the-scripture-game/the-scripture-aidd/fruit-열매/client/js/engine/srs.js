// srs.js — SRS 벽차기 표(JLSTZ·I) + 회전 시도 판정만
// TASK-010-1 | REQ-001 FR-002 | ARCH-002 | UC-007 E1 (모든 벽차기 후보가 막히면 회전하지 않음)
// 표는 SRS 표준(Tetris Guideline) 값이며 y는 위쪽이 +인 원표를 이 엔진의 y 아래쪽 좌표로 뒤집어 적용한다.
// 순수 모듈 (D-12).

/** 회전 전이 키 "from>to" → [dx, dyUp] 5개 (SRS 표준 JLSTZ) */
const KICKS_JLSTZ = Object.freeze({
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
});

/** SRS 표준 I 벽차기 */
const KICKS_I = Object.freeze({
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
});

/**
 * 회전 전이에 쓸 벽차기 후보 (y 아래쪽 좌표로 변환).
 * @param {string} type
 * @param {number} from 0~3
 * @param {number} to 0~3
 * @returns {Array<[number, number]>}
 */
export function kickOffsets(type, from, to) {
  if (type === "O") return [[0, 0]];
  const table = type === "I" ? KICKS_I : KICKS_JLSTZ;
  const kicks = table[/** @type {keyof typeof KICKS_I} */ (`${from}>${to}`)];
  if (!kicks) throw new Error(`invalid rotation ${from}>${to}`);
  return kicks.map(([dx, dyUp]) => [dx, -dyUp]);
}

/**
 * SRS 회전 시도 (FR-002). 후보를 차례로 시험해 처음 들어맞는 위치로 회전한다.
 * @param {{type: string, x: number, y: number, rot: number}} piece
 * @param {1 | -1} dir 1 = 오른쪽(시계), -1 = 왼쪽(반시계)
 * @param {(candidate: {type: string, x: number, y: number, rot: number}) => boolean} fits 충돌 없음 판정
 * @returns {{piece: {type: string, x: number, y: number, rot: number}, kickIndex: number} | null} 모두 막히면 null (UC-007
 * E1)
 */
export function tryRotate(piece, dir, fits) {
  const from = ((piece.rot % 4) + 4) % 4;
  const to = (from + dir + 4) % 4;
  const offsets = kickOffsets(piece.type, from, to);
  for (let i = 0; i < offsets.length; i += 1) {
    const [dx, dy] = offsets[i];
    const candidate = { type: piece.type, x: piece.x + dx, y: piece.y + dy, rot: to };
    if (fits(candidate)) return { piece: candidate, kickIndex: i };
  }
  return null;
}
