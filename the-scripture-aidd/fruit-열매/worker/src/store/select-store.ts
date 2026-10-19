// TASK-030-3 · FR-072 · C-004 · architecture §4.2 — 저장소 모드 자동 선택 (두 환경변수가 모두 있을 때만 Supabase, 아니면 로컬 RPC 프록시)
// isolate 수명 동안 env는 불변이므로 env 객체당 1회만 계산해 캐시한다. 반쪽 설정은 로컬 모드 + 경고 1줄 (기동 실패 없음).
import { DoStoreClient } from './do-store-client';
import { SupabaseStore } from './supabase-store';
import type { Store } from './store';
import type { Env } from '../env';

const nonEmpty = (v: string | undefined): v is string => typeof v === 'string' && v.trim().length > 0;

// FR-072 Supabase 모드 여부 (SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY 둘 다 비어 있지 않음)
export function isSupabaseMode(env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>): boolean {
  return nonEmpty(env.SUPABASE_URL) && nonEmpty(env.SUPABASE_SERVICE_ROLE_KEY);
}

const cache = new WeakMap<object, Store>();

// FR-072 Store 선택 (isolate당 1회 계산 캐시 — devguide §7.5)
export function selectStore(env: Env): Store {
  const cached = cache.get(env);
  if (cached) return cached;
  let store: Store;
  if (isSupabaseMode(env)) {
    store = new SupabaseStore((env.SUPABASE_URL as string).trim(), (env.SUPABASE_SERVICE_ROLE_KEY as string).trim());
  } else {
    if (nonEmpty(env.SUPABASE_URL) !== nonEmpty(env.SUPABASE_SERVICE_ROLE_KEY)) {
      // 값은 출력하지 않는다 (봉인 제1·2계명)
      console.log(JSON.stringify({ at: new Date().toISOString(), event: 'supabase-config-incomplete', mode: 'local' }));
    }
    store = new DoStoreClient(env);
  }
  cache.set(env, store);
  return store;
}
