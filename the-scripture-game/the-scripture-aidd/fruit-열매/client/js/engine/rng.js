// rng.js — mulberry32 + 시드에서 갈라진 독립 스트림 생성만
// TASK-010-1 | REQ-001 FR-001 FR-005 | ARCH-002 | D-09 | architecture §9.8 (7-bag·특수 칸 굴림 = 시드에서 갈라진 독립 PRNG 스트림)
// 순수 모듈: DOM·window·타이머·Date·Math.random·JSON import 없음 (D-12, devguide §3.5-4).

/** architecture §9.8 독립 스트림 번호 — 같은 시드에서 7-bag와 특수 칸 굴림이 서로 간섭하지 않는다 */
export const STREAM = Object.freeze({
  BAG: 1,
  SPECIALS: 2,
});

/**
 * 32비트 정수 섞기 (splitmix32 마무리 단계) — 스트림 시드·조각별 굴림값 파생용.
 * @param {number} x
 * @returns {number} uint32
 */
export function mix32(x) {
  let z = x >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

/**
 * 시드 + 스트림 번호 (+ 색인) → 독립 uint32 시드 (FR-005 같은 시드 → 같은 결과).
 * @param {number} seed uint32 (API-019 `start.seed`)
 * @param {number} stream STREAM 값
 * @param {number} [index] 조각 번호 등 (기본 0)
 * @returns {number}
 */
export function deriveSeed(seed, stream, index = 0) {
  const a = mix32((seed >>> 0) ^ Math.imul(stream >>> 0, 0x9e3779b9));
  return mix32(a ^ Math.imul((index >>> 0) + 1, 0x632be5ab));
}

/**
 * mulberry32 PRNG — [0, 1) 실수를 내는 함수를 돌려준다 (architecture §9.8).
 * @param {number} seed uint32
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 시드에서 갈라진 독립 스트림 PRNG (D-09).
 * @param {number} seed
 * @param {number} stream
 * @returns {() => number}
 */
export function createStream(seed, stream) {
  return mulberry32(deriveSeed(seed, stream));
}

/**
 * (시드, 스트림, 색인, 굴림 번호) → [0, 1) 굴림값 1개. 순서와 무관하게 같은 값 — 서버 재계산 검증용 (D-09).
 * @param {number} seed
 * @param {number} stream
 * @param {number} index
 * @param {number} k 같은 색인 안의 굴림 번호
 * @returns {number}
 */
export function rollAt(seed, stream, index, k) {
  return mulberry32(deriveSeed(seed, stream, index) ^ Math.imul(k + 1, 0x27d4eb2f))();
}

/**
 * [0, n) 정수.
 * @param {() => number} rand
 * @param {number} n
 * @returns {number}
 */
export function randomInt(rand, n) {
  return Math.floor(rand() * n);
}
