// api.js — REST 4종 fetch·Bearer·공통 응답 해석만 (상대 경로만)
// TASK-062-1 | REQ-002 REQ-014 REQ-015 FR-012 FR-069 FR-071 | API-001~API-004 | api-gate §2 공통 응답·§4.1 | D-03
// 응답 success:false는 예외가 아닌 값으로 돌려준다(devguide §3.3 클라이언트 net). 네트워크 실패는 status 0.

/**
 * @typedef {{ ok: boolean, status: number, data?: any, meta?: any,
 *   error?: { code: string, message: string } }} ApiResult
 */

/** 네트워크 실패 (UC-001 E4 · UC-018 E1 · UC-019 E1 — 화면이 RetryPanel로 처리) */
const NETWORK_ERROR = { code: "NETWORK", message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요" };

/**
 * api-gate §2: `{success, data}` / `{success:false, error:{code, message}}` / 목록은 meta
 * @param {"GET" | "POST"} method @param {string} path 상대 경로 `/api/...`
 * @param {{ token?: string, body?: any }} [o] @returns {Promise<ApiResult>}
 */
async function request(method, path, o = {}) {
  /** @type {Record<string, string>} */
  const headers = { Accept: "application/json" };
  if (o.token) headers.Authorization = `Bearer ${o.token}`; // api-gate §5 토큰 전달 = Bearer 헤더
  if (o.body !== undefined) headers["Content-Type"] = "application/json; charset=utf-8";
  let res;
  try {
    res = await fetch(path, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR };
  }
  try {
    const json = await res.json();
    if (json && json.success === true) return { ok: true, status: res.status, data: json.data, meta: json.meta };
    const error = json?.error && typeof json.error.code === "string" ? json.error
      : { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." };
    return { ok: false, status: res.status, error };
  } catch {
    return { ok: false, status: res.status, error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } };
  }
}

/** API-001 POST /api/guests — 닉네임 입장 @param {string} nickname */
export function createGuest(nickname) {
  return request("POST", "/api/guests", { body: { nickname } });
}

/** API-002 GET /api/guests/me — 토큰 확인·내 프로필 @param {string} token */
export function getMe(token) {
  return request("GET", "/api/guests/me", { token });
}

/**
 * API-003 GET /api/matches — 키셋 페이지 (limit = rules.ledger.historyPageDefault, before = meta.nextBefore)
 * @param {string} token @param {{ limit: number, before?: string | null }} q
 */
export function getMatches(token, q) {
  const params = new URLSearchParams({ limit: String(q.limit) });
  if (q.before) params.set("before", q.before);
  return request("GET", `/api/matches?${params}`, { token });
}

/** API-004 GET /api/leaderboard — 상위 100 + 내 순위 @param {string} token */
export function getLeaderboard(token) {
  return request("GET", "/api/leaderboard", { token });
}
