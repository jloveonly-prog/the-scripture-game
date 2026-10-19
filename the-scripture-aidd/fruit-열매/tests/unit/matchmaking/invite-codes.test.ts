// TASK-034-3 · FR-019 · D-09 · REQ-017 — 초대 코드 형식·재발급·만료·가득 참·자기 코드·닫기
import { describe, expect, it } from 'vitest';
import {
  closeInviteCode, closeInviteCodesForRoom, expireInviteCodes, generateInviteCode, issueInviteCode, redeemInviteCode, reopenInviteCode,
} from '../../../worker/src/matchmaking/invite-codes';
import type { InviteCodeRepo, InviteRow } from '../../../worker/src/matchmaking/invite-codes';

const TTL = 600000;

/** 메모리 InviteCodeRepo 대역 (SQL 구현은 tests/unit/store에서 검사) */
function memoryRepo(): InviteCodeRepo & { rows: Map<string, InviteRow> } {
  const rows = new Map<string, InviteRow>();
  return {
    rows,
    insert(r) {
      if (rows.has(r.code)) return false;
      rows.set(r.code, { code: r.code, roomId: r.roomId, hostId: r.hostId, status: 'open', expiresAt: r.expiresAt });
      return true;
    },
    find: (code) => rows.get(code) ?? null,
    setStatus(code, status) { const r = rows.get(code); if (r) r.status = status; },
    closeByRoom(roomId) { for (const r of rows.values()) if (r.roomId === roomId) r.status = 'closed'; },
    listExpiredOpen: (now) => [...rows.values()].filter((r) => r.status === 'open' && r.expiresAt <= now),
    purge(now) { for (const [k, r] of rows) if (r.expiresAt <= now || r.status === 'closed') rows.delete(k); },
    nextExpiry: () => (rows.size ? Math.min(...[...rows.values()].map((r) => r.expiresAt)) : null),
  };
}

/** 정해진 난수열을 돌려주는 rand */
const seq = (values: number[]) => { let i = 0; return () => values[i++ % values.length]; };

describe('generateInviteCode (D-09)', () => {
  it('6자, 0·O·1·I 없는 32종 문자', () => {
    for (let i = 0; i < 200; i += 1) expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(generateInviteCode(() => 0)).toBe('AAAAAA');
    expect(generateInviteCode(() => 0.999999)).toBe('999999');
  });
});

describe('issueInviteCode', () => {
  it('발급 + 10분 만료', () => {
    const repo = memoryRepo();
    const r = issueInviteCode(repo, { hostId: 'h', roomId: 'room', now: 1000, rand: () => 0 });
    expect(r).toEqual({ ok: true, code: 'AAAAAA', expiresAt: 1000 + TTL });
  });

  it('충돌하면 재발급, 재발급 5회 모두 충돌하면 CODE_EXHAUSTED', () => {
    const repo = memoryRepo();
    issueInviteCode(repo, { hostId: 'h1', roomId: 'r1', now: 0, rand: () => 0 });
    // 첫 시도 AAAAAA 충돌 → 두 번째 시도는 다른 코드
    const second = issueInviteCode(repo, { hostId: 'h2', roomId: 'r2', now: 0, rand: seq([0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]) });
    expect(second).toMatchObject({ ok: true });
    expect(second.ok && second.code).not.toBe('AAAAAA');
    expect(issueInviteCode(repo, { hostId: 'h3', roomId: 'r3', now: 0, rand: () => 0 })).toEqual({ ok: false, code: 'CODE_EXHAUSTED' });
  });
});

describe('redeemInviteCode (API-101 invite)', () => {
  const setup = () => {
    const repo = memoryRepo();
    issueInviteCode(repo, { hostId: 'host', roomId: 'room-1', now: 0, rand: () => 0 });
    return repo;
  };

  it('소문자 입력도 대문자 정규화 후 입장, status full', () => {
    const repo = setup();
    expect(redeemInviteCode(repo, 'aaaaaa', 'friend', 10)).toEqual({ ok: true, code: 'AAAAAA', roomId: 'room-1', hostId: 'host' });
    expect(repo.rows.get('AAAAAA')?.status).toBe('full');
  });

  it('가득 찬 방 ROOM_FULL, 자기 코드 OWN_INVITE', () => {
    const repo = setup();
    expect(redeemInviteCode(repo, 'AAAAAA', 'host', 10)).toEqual({ ok: false, code: 'OWN_INVITE' });
    redeemInviteCode(repo, 'AAAAAA', 'friend', 10);
    expect(redeemInviteCode(repo, 'AAAAAA', 'third', 10)).toEqual({ ok: false, code: 'ROOM_FULL' });
    reopenInviteCode(repo, 'AAAAAA');
    expect(redeemInviteCode(repo, 'AAAAAA', 'third', 10)).toMatchObject({ ok: true });
  });

  it('없는·형식 오류·만료·닫힌 코드는 INVITE_NOT_FOUND', () => {
    const repo = setup();
    expect(redeemInviteCode(repo, 'ZZZZZZ', 'friend', 10)).toEqual({ ok: false, code: 'INVITE_NOT_FOUND' });
    expect(redeemInviteCode(repo, 'AAAA0A', 'friend', 10)).toEqual({ ok: false, code: 'INVITE_NOT_FOUND' });
    expect(redeemInviteCode(repo, 'AAAAAA', 'friend', TTL)).toEqual({ ok: false, code: 'INVITE_NOT_FOUND' });
    closeInviteCode(repo, 'AAAAAA', 10);
    expect(repo.rows.size).toBe(0); // closed 즉시 삭제 (봉인 제4계명)
    expect(redeemInviteCode(repo, 'AAAAAA', 'friend', 10)).toEqual({ ok: false, code: 'INVITE_NOT_FOUND' });
  });
});

describe('만료·방 종료', () => {
  it('만료된 열린 코드는 통지 대상으로 돌려주고 삭제', () => {
    const repo = memoryRepo();
    issueInviteCode(repo, { hostId: 'h', roomId: 'r', now: 0, rand: () => 0 });
    expect(expireInviteCodes(repo, TTL - 1)).toEqual([]);
    expect(expireInviteCodes(repo, TTL).map((r) => r.hostId)).toEqual(['h']);
    expect(repo.rows.size).toBe(0);
  });

  it('roomClosed → 그 방 코드 closed·삭제', () => {
    const repo = memoryRepo();
    issueInviteCode(repo, { hostId: 'h', roomId: 'r', now: 0, rand: () => 0 });
    closeInviteCodesForRoom(repo, 'r', 1);
    expect(repo.find('AAAAAA')).toBeNull();
  });
});
