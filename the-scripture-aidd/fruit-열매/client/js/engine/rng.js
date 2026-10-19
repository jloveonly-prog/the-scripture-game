// TASK-004 · FR-001 · FR-005 · D-13 · D-14 — 시드 PRNG(mulberry32)와 결정적 무작위 도우미 (동형: 클라이언트 엔진·서버 판정·봇 공용).
// 단일 책임: 32비트 시드에서 같은 순서의 [0,1) 난수를 만든다. DOM·네트워크·전역 상태 없음.

/** D-14 특수 칸 굴림 시드 스트림 상수 (= balance.json specials.seedXor) */
export const SPECIAL_SEED_XOR = 0x5eedc0de;

/**
 * mulberry32 — 같은 시드는 항상 같은 수열 (FR-001 "같은 시드는 항상 같은 블록 순서").
 * @param {number} seed 32비트 부호 없는 정수 (start.seed)
 * @returns {() => number} 호출할 때마다 [0, 1) 실수
 */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 라운드 시드에서 파생 스트림 시드를 만든다 (예: 특수 칸 = deriveSeed(seed, SPECIAL_SEED_XOR)) */
export function deriveSeed(seed, xor) {
  return ((seed >>> 0) ^ (xor >>> 0)) >>> 0;
}

/** [min, maxInclusive] 정수 */
export function nextInt(rand, min, maxInclusive) {
  if (!Number.isInteger(min) || !Number.isInteger(maxInclusive) || maxInclusive < min) {
    throw new RangeError(`nextInt 범위 오류: ${min}..${maxInclusive}`);
  }
  return min + Math.floor(rand() * (maxInclusive - min + 1));
}

/** 배열에서 균등하게 1개 (빈 배열이면 오류 — 호출 측이 빈 후보를 먼저 거른다) */
export function pick(rand, items) {
  if (!Array.isArray(items) || items.length === 0) throw new RangeError('pick: 빈 후보 목록');
  return items[Math.floor(rand() * items.length)];
}

/** Fisher–Yates 제자리 섞기 (7-bag 등). 배열을 그대로 돌려준다. */
export function shuffleInPlace(rand, items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
