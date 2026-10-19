// respond.ts — JSON 봉투 응답·Bearer 파싱·본문 크기 제한·접속 주소별 분당 5회 계수만
// TASK-031 | REQ-002 REQ-014 REQ-015 FR-012 NFR-003 | ARCH-009 | API-001~API-004 | api-gate §2 공통 규약·§4.1·§5
// TBL-018 `rateLimit.guestCreate`·`rateLimit.maxRestBodyBytes` (DCL-002)
import type { Rules } from "../content";
import { REST_ERRORS, type RestErrorCode } from "../protocol/messages";
import { TokenBucket } from "../protocol/rate-limit";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

/** api-gate §2 성공 봉투 `{"success": true, "data": ...}` (목록은 meta 추가) */
export function ok(data: unknown, status = 200, meta?: { size: number; nextBefore: string | null }): Response {
  const body = meta === undefined ? { success: true, data } : { success: true, data, meta };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/** api-gate §2 실패 봉투 `{"success": false, "error": {code, message}}` — 상태 코드·메시지는 §4.1 표 그대로 (내부 메시지 노출 0) */
export function error(code: RestErrorCode): Response {
  const e = REST_ERRORS[code];
  return new Response(JSON.stringify({ success: false, error: { code, message: e.message } }), {
    status: e.status, headers: JSON_HEADERS,
  });
}

/** api-gate §5 REST 토큰 전달: `Authorization: Bearer <token>` — 없거나 형식이 다르면 null (형식 검증은 원장 서비스) */
export function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** 본문 파싱 실패 — 라우트가 코드로 응답 (BAD_REQUEST 400 / PAYLOAD_TOO_LARGE 413) */
export class BodyError extends Error {
  constructor(readonly code: "BAD_REQUEST" | "PAYLOAD_TOO_LARGE") {
    super(code);
    this.name = "BodyError";
  }
}

/** 본문을 maxBytes까지만 읽는다 — Content-Length 없는 청크 본문도 상한을 넘는 순간 멈춘다 (메모리 보호) */
async function readLimited(request: Request, maxBytes: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const out = new Uint8Array(maxBytes);
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out.subarray(0, size);
    if (size + value.byteLength > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BodyError("PAYLOAD_TOO_LARGE");
    }
    out.set(value, size);
    size += value.byteLength;
  }
}

/**
 * api-gate §2 REST 본문 최대 rules.rateLimit.maxRestBodyBytes(1,024B) — Content-Length와 실제 바이트 둘 다 검사.
 * JSON 객체가 아니면 BAD_REQUEST (API-001 "JSON 파싱 실패·본문 없음").
 */
export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyError("PAYLOAD_TOO_LARGE");
  const buffer = await readLimited(request, maxBytes);
  if (buffer.byteLength === 0) throw new BodyError("BAD_REQUEST");
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(buffer));
  } catch {
    throw new BodyError("BAD_REQUEST");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new BodyError("BAD_REQUEST");
  return parsed as Record<string, unknown>;
}

/** 접속 주소 (Cloudflare `CF-Connecting-IP`, 없으면 로컬 한 묶음) — 계수 키로만 쓰고 저장·로그하지 않는다 (봉인 제4계명) */
export function clientAddress(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "local";
}

/** 접속 주소별 게스트 생성 버킷 — Worker 메모리만 (api-gate §2 "메모리 계수만, 저장 안 함") */
const guestCreateBuckets = new Map<string, { bucket: TokenBucket; lastAt: number }>();

/**
 * API-001 RATE_LIMITED: 접속 주소별 rules.rateLimit.guestCreate(5회/60초) 토큰 버킷 (DCL-002).
 * 한 주기(perMs) 동안 쓰지 않은 주소는 버킷이 가득 찬 것과 같으므로 메모리에서 지운다.
 */
export function allowGuestCreate(address: string, now: number, rules: Rules): boolean {
  const spec = rules.rateLimit.guestCreate;
  for (const [key, entry] of guestCreateBuckets) if (now - entry.lastAt >= spec.perMs) guestCreateBuckets.delete(key);
  let entry = guestCreateBuckets.get(address);
  if (!entry) {
    entry = { bucket: new TokenBucket(spec, now), lastAt: now };
    guestCreateBuckets.set(address, entry);
  }
  entry.lastAt = now;
  return entry.bucket.take(now).ok;
}
