// TASK-033-3 · FR-008 · C-006 · NFR-003 — API-005 /ws/matchmaker · API-006 /ws/room/:roomId 업그레이드 검사 후 DO로 전달
// Upgrade(426) → Origin 허용 목록(403, ALLOWED_ORIGINS — 교차 사이트 WebSocket 탈취 차단) → roomId UUID v4(400) 순서로 검사한다.
import { PATTERNS } from '../../../client/js/net/protocol.js';
import { MATCHMAKER_NAME } from '../store/do-store-client';
import { jsonError, logEvent } from './respond';
import type { HttpDeps, RouteParams } from './router';

/** Upgrade·Origin 공통 검사 — 통과하면 null */
function checkUpgrade(request: Request, deps: HttpDeps): Response | null {
  if ((request.headers.get('Upgrade') ?? '').toLowerCase() !== 'websocket') return jsonError('UPGRADE_REQUIRED');
  const origin = request.headers.get('Origin');
  const allowed = (deps.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter((o) => o.length > 0);
  if (origin === null || !allowed.includes(origin)) return jsonError('ORIGIN_FORBIDDEN');
  return null;
}

// API-005 · FR-018~021 · FR-023 Matchmaker DO('global')로 업그레이드 전달 (인증은 첫 메시지 token — 10초 마감은 DO가 처리)
export async function wsMatchmaker(request: Request, deps: HttpDeps): Promise<Response> {
  try {
    const rejected = checkUpgrade(request, deps);
    if (rejected) return rejected;
    const ns = deps.env.MATCHMAKER;
    return await ns.get(ns.idFromName(MATCHMAKER_NAME)).fetch(request);
  } catch {
    logEvent('ws-forward-failed');
    return jsonError('INTERNAL_ERROR');
  }
}

// API-006 · FR-008 GameRoom DO(idFromName(roomId))로 업그레이드 전달 — 초기화 여부(404 ROOM_NOT_FOUND)는 GameRoom이 판정 (devguide §7.6)
export async function wsRoom(request: Request, deps: HttpDeps, params: RouteParams): Promise<Response> {
  try {
    const rejected = checkUpgrade(request, deps);
    if (rejected) return rejected;
    const roomId = params.roomId ?? '';
    if (!PATTERNS.UUID_V4.test(roomId)) return jsonError('INVALID_PARAM');
    const ns = deps.env.GAME_ROOM;
    return await ns.get(ns.idFromName(roomId)).fetch(request);
  } catch {
    logEvent('ws-forward-failed');
    return jsonError('INTERNAL_ERROR');
  }
}
