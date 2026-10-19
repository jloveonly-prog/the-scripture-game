// leaderboard.ts — GET /api/leaderboard HTTP 처리만
// TASK-031 | REQ-015 FR-071 NFR-003 | ARCH-009 | API-004 | api-gate §4.1 | TBL-006 TBL-018
// `ledger.leaderboardTop` | UC-019
import type { Env } from "../env";
import { log } from "../log";
import { ledgerStub } from "../matchmaker";
import { bearer, error, ok } from "./respond";

/** API-004 랭킹 상위 rules.ledger.leaderboardTop명 + 내 순위 → 200 {top, me} + meta (guestId 미노출 — 봉인 제1계명) */
export async function getLeaderboard(request: Request, env: Env): Promise<Response> {
  try {
    const token = bearer(request);
    if (!token) {
      log.event("auth_fail", { code: "UNAUTHORIZED" });
      return error("UNAUTHORIZED");
    }
    const result = await ledgerStub(env).getLeaderboard(token);
    // UNAUTHORIZED 401 · STORAGE_UNAVAILABLE 503 (UC-019 E1)
    if (!result.ok) return error(result.code);
    // UC-019 3a 100위 밖이면 top에 내 행이 없고 me로 따로 표시
    return ok({ top: result.data.top, me: result.data.me }, 200, { size: result.data.top.length, nextBefore: null });
  } catch {
    log.event("storage_fail", { code: "INTERNAL_ERROR" });
    return error("INTERNAL_ERROR");
  }
}
