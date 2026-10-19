// index.ts — 요청 경로 분기·Origin 검사·Upgrade 전달·전역 오류 응답만 + `export default { fetch }`·`export { Matchmaker, GameRoom }`
// TASK-034 | REQ-016 FR-008 FR-073 NFR-003 C-006 | ARCH-009 | API-001~API-006 | api-gate §2·§4.1·§5 Origin 검사 | D-03
// devguide §3.4 앱 인스턴스 export (통합 테스트 전제) · §3.3 index.ts 최후 방어 (각 라우트는 자기 try/catch를 가진다)
import type { Env } from "./env";
import { log } from "./log";
import { ROOM_ID_PATTERN } from "./protocol/validate";
import { getGuestMe, postGuests } from "./routes/guests";
import { getLeaderboard } from "./routes/leaderboard";
import { getMatches } from "./routes/matches";
import { error } from "./routes/respond";

export { GameRoom } from "./game-room";
export { Matchmaker } from "./matchmaker";

/** API-006 경로 `/ws/room/:roomId` */
const ROOM_PATH = /^\/ws\/room\/([^/]+)$/;

/** architecture §10 제7계명: ALLOWED_ORIGINS(wrangler [vars], 쉼표 구분) */
function allowedOrigins(env: Env): Set<string> {
  return new Set((env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter((o) => o.length > 0));
}

/** API-005·API-006 `Upgrade: websocket` 여부 */
function isUpgrade(request: Request): boolean {
  return request.headers.get("upgrade")?.toLowerCase() === "websocket";
}

/**
 * Worker 진입 (ARCH-009): `/api/*` REST 4종, `/ws/lobby` → Matchmaker(`idFromName("global")`),
 * `/ws/room/:roomId` → GameRoom
 * (`idFromName(roomId)`). Origin이 있으면 허용 목록 안이어야 하고(ORIGIN_FORBIDDEN 403), Origin 없는 비브라우저 요청은 REST만 허용.
 */
export async function handleFetch(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const isApi = path.startsWith("/api/");
    const isWs = path.startsWith("/ws/");
    if (!isApi && !isWs) return error("NOT_FOUND");
    // NFR-003 Origin 허용 목록 (api-gate §5)
    const origin = request.headers.get("origin");
    if (origin === null ? isWs : !allowedOrigins(env).has(origin)) {
      log.event("auth_fail", { code: "ORIGIN_FORBIDDEN" });
      return error("ORIGIN_FORBIDDEN");
    }
    if (isApi) {
      const method = request.method.toUpperCase();
      if (path === "/api/guests" && method === "POST") return await postGuests(request, env);
      if (path === "/api/guests/me" && method === "GET") return await getGuestMe(request, env);
      if (path === "/api/matches" && method === "GET") return await getMatches(request, env);
      if (path === "/api/leaderboard" && method === "GET") return await getLeaderboard(request, env);
      return error("NOT_FOUND");
    }
    const roomMatch = ROOM_PATH.exec(path);
    if (path !== "/ws/lobby" && !roomMatch) return error("NOT_FOUND");
    // API-005·API-006 UPGRADE_REQUIRED 426
    if (!isUpgrade(request)) return error("UPGRADE_REQUIRED");
    if (path === "/ws/lobby") {
      // D-04 전역 Matchmaker 1개 — DO가 ctx.acceptWebSocket (Hibernation)
      const ns = env.MATCHMAKER;
      return await ns.get(ns.idFromName("global")).fetch(request);
    }
    // API-006 ROOM_NOT_FOUND 404 — UUID v4 형식 오류 (설정 없는 방은 소켓 수립 후 GameRoom이 4004). UUID는 퍼센트 인코딩이
    // 필요 없으므로 디코딩하지 않는다 (W-02: 잘못된 `%` 시퀀스가 decodeURIComponent 예외 → 500이 되던 경로 제거)
    const roomId = (roomMatch as RegExpExecArray)[1];
    if (!ROOM_ID_PATTERN.test(roomId)) return error("ROOM_NOT_FOUND");
    const ns = env.GAME_ROOM;
    return await ns.get(ns.idFromName(roomId.toLowerCase())).fetch(request);
  } catch {
    // devguide §3.3 최후 방어 — 스택·내부 메시지 노출 없이 500
    log.event("storage_fail", { code: "INTERNAL_ERROR" });
    return error("INTERNAL_ERROR");
  }
}

export default { fetch: handleFetch } satisfies ExportedHandler<Env>;
