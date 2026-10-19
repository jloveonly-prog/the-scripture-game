// TASK-030-4 · FR-072 · C-004 · REQ-017 — 저장소 자동 선택 규칙 (두 변수 모두 → Supabase, 아니면 로컬 RPC 프록시) + RPC 오류 코드 복원
import { describe, expect, it, vi } from 'vitest';
import { DoStoreClient, toStoreError } from '../../../worker/src/store/do-store-client';
import { isSupabaseMode, selectStore } from '../../../worker/src/store/select-store';
import { SupabaseStore } from '../../../worker/src/store/supabase-store';
import { StoreError } from '../../../worker/src/store/store';
import type { Env } from '../../../worker/src/env';

function fakeEnv(over: Partial<Env> = {}, rpc: Record<string, unknown> = {}): Env {
  const ns = { idFromName: (name: string) => ({ name }), get: vi.fn(() => rpc) };
  return { MATCHMAKER: ns, GAME_ROOM: ns, ALLOWED_ORIGINS: 'http://localhost:5173', ...over } as unknown as Env;
}

describe('selectStore', () => {
  it('키 없음 → DoStoreClient (외부 요청 0)', () => {
    expect(selectStore(fakeEnv())).toBeInstanceOf(DoStoreClient);
  });

  it('두 변수 모두 있을 때만 SupabaseStore', () => {
    expect(selectStore(fakeEnv({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }))).toBeInstanceOf(SupabaseStore);
    expect(isSupabaseMode({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: '  ' })).toBe(false);
  });

  it('반쪽 설정은 로컬 모드 + 경고 1줄 (값은 로그에 없다)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const store = selectStore(fakeEnv({ SUPABASE_URL: 'https://secret-host.supabase.co' }));
    expect(store).toBeInstanceOf(DoStoreClient);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).not.toContain('secret-host');
  });

  it('같은 env는 1회만 계산해 캐시', () => {
    const env = fakeEnv();
    expect(selectStore(env)).toBe(selectStore(env));
  });

  it('DoStoreClient는 Matchmaker("global") RPC로 위임하고 오류 메시지를 StoreError 코드로 복원한다', async () => {
    const rpc = {
      getLeaderboard: vi.fn(async () => []),
      createProfile: vi.fn(async () => { throw new Error('NICKNAME_TAKEN'); }),
      touchProfile: vi.fn(async () => { throw new Error('boom'); }),
    };
    const env = fakeEnv({}, rpc);
    const client = new DoStoreClient(env);
    expect(await client.getLeaderboard()).toEqual([]);
    await expect(client.createProfile({ id: 'a', nickname: 'ab', nicknameKey: 'ab', tokenHash: 'h' })).rejects.toMatchObject({ code: 'NICKNAME_TAKEN' });
    await expect(client.touchProfile('a')).rejects.toMatchObject({ code: 'STORE_UNAVAILABLE' });
    expect((env.MATCHMAKER.get as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    expect(toStoreError(new StoreError('RATING_CHANGED')).code).toBe('RATING_CHANGED');
  });
});
