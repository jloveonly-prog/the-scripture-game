// TASK-060-1 · FR-012 · FR-069 · FR-071 · API-001~004 — HTTP 성문 호출 (api-gate §3 요청·응답 그대로, devguide §7.11)
// 결과는 던지지 않고 { ok:true, status, data, meta } | { ok:false, status, code, message, network } 로 돌려준다 (devguide §3.6).
import { ERRORS } from './protocol.js';

/** 사용자 문구: protocol ERRORS 표만 쓴다 (서버 문구·내부 정보를 화면에 그대로 넣지 않음 — 봉인 제1계명) */
function userMessage(code) {
  return (ERRORS[code] ?? ERRORS.INTERNAL_ERROR).message;
}

/** 빌드 변수 VITE_SERVER_ORIGIN이 있으면 앞에 붙인다 (로컬은 빈 값 — 상대 경로 /api/...) */
export function apiUrl(path, serverOrigin = import.meta.env?.VITE_SERVER_ORIGIN) {
  return `${serverOrigin ? String(serverOrigin).replace(/\/$/, '') : ''}${path}`;
}

/** 공통 요청 — fetchImpl은 테스트 대체점 */
export async function request(method, path, { token = null, body, fetchImpl = globalThis.fetch } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';
  let response = null;
  try {
    response = await fetchImpl(apiUrl(path), {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin', cache: 'no-store',
    });
  } catch (err) {
    console.error(`[http-api] ${method} ${path} network failure`, err?.name ?? err);
    return { ok: false, status: 0, code: 'NETWORK', message: '', network: true };
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (response.ok && payload?.success === true) {
    return { ok: true, status: response.status, data: payload.data, meta: payload.meta ?? null };
  }
  const code = typeof payload?.error?.code === 'string' && ERRORS[payload.error.code] ? payload.error.code : 'INTERNAL_ERROR';
  return { ok: false, status: response.status, code, message: userMessage(code), network: false };
}

// FR-012 API-001 게스트 닉네임 입장 (201)
export function createGuest(nickname, opts = {}) {
  return request('POST', '/api/guest', { ...opts, body: { nickname } });
}

// FR-012 API-002 토큰 검증·프로필 복원
export function getMe(token, opts = {}) {
  return request('GET', '/api/guest/me', { ...opts, token });
}

// FR-069 API-003 내 전적 최신순 (page 1+, size 1~50)
export function getMatches(token, { page = 1, size = 20 } = {}, opts = {}) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return request('GET', `/api/matches?${query}`, { ...opts, token });
}

// FR-071 API-004 랭킹 상위 100 + 내 순위 (토큰 선택 — 앱 흐름상 항상 전송)
export function getRankings(token, opts = {}) {
  return request('GET', '/api/rankings', { ...opts, token });
}

/** 401 = 토큰 무효 → TBL-201 삭제 후 SCR-001 (api-gate §4.3) */
export function isAuthFailure(result) {
  return !result.ok && result.status === 401;
}
