// guests.ts — POST /api/guests, GET /api/guests/me HTTP 처리만
// TASK-031 | REQ-002 FR-012 NFR-003 NFR-008 | ARCH-009 | API-001 API-002 | api-gate §4.1·§5 | UC-001
// 닉네임 검증·토큰 발급·해시 저장은 원장 서비스(Matchmaker RPC → guest-service)만 — 여기는 파싱·상태 코드만 (devguide §3.5-3).
import { rules } from "../content";
import type { Env } from "../env";
import { log } from "../log";
import { ledgerStub } from "../matchmaker";
import { allowGuestCreate, bearer, BodyError, clientAddress, error, ok, readJson } from "./respond";

/** API-001 게스트 닉네임 입장 → 201 {guestId, nickname, token, rating, createdAt} */
export async function postGuests(request: Request, env: Env): Promise<Response> {
  try {
    // api-gate §2 게스트 생성 접속 주소별 rules.rateLimit.guestCreate (DCL-002)
    if (!allowGuestCreate(clientAddress(request), Date.now(), rules)) {
      log.event("rate_limited", { code: "RATE_LIMITED" });
      return error("RATE_LIMITED");
    }
    // FR-012 본문 최대 rules.rateLimit.maxRestBodyBytes (PAYLOAD_TOO_LARGE 413 / BAD_REQUEST 400)
    const body = await readJson(request, rules.rateLimit.maxRestBodyBytes);
    const result = await ledgerStub(env).createGuest(body.nickname);
    // NICKNAME_INVALID 400 · NICKNAME_TAKEN 409 · STORAGE_UNAVAILABLE 503 (UC-001 E1·E2, UC-021 E2)
    if (!result.ok) return error(result.code);
    return ok(result.data, 201);
  } catch (err) {
    if (err instanceof BodyError) return error(err.code);
    log.event("storage_fail", { code: "INTERNAL_ERROR" });
    return error("INTERNAL_ERROR");
  }
}

/** API-002 저장된 토큰 확인·내 프로필 → 200 {guestId, nickname, rating, roundsPlayed} (UC-001 1a) */
export async function getGuestMe(request: Request, env: Env): Promise<Response> {
  try {
    const token = bearer(request);
    if (!token) {
      log.event("auth_fail", { code: "UNAUTHORIZED" });
      return error("UNAUTHORIZED");
    }
    const result = await ledgerStub(env).getMe(token);
    // UNAUTHORIZED 401 → 클라이언트가 swt.guest 삭제 (UC-001 E3) · STORAGE_UNAVAILABLE 503 (E4)
    if (!result.ok) return error(result.code);
    return ok(result.data);
  } catch {
    log.event("storage_fail", { code: "INTERNAL_ERROR" });
    return error("INTERNAL_ERROR");
  }
}
