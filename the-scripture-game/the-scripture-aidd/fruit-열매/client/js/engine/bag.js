// bag.js — 시드 7-bag 블록 순서 생성만
// TASK-010-1 | REQ-001 FR-001 FR-005 | ARCH-002 | architecture §9.8
// FR-001 같은 시드는 항상 같은 블록 순서를 만든다 — 시드 스트림 STREAM.BAG만 사용한다.
import { STREAM, createStream, randomInt } from "./rng.js";
import { PIECE_TYPES } from "./piece.js";

/** 7-bag 생성기: 7종을 한 번씩 섞은 가방을 차례로 비운다 (FR-001). */
export class Bag {
  /**
   * @param {number} seed uint32 — API-019 `start.seed`
   */
  constructor(seed) {
    this.rand = createStream(seed, STREAM.BAG);
    /** @type {string[]} 앞으로 나올 블록 (앞이 다음) */
    this.queue = [];
  }

  /** Fisher–Yates로 가방 1개(7종)를 섞어 큐 뒤에 붙인다. */
  refill() {
    const bag = PIECE_TYPES.slice();
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = randomInt(this.rand, i + 1);
      const tmp = bag[i];
      bag[i] = bag[j];
      bag[j] = tmp;
    }
    this.queue.push(...bag);
  }

  /**
   * 다음 블록 n개 미리보기 (FR-015 솔로몬 5, FR-035 가브리엘 7, 기본 3 — 개수는 호출자가 rules에서).
   * @param {number} n
   * @returns {string[]}
   */
  peek(n) {
    while (this.queue.length < n) this.refill();
    return this.queue.slice(0, n);
  }

  /**
   * 다음 블록 1개를 꺼낸다.
   * @returns {string}
   */
  next() {
    if (this.queue.length === 0) this.refill();
    return /** @type {string} */ (this.queue.shift());
  }
}

/**
 * 시드의 앞 n개 블록 순서 (테스트·E2E 계획용 — 같은 시드 = 같은 순서).
 * @param {number} seed
 * @param {number} n
 * @returns {string[]}
 */
export function sequenceFor(seed, n) {
  const bag = new Bag(seed);
  return bag.peek(n);
}
