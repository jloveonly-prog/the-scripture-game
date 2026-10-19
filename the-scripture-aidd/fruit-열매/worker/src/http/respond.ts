// TASK-033-1 · NFR-003 · api-gate §2.1·§2.3·§4 — HTTP 공통 응답 직렬화 ({success,data,meta} / {success:false,error}) + 보안 헤더
// 오류 문구는 protocol.js ERRORS의 사용자 문구만 — 스택·SQL·토큰 미포함 (봉인 제1계명).
import { ERRORS } from '../../../client/js/net/protocol.js';

/** api-gate §2.1 응답 헤더 */
const BASE_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export interface PageMeta { page: number; size: number; totalCount: number; totalPages: number }

// NFR-003 성공 응답 (api-gate §2.3)
export function jsonOk(data: unknown, status = 200, meta?: PageMeta): Response {
  const body: Record<string, unknown> = { success: true, data };
  if (meta) body.meta = meta;
  return new Response(JSON.stringify(body), { status, headers: BASE_HEADERS });
}

// NFR-003 실패 응답 — HTTP 상태는 ERRORS[code].http (WS 전용·미정의 코드는 INTERNAL_ERROR 500)
export function jsonError(code: string): Response {
  const known = Object.prototype.hasOwnProperty.call(ERRORS, code) && ERRORS[code as keyof typeof ERRORS].http !== null
    ? (code as keyof typeof ERRORS)
    : 'INTERNAL_ERROR';
  const def = ERRORS[known];
  return new Response(JSON.stringify({ success: false, error: { code: known, message: def.message } }), {
    status: def.http as number,
    headers: BASE_HEADERS,
  });
}

// devguide §3.7 서버 이벤트 로그 1줄 (게스트 ID 앞 8자만 — 토큰·닉네임·IP 미포함)
export function logEvent(event: string, guestId?: string): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, guest: guestId ? guestId.slice(0, 8) : undefined }));
}
