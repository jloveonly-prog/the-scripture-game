// TASK-032-3 · NFR-003 · C-009 · D-31 · REQ-017 — 종류별 빈도 제한(무시/거부)·위반 누적 4008·HTTP 창 카운터
import { describe, expect, it } from 'vitest';
import { createRateLimiter, createWindowCounter } from '../../../worker/src/protocol/rate-limit';

describe('createRateLimiter (api-gate §2.7)', () => {
  it('state 20회/초 초과분은 ignore, 1초 뒤 회복', () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 20; i += 1) expect(rl.check('state', 0)).toBe('ok');
    expect(rl.check('state', 10)).toBe('ignore');
    expect(rl.check('state', 1010)).toBe('ok');
  });

  it('clear 10회/초 초과는 reject (RATE_LIMITED)', () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 10; i += 1) expect(rl.check('clear', 0)).toBe('ok');
    expect(rl.check('clear', 0)).toBe('reject');
  });

  it('reaction 1회/1.5초 — 초과분 ignore', () => {
    const rl = createRateLimiter();
    expect(rl.check('reaction', 0)).toBe('ok');
    expect(rl.check('reaction', 1000)).toBe('ignore');
    expect(rl.check('reaction', 2500)).toBe('ok');
  });

  it('join·createRoom·cancel 소켓당 3회/10초, 종류별 버킷은 독립', () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 3; i += 1) expect(rl.check('join', 0)).toBe('ok');
    expect(rl.check('join', 100)).toBe('reject');
    expect(rl.check('cancel', 100)).toBe('ok');
    expect(rl.check('ready', 100)).toBe('ok'); // 한도 없는 종류
  });

  it('10초 안에 RATE_LIMITED 3회 → true (4008), 창 밖 위반은 잊는다', () => {
    const rl = createRateLimiter();
    expect(rl.noteRejected(0)).toBe(false);
    expect(rl.noteRejected(5000)).toBe(false);
    expect(rl.noteRejected(11000)).toBe(false); // 0초 위반은 창 밖
    expect(rl.noteRejected(12000)).toBe(true);
  });
});

describe('createWindowCounter (HTTP)', () => {
  it('키별 limit회/창, 창이 지나면 초기화', () => {
    const c = createWindowCounter({ limit: 5, windowMs: 60000 });
    for (let i = 0; i < 5; i += 1) expect(c.hit('a', 0)).toBe(true);
    expect(c.hit('a', 1)).toBe(false);
    expect(c.hit('b', 1)).toBe(true);
    expect(c.hit('a', 60000)).toBe(true);
  });
});
