// log.ts — 구조화 로그 1줄 출력만 — 토큰·해시·티켓 필드 차단, guestId 8자 절단
// TASK-001-4 | NFR-003 NFR-004 NFR-008 | ARCH-009 ARCH-014 | architecture §10 제1·8계명 | api-gate §5 보안 로그

/** api-gate §5 / architecture §10 제8계명: 보안 로그 이벤트 5종만 */
export type LogEvent = "guest_created" | "auth_fail" | "reject" | "rate_limited" | "storage_fail";

const LOG_EVENTS: ReadonlySet<string> = new Set<LogEvent>([
  "guest_created",
  "auth_fail",
  "reject",
  "rate_limited",
  "storage_fail",
]);

/** 기록 가능한 필드는 gid·code 두 개뿐 — 그 밖의 필드(token, token_hash, ticket, nickname, 본문 등)는 타입과 런타임 양쪽에서 차단 */
export interface LogFields {
  /** guestId 전체를 넘겨도 앞 8자만 기록된다 (봉인 제1계명) */
  gid?: string | null;
  /** api-gate §4 에러 코드 (SNAKE_CASE) */
  code?: string | null;
}

// 봉인 제1계명: guestId는 앞 8자만
const GID_VISIBLE_CHARS = 8;
// 코드 필드는 SNAKE_CASE 식별자만 허용 — 임의 문자열(원문 메시지·토큰)이 섞여 들어오는 것을 막는다
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

/** 로그 1줄 문자열을 만든다 (출력과 분리 — 단위 시험 가능). 정의되지 않은 이벤트는 null (기록하지 않음). */
export function formatLogLine(evt: LogEvent, fields: LogFields = {}): string | null {
  if (!LOG_EVENTS.has(evt)) return null;
  const line: { evt: string; gid?: string; code?: string } = { evt };
  if (typeof fields.gid === "string" && fields.gid.length > 0) {
    line.gid = fields.gid.slice(0, GID_VISIBLE_CHARS);
  }
  if (typeof fields.code === "string" && CODE_PATTERN.test(fields.code)) {
    line.code = fields.code;
  }
  return JSON.stringify(line);
}

/** 구조화 JSON 1줄을 콘솔에 출력한다. 로그 실패가 요청 처리를 깨뜨리지 않도록 예외를 삼킨다. */
function event(evt: LogEvent, fields: LogFields = {}): void {
  try {
    const line = formatLogLine(evt, fields);
    if (line !== null) console.log(line);
  } catch {
    // 로그 출력 실패는 무시 — 게임·저장 흐름이 우선 (architecture §10 제8계명은 best-effort 기록)
  }
}

export const log = { event };
