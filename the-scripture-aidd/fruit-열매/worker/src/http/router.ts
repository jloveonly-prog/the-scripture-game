// TASK-033-1 · NFR-003 · FR-073 · api-gate §1.1·§1.2·§4.1 — 메서드·경로 매칭 (정의되지 않은 경로 404 NOT_FOUND, 메서드 불일치 405 METHOD_NOT_ALLOWED)
// 라우트 처리기는 Store 인터페이스(deps.store)만 받는다 — selectStore를 직접 부르지 않는다 (devguide §7.11 테스트 대체점).
import type { Env } from '../env';
import type { WindowCounter } from '../protocol/rate-limit';
import type { Store } from '../store/store';

/** index.ts가 요청마다 만들어 넘기는 의존성 (devguide §3.4 의존성 주입) */
export interface HttpDeps {
  store: Store;
  env: Env;
  now: () => number;
  limits: { guestCreate: WindowCounter; query: WindowCounter };
}

export type RouteParams = Record<string, string>;
export type Handler = (request: Request, deps: HttpDeps, params: RouteParams, url: URL) => Promise<Response>;

/** 경로 형식: 고정 경로 또는 마지막 조각 하나가 `:이름`인 경로 (예: `/ws/room/:roomId`) */
export interface Route { method: string; path: string; handler: Handler }

export type RouteMatch = { kind: 'ok'; handler: Handler; params: RouteParams } | { kind: 'NOT_FOUND' } | { kind: 'METHOD_NOT_ALLOWED' };

function matchPath(pattern: string, pathname: string): RouteParams | null {
  const p = pattern.split('/');
  const s = pathname.split('/');
  if (p.length !== s.length) return null;
  const params: RouteParams = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(':')) {
      if (s[i].length === 0) return null;
      params[p[i].slice(1)] = s[i];
    } else if (p[i] !== s[i]) {
      return null;
    }
  }
  return params;
}

// NFR-003 경로 매칭 — 경로가 있으나 메서드가 다르면 405
export function matchRoute(routes: readonly Route[], method: string, pathname: string): RouteMatch {
  let pathMatched = false;
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (!params) continue;
    pathMatched = true;
    if (route.method === method) return { kind: 'ok', handler: route.handler, params };
  }
  return pathMatched ? { kind: 'METHOD_NOT_ALLOWED' } : { kind: 'NOT_FOUND' };
}
