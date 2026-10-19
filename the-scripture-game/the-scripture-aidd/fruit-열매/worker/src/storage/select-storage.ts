// select-storage.ts — Env 키 유무로 어댑터 1개를 고르는 팩토리만
// TASK-004 | REQ-016 FR-072 NFR-004 C-004 | UC-021 4·4a | ARCH-014 | D-05 | devguide §2.2 L-03
import type { StorageAdapter } from "./adapter";
import type { DurableStorageLike } from "./migrations";
import { SqliteStorageAdapter } from "./sqlite-adapter";
import { SupabaseStorageAdapter } from "./supabase-adapter";

/** select-storage가 읽는 Env 부분 (env.ts Env의 부분 집합 — 테스트에서 객체 리터럴로 줄 수 있게) */
export interface StorageEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

/** 값이 실제로 채워져 있는지 (`.dev.vars.example`을 그대로 복사한 빈 값은 "없음") */
function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * FR-072: SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY가 **둘 다** 있을 때만 Supabase 어댑터를 생성하고,
 * 하나라도 없으면 Durable Object 내장 SQLite 어댑터를 쓴다 (C-004 키 0개로 전부 동작).
 * Matchmaker(원장 호스트) 생성자에서 마이그레이션 뒤 1회 호출한다.
 */
export function selectStorage(env: StorageEnv, storage: DurableStorageLike): StorageAdapter {
  if (present(env.SUPABASE_URL) && present(env.SUPABASE_SERVICE_ROLE_KEY)) {
    return new SupabaseStorageAdapter(env.SUPABASE_URL.trim(), env.SUPABASE_SERVICE_ROLE_KEY.trim());
  }
  return new SqliteStorageAdapter(storage);
}
