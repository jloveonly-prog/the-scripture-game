// rate-limit.ts — 소켓별 종류별·전체 토큰 버킷과 3초 연속 초과 판정만
// TASK-030 | REQ-001 NFR-003 FR-032 | ARCH-015 | api-gate §2 속도 제한 | TBL-018 `rateLimit` (DCL-002) | D-16
// 초과분 처리(state·reaction 조용히 버림, 나머지 reject RATE_LIMITED, 지속 초과 error RATE_LIMITED + Close 4429)는 호출자가 한다.
// 상태는 메모리만 (휴면 후 새로 시작 — 저장하지 않음, data-ark §8 휘발).
import type { Rules } from "../content";

/** TBL-018 rateLimit 버킷 형식 `{tokens, perMs}` (DCL-002) */
export interface BucketSpec {
  tokens: number;
  perMs: number;
}

/** 종류별 버킷이 있는 수신 메시지 (api-gate §2: state 20/초, clear 10/초, skill·armor 5/초, answer 4/초, reaction 1/2초) */
export const LIMITED_KINDS = ["state", "clear", "skill", "armor", "answer", "reaction"] as const;
export type LimitedKind = (typeof LIMITED_KINDS)[number];

export type RateVerdict =
  | { allowed: true }
  | { allowed: false; retryInMs: number; /** 전체 한도 totalViolationMs 연속 초과 → 소켓 종료 */ fatal: boolean };

/** 연속 보충 토큰 버킷: perMs마다 tokens개 (최대 tokens개 저장) */
export class TokenBucket {
  private level: number;
  private last: number;

  constructor(private readonly spec: BucketSpec, now: number) {
    this.level = spec.tokens;
    this.last = now;
  }

  /** 토큰 1개 사용 시도 → 실패면 다음 토큰까지 남은 ms */
  take(now: number): { ok: true } | { ok: false; retryInMs: number } {
    const elapsed = Math.max(0, now - this.last);
    this.last = now;
    this.level = Math.min(this.spec.tokens, this.level + (elapsed * this.spec.tokens) / this.spec.perMs);
    if (this.level >= 1) {
      this.level -= 1;
      return { ok: true };
    }
    return { ok: false, retryInMs: Math.ceil(((1 - this.level) * this.spec.perMs) / this.spec.tokens) };
  }
}

/**
 * 소켓 1개의 속도 제한기 (NFR-003 "비정상 빈도 메시지를 차단").
 * 순서: 전체(total 40/초) → 종류별. "연속 초과" = 전체 한도 초과가 한 주기(total.perMs = 1초)도 끊기지 않고 이어짐 —
 * 초과가 처음 일어난 시각부터 totalViolationMs가 지나도록 매 주기 초과가 있으면 fatal (사이에 일부 통과가 있어도 초과는 계속).
 */
export class SocketRateLimiter {
  private readonly total: TokenBucket;
  private readonly kinds = new Map<LimitedKind, TokenBucket>();
  private violationSince: number | null = null;
  private lastViolationAt = 0;

  constructor(private readonly rules: Rules, now: number) {
    // api-gate §2 rules.rateLimit.total
    this.total = new TokenBucket(rules.rateLimit.total, now);
  }

  /**
   * 메시지 1개 통과 여부. kind가 null이면 전체 한도만 본다 (로비 join·cancel, room ready·topout).
   */
  check(kind: LimitedKind | null, now: number): RateVerdict {
    const total = this.total.take(now);
    if (!total.ok) {
      // api-gate §2 "전체 한도 3초 연속 초과 시 error RATE_LIMITED 후 종료" — rules.rateLimit.totalViolationMs (DCL-002)
      if (this.violationSince === null || now - this.lastViolationAt > this.rules.rateLimit.total.perMs) {
        this.violationSince = now;
      }
      this.lastViolationAt = now;
      const fatal = now - this.violationSince >= this.rules.rateLimit.totalViolationMs;
      return { allowed: false, retryInMs: total.retryInMs, fatal };
    }
    if (kind === null) return { allowed: true };
    let bucket = this.kinds.get(kind);
    if (!bucket) {
      bucket = new TokenBucket(this.rules.rateLimit[kind], now);
      this.kinds.set(kind, bucket);
    }
    const r = bucket.take(now);
    return r.ok ? { allowed: true } : { allowed: false, retryInMs: r.retryInMs, fatal: false };
  }
}
