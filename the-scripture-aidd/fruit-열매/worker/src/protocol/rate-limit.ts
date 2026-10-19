// TASK-032-2 · NFR-003 · C-009 · D-31 — 메시지 종류별 토큰 버킷(소켓 1개당 1인스턴스)·위반 누적 4008 판정·HTTP 고정 창 카운터
// 한도 수치는 protocol.js RATE_LIMITS·RATE_ABUSE·HTTP_RATE_LIMITS만 읽는다 (매직 넘버 금지). 시각은 인자로 받는다.
import { RATE_ABUSE, RATE_LIMITS } from '../../../client/js/net/protocol.js';

export interface RateLimiter {
  check(type: string, now: number): 'ok' | 'ignore' | 'reject';
  /** RATE_LIMITED 1건 기록 — true면 호출 측이 4008로 닫는다 */
  noteRejected(now: number): boolean;
}

interface Bucket { tokens: number; updatedAt: number }

type LimitedType = keyof typeof RATE_LIMITS;
const isLimited = (type: string): type is LimitedType => Object.prototype.hasOwnProperty.call(RATE_LIMITS, type);

// D-31 소켓별 빈도 제한기 — `limit`회/`windowMs` 토큰 버킷, 초과 처리 = RATE_LIMITS[type].onExceed (api-gate §2.7)
export function createRateLimiter(): RateLimiter {
  const buckets = new Map<string, Bucket>();
  let violations: number[] = [];
  return {
    check(type, now) {
      if (!isLimited(type)) return 'ok';
      const rule = RATE_LIMITS[type];
      const bucket = buckets.get(type) ?? { tokens: rule.limit, updatedAt: now };
      const elapsed = Math.max(0, now - bucket.updatedAt);
      bucket.tokens = Math.min(rule.limit, bucket.tokens + (elapsed * rule.limit) / rule.windowMs);
      bucket.updatedAt = now;
      buckets.set(type, bucket);
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return 'ok';
      }
      return rule.onExceed === 'reject' ? 'reject' : 'ignore';
    },
    noteRejected(now) {
      violations = violations.filter((t) => now - t < RATE_ABUSE.windowMs);
      violations.push(now);
      return violations.length >= RATE_ABUSE.violations;
    },
  };
}

/** 카운터 키가 이 수를 넘으면 지난 창을 정리한다 (isolate 메모리 상한 — 수치 밸런스 아님) */
const PRUNE_AT_KEYS = 10000;

export interface WindowCounter {
  /** key의 이번 창 요청 1건 기록 — 한도 이내면 true */
  hit(key: string, now: number): boolean;
}

// D-31 HTTP 빈도 제한 — 키(출처 주소·토큰 해시)별 고정 창 카운터. 메모리에만 두고 저장·로그하지 않는다 (봉인 제4계명, api-gate §5.3)
export function createWindowCounter(rule: { limit: number; windowMs: number }): WindowCounter {
  const windows = new Map<string, { startedAt: number; count: number }>();
  return {
    hit(key, now) {
      if (windows.size > PRUNE_AT_KEYS) {
        for (const [k, w] of windows) if (now - w.startedAt >= rule.windowMs) windows.delete(k); // 지난 창 정리 (메모리 상한)
      }
      const current = windows.get(key);
      if (!current || now - current.startedAt >= rule.windowMs) {
        windows.set(key, { startedAt: now, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= rule.limit;
    },
  };
}
