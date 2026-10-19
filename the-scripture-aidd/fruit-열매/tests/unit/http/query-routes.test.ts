// TASK-033-4 · FR-069 · FR-071 · FR-075 · NFR-003 · REQ-017 — handleFetch + 테스트 Store: API-003 전적(페이징·INVALID_PARAM)·API-004 랭킹(내 순위·isMe)·429·503
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }));
vi.mock('../../../worker/src/game-room', () => ({ GameRoom: class {} }));

import { handleFetch } from '../../../worker/src/index';
import { hashToken } from '../../../worker/src/auth/token';
import { StoreError } from '../../../worker/src/store/store';
import type { LeaderboardRow, MatchListItem, Profile, Store } from '../../../worker/src/store/store';
import type { Env } from '../../../worker/src/env';

let tokenSeq = 0;
const newToken = (): string => `T${String(++tokenSeq).padStart(42, '0')}`;

const item = (n: number): MatchListItem => ({
  matchId: `m${n}`, mode: 'random', opponent: { nickname: 'x', isBot: false, botLevel: null }, myHero: 'david', opponentHero: 'paul',
  result: 'win', endReason: 'topout', rounds: [2, 0], durationMs: 1, ratingDelta: 16, createdAt: `2026-10-20T00:00:${String(n).padStart(2, '0')}.000Z`,
});

/** 테스트 Store: 토큰 1개 = 게스트 g1, 전적 37건, 랭킹 3명 (g1은 2위) */
async function setup(over: Partial<Store> = {}) {
  const token = newToken();
  const tokenHash = await hashToken(token);
  const profile: Profile = { id: 'g1', nickname: '다윗', rating: 1048, createdAt: '', lastSeenAt: '' };
  const all = Array.from({ length: 37 }, (_, i) => item(i));
  const board: LeaderboardRow[] = [
    { rank: 1, guestId: 'g9', nickname: '바울', rating: 1112 },
    { rank: 2, guestId: 'g1', nickname: '다윗', rating: 1048 },
    { rank: 3, guestId: 'g5', nickname: '베드로', rating: 990 },
  ];
  const store = {
    getProfileByTokenHash: vi.fn(async (h: string) => (h === tokenHash ? profile : null)),
    listMatches: vi.fn(async (_id: string, page: number, size: number) => ({ items: all.slice((page - 1) * size, page * size), totalCount: all.length })),
    getLeaderboard: vi.fn(async () => board),
    getRank: vi.fn(async () => ({ rank: 2, nickname: '다윗', rating: 1048 })),
    ...over,
  };
  const env = {
    MATCHMAKER: { idFromName: (n: string) => n, get: () => store },
    GAME_ROOM: { idFromName: (n: string) => n, get: () => ({}) },
    ALLOWED_ORIGINS: 'http://localhost:5173',
  } as unknown as Env;
  return { token, env, store };
}

const get = (path: string, token?: string) => new Request(`http://x${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('API-003 GET /api/matches', () => {
  it('기본 page 1·size 20, meta totalPages = ceil(total/size)', async () => {
    const { token, env, store } = await setup();
    const res = await handleFetch(get('/api/matches', token), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(20);
    expect(body.meta).toEqual({ page: 1, size: 20, totalCount: 37, totalPages: 2 });
    expect(store.listMatches).toHaveBeenCalledWith('g1', 1, 20);
  });

  it('page·size 지정, 0건이면 totalPages 0', async () => {
    const { token, env } = await setup();
    const body = await (await handleFetch(get('/api/matches?page=2&size=50', token), env)).json();
    expect(body.meta).toEqual({ page: 2, size: 50, totalCount: 37, totalPages: 1 });
    const empty = await setup({ listMatches: vi.fn(async () => ({ items: [], totalCount: 0 })) });
    const e = await (await handleFetch(get('/api/matches', empty.token), empty.env)).json();
    expect(e).toEqual({ success: true, data: [], meta: { page: 1, size: 20, totalCount: 0, totalPages: 0 } });
  });

  it('400 INVALID_PARAM — 범위 밖·정수 아님', async () => {
    const { token, env } = await setup();
    for (const q of ['page=0', 'size=51', 'size=0', 'page=1.5', 'page=abc', 'size=-1']) {
      const res = await handleFetch(get(`/api/matches?${q}`, token), env);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('INVALID_PARAM');
    }
  });

  it('401 토큰 없음·무효, 503 저장소 실패', async () => {
    const { env } = await setup();
    expect((await (await handleFetch(get('/api/matches'), env)).json()).error.code).toBe('UNAUTHORIZED');
    expect((await (await handleFetch(get('/api/matches', newToken()), env)).json()).error.code).toBe('INVALID_TOKEN');
    const down = await setup({ listMatches: vi.fn(async () => { throw new StoreError('STORE_UNAVAILABLE'); }) });
    expect((await handleFetch(get('/api/matches', down.token), down.env)).status).toBe(503);
  });

  it('429 RATE_LIMITED — 토큰당 30회/분', async () => {
    const { token, env } = await setup();
    for (let i = 0; i < 30; i += 1) expect((await handleFetch(get('/api/matches', token), env)).status).toBe(200);
    const res = await handleFetch(get('/api/matches', token), env);
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe('RATE_LIMITED');
  });
});

describe('API-004 GET /api/rankings', () => {
  it('토큰 없음 → me null, isMe 모두 false, 게스트 ID 미노출', async () => {
    const { env } = await setup();
    const res = await handleFetch(get('/api/rankings'), env);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('g9');
    const body = JSON.parse(text);
    expect(body.data.me).toBeNull();
    expect(body.data.top.every((r: { isMe: boolean }) => r.isMe === false)).toBe(true);
    expect(body.data.top[0]).toEqual({ rank: 1, nickname: '바울', rating: 1112, isMe: false });
  });

  it('토큰 있음 → 내 행 isMe·me 순위', async () => {
    const { token, env } = await setup();
    const body = await (await handleFetch(get('/api/rankings', token), env)).json();
    expect(body.data.top[1].isMe).toBe(true);
    expect(body.data.me).toEqual({ rank: 2, nickname: '다윗', rating: 1048 });
  });

  it('보낸 토큰이 형식 오류·무효면 401 INVALID_TOKEN, 저장소 실패 503', async () => {
    const { env } = await setup();
    const bad = await handleFetch(new Request('http://x/api/rankings', { headers: { Authorization: 'Bearer nope' } }), env);
    expect(bad.status).toBe(401);
    expect((await bad.json()).error.code).toBe('INVALID_TOKEN');
    expect((await handleFetch(get('/api/rankings', newToken()), env)).status).toBe(401);
    const down = await setup({ getLeaderboard: vi.fn(async () => { throw new StoreError('STORE_UNAVAILABLE'); }) });
    expect((await handleFetch(get('/api/rankings'), down.env)).status).toBe(503);
  });

  it('Matchmaker RPC의 예상 못 한 오류도 STORE_UNAVAILABLE 503 (내부 정보 미포함)', async () => {
    const boom = await setup({ getLeaderboard: vi.fn(async () => { throw new TypeError('secret stack'); }) });
    const res = await handleFetch(get('/api/rankings'), boom.env);
    expect(res.status).toBe(503); // DoStoreClient가 RPC 오류를 STORE_UNAVAILABLE로 감싼다
    expect(await res.text()).not.toContain('secret');
  });
});
