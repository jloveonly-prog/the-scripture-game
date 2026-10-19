// TASK-010-1 · FR-001 · FR-005 · D-13 — 시드 7-bag 블록 순서 생성 (동형: 클라이언트 엔진·서버 봇 공용).
// 단일 책임: 같은 시드 → 같은 블록 순서. 블록 종류는 active.type 번호 1~7 (pieces.js PIECE_TYPES 순서).
import { mulberry32, shuffleInPlace } from './rng.js';
import { PIECE_TYPES } from './pieces.js';

const TYPE_NUMBERS = Object.freeze(PIECE_TYPES.map((_, i) => i + 1));

/**
 * FR-001 시드 7-bag — 7종을 한 봉지로 섞어 차례로 꺼내고, 봉지가 비면 새로 섞는다.
 * @param {number} seed start.seed (32비트 부호 없는 정수)
 * @returns {{ next(): number, peek(count: number): number[] }}
 */
export function createBag(seed) {
  if (!Number.isInteger(seed) || seed < 0) throw new RangeError('createBag: seed는 0 이상 정수여야 합니다');
  const rand = mulberry32(seed);
  const queue = [];
  const refill = () => {
    queue.push(...shuffleInPlace(rand, TYPE_NUMBERS.slice()));
  };
  const ensure = (count) => {
    while (queue.length < count) refill();
  };
  return {
    // FR-001 다음 블록 1개 꺼내기
    next() {
      ensure(1);
      return queue.shift();
    },
    // FR-001 꺼내지 않고 앞 count개 보기 (미리보기 — 솔로몬 5·가브리엘 7)
    peek(count) {
      ensure(count);
      return queue.slice(0, count);
    },
  };
}
