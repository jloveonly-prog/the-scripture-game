// env.ts — Env 인터페이스(MATCHMAKER·GAME_ROOM 네임스페이스, ALLOWED_ORIGINS, SUPABASE_URL?, SUPABASE_SERVICE_ROLE_KEY?) 타입 정의만
// TASK-001-4 | REQ-016 FR-072 NFR-004 | ARCH-009 ARCH-014 | D-05 | wrangler.toml 바인딩과 1:1

/** Worker·DO가 받는 환경 바인딩 (worker/wrangler.toml + .dev.vars). */
export interface Env {
  /** ARCH-010 Matchmaker DO — 전역 1개(`idFromName("global")`), 원장 SQLite 호스팅 */
  MATCHMAKER: DurableObjectNamespace;
  /** ARCH-011 GameRoom DO — 방 1개당 1개 */
  GAME_ROOM: DurableObjectNamespace;
  /** architecture §10 제7계명: 쉼표로 구분한 Origin 허용 목록 (wrangler.toml [vars]) */
  ALLOWED_ORIGINS: string;
  /** FR-072: Supabase 프로젝트 URL — `.dev.vars` / `wrangler secret`에만 (NFR-004). 없으면 DO SQLite */
  SUPABASE_URL?: string;
  /** FR-072: Supabase service role 키 — Worker 환경에만, 클라이언트 번들 0 (NFR-004, 봉인 제2계명) */
  SUPABASE_SERVICE_ROLE_KEY?: string;
}
