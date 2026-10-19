// TASK-033-1 · NFR-003 · FR-073 · REQ-002 · REQ-014 · REQ-015 · devguide §3.5 — Worker 진입: 라우트 표·의존성 구성·전역 try-catch(2중 방어)·DO 클래스 re-export
// wrangler는 진입 모듈 export에서 DO 클래스(Matchmaker·GameRoom)를 찾는다 (wrangler.toml durable_objects.bindings).
import { HTTP_RATE_LIMITS } from '../../client/js/net/protocol.js';
import { getMe, postGuest } from './http/guest-routes';
import { getRankings } from './http/ranking-routes';
import { getMatches } from './http/records-routes';
import { jsonError, logEvent } from './http/respond';
import { matchRoute } from './http/router';
import type { HttpDeps, Route } from './http/router';
import { wsMatchmaker, wsRoom } from './http/ws-routes';
import { createWindowCounter } from './protocol/rate-limit';
import { selectStore } from './store/select-store';
import type { Env } from './env';

export { Matchmaker } from './matchmaker';
export { GameRoom } from './game-room';

/** api-gate §1.1·§1.2 */
const ROUTES: readonly Route[] = [
  { method: 'POST', path: '/api/guest', handler: postGuest },
  { method: 'GET', path: '/api/guest/me', handler: getMe },
  { method: 'GET', path: '/api/matches', handler: getMatches },
  { method: 'GET', path: '/api/rankings', handler: getRankings },
  { method: 'GET', path: '/ws/matchmaker', handler: wsMatchmaker },
  { method: 'GET', path: '/ws/room/:roomId', handler: wsRoom },
];

/** api-gate §2.7 HTTP 빈도 제한 — isolate 메모리 카운터 (주소·토큰 해시는 저장·로그하지 않는다) */
const limits = {
  guestCreate: createWindowCounter(HTTP_RATE_LIMITS.guestCreate),
  query: createWindowCounter(HTTP_RATE_LIMITS.query),
};

// NFR-003 · FR-073 HTTP 진입 (테스트는 가짜 Env를 넣어 직접 호출 — devguide §3.5·§7.11)
export async function handleFetch(request: Request, env: Env, _ctx?: unknown): Promise<Response> {
  try {
    const url = new URL(request.url);
    const match = matchRoute(ROUTES, request.method, url.pathname);
    if (match.kind === 'NOT_FOUND') return jsonError('NOT_FOUND');
    if (match.kind === 'METHOD_NOT_ALLOWED') return jsonError('METHOD_NOT_ALLOWED');
    const deps: HttpDeps = { store: selectStore(env), env, now: () => Date.now(), limits };
    return await match.handler(request, deps, match.params, url);
  } catch {
    logEvent('http-unhandled-error'); // 스택·요청 내용 미기록 (봉인 제1계명)
    return jsonError('INTERNAL_ERROR');
  }
}

export default { fetch: handleFetch };
