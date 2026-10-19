// TASK-033-2 · REQ-015 · FR-071 · NFR-003 · UC-019 — API-004 랭킹 상위 100 + (토큰이 있으면) 내 순위 (GET /api/rankings)
// 다른 사람의 게스트 ID는 응답에 싣지 않는다 — isMe는 서버가 계산한 불리언 (api-gate §5.3).
import { StoreError } from '../store/store';
import { authenticateBearer } from './guest-routes';
import { jsonError, jsonOk, logEvent } from './respond';
import type { HttpDeps } from './router';

// API-004 · FR-071 랭킹 조회 — data = { top: [{rank, nickname, rating, isMe}], me: {rank, nickname, rating} | null }
export async function getRankings(request: Request, deps: HttpDeps): Promise<Response> {
  try {
    const auth = await authenticateBearer(request, deps, true);
    if (auth.kind === 'error') return auth.response;
    const myId = auth.kind === 'ok' ? auth.profile.id : null;
    const rows = await deps.store.getLeaderboard();
    const top = rows.map((r) => ({ rank: r.rank, nickname: r.nickname, rating: r.rating, isMe: myId !== null && r.guestId === myId }));
    const me = myId !== null ? await deps.store.getRank(myId) : null;
    return jsonOk({ top, me: me ? { rank: me.rank, nickname: me.nickname, rating: me.rating } : null });
  } catch (err) {
    if (err instanceof StoreError) return jsonError('STORE_UNAVAILABLE');
    logEvent('http-internal-error');
    return jsonError('INTERNAL_ERROR');
  }
}
