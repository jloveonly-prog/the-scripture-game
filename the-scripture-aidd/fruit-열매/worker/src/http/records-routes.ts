// TASK-033-2 · REQ-014 · FR-069 · NFR-003 · UC-018 — API-003 내 전적 최신순 페이지 조회 (GET /api/matches?page&size)
// 본인이 참여한 경기만 (봉인 제7계명 — api-gate §5.2). 페이징 규칙은 api-gate §2.5.
import { LIMITS } from '../../../client/js/net/protocol.js';
import { StoreError } from '../store/store';
import { authenticateBearer } from './guest-routes';
import { jsonError, jsonOk, logEvent } from './respond';
import type { HttpDeps } from './router';

/** 쿼리 정수 파싱 — 없으면 기본값, 정수가 아니거나 범위 밖이면 null (INVALID_PARAM) */
function intParam(raw: string | null, fallback: number, min: number, max: number): number | null {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

// API-003 · FR-069 전적 조회 — data = MatchListItem[], meta = {page, size, totalCount, totalPages}
export async function getMatches(request: Request, deps: HttpDeps, _params: Record<string, string>, url: URL): Promise<Response> {
  try {
    const auth = await authenticateBearer(request, deps);
    if (auth.kind === 'error') return auth.response;
    if (auth.kind === 'none') return jsonError('UNAUTHORIZED');
    const page = intParam(url.searchParams.get('page'), LIMITS.PAGE_MIN, LIMITS.PAGE_MIN, Number.MAX_SAFE_INTEGER);
    const size = intParam(url.searchParams.get('size'), LIMITS.SIZE_DEFAULT, LIMITS.SIZE_MIN, LIMITS.SIZE_MAX);
    if (page === null || size === null) return jsonError('INVALID_PARAM');
    const { items, totalCount } = await deps.store.listMatches(auth.profile.id, page, size);
    return jsonOk(items, 200, { page, size, totalCount, totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / size) });
  } catch (err) {
    if (err instanceof StoreError) return jsonError('STORE_UNAVAILABLE');
    logEvent('http-internal-error');
    return jsonError('INTERNAL_ERROR');
  }
}
