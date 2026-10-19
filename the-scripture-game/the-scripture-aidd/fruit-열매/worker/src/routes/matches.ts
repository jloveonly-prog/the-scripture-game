// matches.ts — GET /api/matches HTTP 처리(limit·before 파싱)만
// TASK-031 | REQ-014 FR-069 NFR-003 | ARCH-009 | API-003 | api-gate §2 페이징·§4.1 | TBL-018 `ledger.historyPage*`
// (DCL-003)
// UC-018
// limit 범위(1~ledger.historyPageMax, 기본 ledger.historyPageDefault)·before ISO-8601 판정은 history-service(INVALID_QUERY).
import type { Env } from "../env";
import { log } from "../log";
import { ledgerStub } from "../matchmaker";
import { bearer, error, ok } from "./respond";

/** API-003 내 전적 최신순 → 200 data[] + meta {size, nextBefore} (0건이면 data: []) */
export async function getMatches(request: Request, env: Env): Promise<Response> {
  try {
    const token = bearer(request);
    if (!token) {
      log.event("auth_fail", { code: "UNAUTHORIZED" });
      return error("UNAUTHORIZED");
    }
    const params = new URL(request.url).searchParams;
    const page = await ledgerStub(env).listMatches(token, { limit: params.get("limit"), before: params.get("before") });
    // UNAUTHORIZED 401 (UC-018 E2) · INVALID_QUERY 400 · STORAGE_UNAVAILABLE 503 (UC-018 E1)
    if (!page.ok) return error(page.code);
    // API-003 응답 필드 — 슬롯 번호·guestId는 내보내지 않는다 (봉인 제1계명: 상대는 닉네임만)
    const data = page.data.map((r) => ({
      matchId: r.matchId, mode: r.mode, botLevel: r.botLevel, result: r.result, endReason: r.endReason,
      durationMs: r.durationMs, playedAt: r.playedAt,
      me: { heroId: r.me.heroId, roundsWon: r.me.roundsWon, ratingBefore: r.me.ratingBefore,
        ratingAfter: r.me.ratingAfter },
      opponent: { nickname: r.opponent.nickname, isBot: r.opponent.isBot, heroId: r.opponent.heroId,
        roundsWon: r.opponent.roundsWon },
    }));
    return ok(data, 200, page.meta);
  } catch {
    log.event("storage_fail", { code: "INTERNAL_ERROR" });
    return error("INTERNAL_ERROR");
  }
}
