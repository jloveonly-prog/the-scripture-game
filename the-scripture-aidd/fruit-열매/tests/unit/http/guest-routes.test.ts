// TASK-033-4 · FR-012 · FR-075 · NFR-003 · REQ-017 — handleFetch + 테스트 Store: API-001·002 (201·400·409·401·429·503), 라우터 404·405, WS 업그레이드 검사
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }));
vi.mock('../../../worker/src/game-room', () => ({ GameRoom: class {} }));

import { handleFetch } from '../../../worker/src/index';
import { applySchema } from '../../../worker/src/store/do-sqlite-schema';
import type { SqlStorageLike } from '../../../worker/src/store/do-sqlite-schema';
import { DoSqliteStore } from '../../../worker/src/store/do-sqlite-store';
import { StoreError } from '../../../worker/src/store/store';
import type { Env } from '../../../worker/src/env';

function memoryStorage(): SqlStorageLike {
  const db = new DatabaseSync(':memory:');
  return {
    sql: { exec: (q: string, ...b: unknown[]) => { const rows = db.prepare(q).all(...(b as never[])) as Record<string, unknown>[]; return { toArray: () => rows }; } },
    transactionSync<T>(fn: () => T): T {
      db.exec('BEGIN');
      try { const out = fn(); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}

/** 가짜 Env: MATCHMAKER RPC = 실제 DoSqliteStore(node:sqlite), fetch = 전달 확인용 */
function makeEnv(rpc?: object) {
  const storage = memoryStorage();
  applySchema(storage);
  const store = new DoSqliteStore(storage);
  const mmFetch = vi.fn(async () => new Response('matchmaker', { status: 200 }));
  const roomFetch = vi.fn(async () => new Response('room', { status: 200 }));
  const mmTarget = new Proxy({}, {
    get: (_t, key) => (key === 'fetch' ? mmFetch : (...args: unknown[]) =>
      ((rpc ?? store) as Record<string, (...a: unknown[]) => unknown>)[key as string](...args)),
  });
  const env = {
    MATCHMAKER: { idFromName: (n: string) => n, get: () => mmTarget },
    GAME_ROOM: { idFromName: (n: string) => n, get: () => ({ fetch: roomFetch }) },
    ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
  } as unknown as Env;
  return { env, store, mmFetch, roomFetch };
}

let ipSeq = 0;
const post = (body: unknown, ip = `10.0.0.${++ipSeq}`) => new Request('http://x/api/guest', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const me = (auth?: string) => new Request('http://x/api/guest/me', { headers: auth ? { Authorization: auth } : {} });

describe('API-001 POST /api/guest', () => {
  let ctx: ReturnType<typeof makeEnv>;
  beforeEach(() => {
    ctx = makeEnv();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('201 — guestId·닉네임·43자 토큰·레이팅 1000, 보안 헤더', async () => {
    const res = await handleFetch(post({ nickname: ' 다윗의물맷돌 ' }), ctx.env);
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const body = await res.json();
    expect(body).toMatchObject({ success: true, data: { nickname: '다윗의물맷돌', rating: 1000 } });
    expect(body.data.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.data.guestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('400 INVALID_BODY — JSON 아님·누락·추가 필드·문자열 아님', async () => {
    for (const bad of ['{oops', {}, { nickname: 'abc', email: 'a@b.c' }, { nickname: 42 }, ['abc']]) {
      const res = await handleFetch(post(bad), ctx.env);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('INVALID_BODY');
    }
  });

  it('400 INVALID_NICKNAME — 길이·문자 규칙', async () => {
    for (const nickname of ['a', 'abcdefghijklm', '공 백', '   ']) {
      const res = await handleFetch(post({ nickname }), ctx.env);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toEqual({ code: 'INVALID_NICKNAME', message: '닉네임 규칙(길이·문자)을 확인하세요.' });
    }
  });

  it('409 NICKNAME_TAKEN — 대소문자 무시 중복', async () => {
    expect((await handleFetch(post({ nickname: 'Paul' }), ctx.env)).status).toBe(201);
    const res = await handleFetch(post({ nickname: 'PAUL' }), ctx.env);
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('NICKNAME_TAKEN');
  });

  it('429 RATE_LIMITED — 출처 주소당 5회/분', async () => {
    for (let i = 0; i < 5; i += 1) await handleFetch(post({ nickname: `user${i}` }, '192.0.2.77'), ctx.env);
    const res = await handleFetch(post({ nickname: 'user9' }, '192.0.2.77'), ctx.env);
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe('RATE_LIMITED');
  });

  it('503 STORE_UNAVAILABLE — 저장소 실패 (내부 정보 미노출)', async () => {
    const down = makeEnv({ createProfile: async () => { throw new StoreError('STORE_UNAVAILABLE', 'SQLITE_BUSY at line 3'); } });
    const res = await handleFetch(post({ nickname: 'Peter' }), down.env);
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).not.toContain('SQLITE');
    expect(JSON.parse(text).error.code).toBe('STORE_UNAVAILABLE');
  });
});

describe('API-002 GET /api/guest/me', () => {
  it('200 복원 / 401 UNAUTHORIZED / 401 INVALID_TOKEN / 503', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const ctx = makeEnv();
    const created = (await (await handleFetch(post({ nickname: 'Solomon' }), ctx.env)).json()).data;
    const ok = await handleFetch(me(`Bearer ${created.token}`), ctx.env);
    expect(ok.status).toBe(200);
    expect((await ok.json()).data).toEqual({ guestId: created.guestId, nickname: 'Solomon', rating: 1000 });
    expect((await handleFetch(me(), ctx.env)).status).toBe(401);
    expect((await (await handleFetch(me('Bearer short'), ctx.env)).json()).error.code).toBe('UNAUTHORIZED');
    expect((await (await handleFetch(me(`Basic ${created.token}`), ctx.env)).json()).error.code).toBe('UNAUTHORIZED');
    const other = 'A'.repeat(43);
    const invalid = await handleFetch(me(`Bearer ${other}`), ctx.env);
    expect(invalid.status).toBe(401);
    expect((await invalid.json()).error.code).toBe('INVALID_TOKEN');
    const down = makeEnv({ getProfileByTokenHash: async () => { throw new StoreError('STORE_UNAVAILABLE'); } });
    expect((await handleFetch(me(`Bearer ${created.token}`), down.env)).status).toBe(503);
  });
});

describe('라우터·WS 업그레이드 (API-005·006)', () => {
  const ws = (path: string, headers: Record<string, string>) => new Request(`http://x${path}`, { headers });
  const good = { Upgrade: 'websocket', Origin: 'http://localhost:5173' };

  it('404 NOT_FOUND / 405 METHOD_NOT_ALLOWED', async () => {
    const ctx = makeEnv();
    expect((await (await handleFetch(new Request('http://x/api/nope'), ctx.env)).json()).error.code).toBe('NOT_FOUND');
    const r = await handleFetch(new Request('http://x/api/guest', { method: 'GET' }), ctx.env);
    expect(r.status).toBe(405);
  });

  it('426 Upgrade 아님 / 403 Origin 불허 / 400 roomId 형식', async () => {
    const ctx = makeEnv();
    expect((await handleFetch(ws('/ws/matchmaker', { Origin: good.Origin }), ctx.env)).status).toBe(426);
    expect((await handleFetch(ws('/ws/matchmaker', { Upgrade: 'websocket', Origin: 'https://evil.example' }), ctx.env)).status).toBe(403);
    expect((await handleFetch(ws('/ws/matchmaker', { Upgrade: 'websocket' }), ctx.env)).status).toBe(403);
    const bad = await handleFetch(ws('/ws/room/not-a-uuid', good), ctx.env);
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe('INVALID_PARAM');
    expect(ctx.mmFetch).not.toHaveBeenCalled();
    expect(ctx.roomFetch).not.toHaveBeenCalled();
  });

  it('검사 통과 시 Matchmaker("global")·GameRoom(idFromName(roomId))으로 전달', async () => {
    const ctx = makeEnv();
    expect(await (await handleFetch(ws('/ws/matchmaker', good), ctx.env)).text()).toBe('matchmaker');
    const roomId = 'c2b7e1d4-9f3a-4e6b-8d20-5a1c7f9e3b46';
    expect(await (await handleFetch(ws(`/ws/room/${roomId}`, { ...good, Origin: 'http://127.0.0.1:5173' }), ctx.env)).text()).toBe('room');
  });
});
