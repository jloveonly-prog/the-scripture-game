// TASK-033-2 · REQ-002 · FR-012 · NFR-003 · NFR-008 · UC-001 — API-001 게스트 입장(POST /api/guest)·API-002 토큰 복원(GET /api/guest/me)
// + 조회 API 공통 Bearer 인증(토큰당 30회/분). 요청 본문 개인정보는 닉네임 1개뿐 (봉인 제4계명).
import { LIMITS } from '../../../client/js/net/protocol.js';
import { hashToken, generateToken, isTokenFormat } from '../auth/token';
import { normalizeNickname } from '../auth/nickname';
import { StoreError } from '../store/store';
import type { Profile } from '../store/store';
import { jsonError, jsonOk, logEvent } from './respond';
import type { HttpDeps } from './router';

/** 로컬(wrangler dev)은 CF-Connecting-IP가 없을 수 있다 → 루프백 주소로 센다 (api-gate §2.7) */
const LOOPBACK = '127.0.0.1';

/** StoreError·그 밖의 오류 → api-gate §4 응답 */
function storeFailure(err: unknown): Response {
  if (err instanceof StoreError) {
    return jsonError(err.code === 'NICKNAME_TAKEN' ? 'NICKNAME_TAKEN' : 'STORE_UNAVAILABLE');
  }
  logEvent('http-internal-error');
  return jsonError('INTERNAL_ERROR');
}

export type BearerResult = { kind: 'ok'; profile: Profile } | { kind: 'none' } | { kind: 'error'; response: Response };

// FR-012 · NFR-003 · 봉인 제7계명 조회 API 인증 — `Authorization: Bearer <token>` 형식 → 토큰당 빈도 제한 → 해시 조회
// optional(API-004): 헤더 없음 = none, 형식 오류·무효 = INVALID_TOKEN
export async function authenticateBearer(request: Request, deps: HttpDeps, optional = false): Promise<BearerResult> {
  const header = request.headers.get('Authorization');
  if (header === null) return optional ? { kind: 'none' } : { kind: 'error', response: jsonError('UNAUTHORIZED') };
  const match = /^Bearer (\S+)$/.exec(header.trim());
  const token = match ? match[1] : null;
  if (!isTokenFormat(token)) return { kind: 'error', response: jsonError(optional ? 'INVALID_TOKEN' : 'UNAUTHORIZED') };
  const tokenHash = await hashToken(token);
  if (!deps.limits.query.hit(tokenHash, deps.now())) return { kind: 'error', response: jsonError('RATE_LIMITED') };
  const profile = await deps.store.getProfileByTokenHash(tokenHash); // StoreError는 호출한 라우트의 catch가 503으로
  if (!profile) {
    logEvent('token-invalid');
    return { kind: 'error', response: jsonError('INVALID_TOKEN') };
  }
  return { kind: 'ok', profile };
}

// API-001 · FR-012 게스트 닉네임 입장 — 201 {guestId, nickname, token, rating, createdAt}
export async function postGuest(request: Request, deps: HttpDeps): Promise<Response> {
  try {
    const source = request.headers.get('CF-Connecting-IP') ?? LOOPBACK; // 메모리 카운터 키로만 사용, 저장·로그 없음 (api-gate §5.3)
    if (!deps.limits.guestCreate.hit(source, deps.now())) return jsonError('RATE_LIMITED');
    // 본문 크기 상한 (닉네임 1개 — api-gate 표에 413이 없으므로 INVALID_BODY 400, 상한은 기존 LIMITS.MAX_FRAME_BYTES 재사용 — 여호수아 조정)
    if (Number(request.headers.get('Content-Length') ?? 0) > LIMITS.MAX_FRAME_BYTES) return jsonError('INVALID_BODY');
    let body: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).length > LIMITS.MAX_FRAME_BYTES) return jsonError('INVALID_BODY');
      body = JSON.parse(text);
    } catch {
      return jsonError('INVALID_BODY');
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return jsonError('INVALID_BODY');
    const fields = Object.keys(body);
    if (fields.length !== 1 || fields[0] !== 'nickname') return jsonError('INVALID_BODY'); // 누락·추가 필드
    const raw = (body as { nickname: unknown }).nickname;
    if (typeof raw !== 'string') return jsonError('INVALID_BODY');
    const nick = normalizeNickname(raw);
    if (!nick.ok) return jsonError('INVALID_NICKNAME');
    const token = generateToken();
    const profile = await deps.store.createProfile({
      id: crypto.randomUUID(), nickname: nick.nickname, nicknameKey: nick.nicknameKey, tokenHash: await hashToken(token),
    });
    logEvent('profile-created', profile.id);
    return jsonOk({ guestId: profile.id, nickname: profile.nickname, token, rating: profile.rating, createdAt: profile.createdAt }, 201);
  } catch (err) {
    return storeFailure(err);
  }
}

// API-002 · FR-012 토큰 검증·프로필 복원 — last_seen_at 갱신 후 200 {guestId, nickname, rating}
export async function getMe(request: Request, deps: HttpDeps): Promise<Response> {
  try {
    const auth = await authenticateBearer(request, deps);
    if (auth.kind === 'error') return auth.response;
    if (auth.kind === 'none') return jsonError('UNAUTHORIZED');
    await deps.store.touchProfile(auth.profile.id);
    return jsonOk({ guestId: auth.profile.id, nickname: auth.profile.nickname, rating: auth.profile.rating });
  } catch (err) {
    return storeFailure(err);
  }
}
