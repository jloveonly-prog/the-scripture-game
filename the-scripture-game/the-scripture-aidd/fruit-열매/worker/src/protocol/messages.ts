// messages.ts — 메시지 이름 상수·봉투 `{type,data}`/`{type:'error',error}` 생성·에러 코드 상수만
// TASK-030 | REQ-001 REQ-007 FR-008 NFR-003 C-006 | ARCH-015 | API-005~API-031 | api-gate §2·§4 | D-20
// 메시지 `type`·에러 `code`·한국어 메시지는 api-gate 원문 그대로 (devguide §3.1 — 번역·축약 금지).

/** api-gate §2 프로토콜 버전 1 — `start`·`matched`에 포함 */
export const PROTOCOL_VERSION = 1;

/** FR-008 lobby 수신 (API-007·API-008) */
export const LOBBY_IN = { join: "join", cancel: "cancel" } as const;
/** lobby 송신 (API-009·API-010·API-031) */
export const LOBBY_OUT = { waiting: "waiting", matched: "matched", error: "error" } as const;
/** FR-008 room 수신 (API-011~API-018) */
export const ROOM_IN = {
  ready: "ready", state: "state", clear: "clear", skill: "skill", armor: "armor", answer: "answer",
  reaction: "reaction", topout: "topout",
} as const;
/** room 송신 (API-019~API-031) */
export const ROOM_OUT = {
  start: "start", opponentState: "opponentState", attack: "attack", garbage: "garbage", effect: "effect",
  status: "status", reject: "reject", quiz: "quiz", quizResult: "quizResult", reaction: "reaction",
  roundEnd: "roundEnd", matchEnd: "matchEnd", error: "error",
} as const;

export type LobbyInType = (typeof LOBBY_IN)[keyof typeof LOBBY_IN];
export type RoomInType = (typeof ROOM_IN)[keyof typeof ROOM_IN];

/** api-gate §4.1 REST 에러 (HTTP 상태 · 한국어 메시지) */
export const REST_ERRORS = {
  BAD_REQUEST: { status: 400, message: "요청 형식이 올바르지 않습니다." },
  NICKNAME_INVALID: { status: 400, message: "닉네임 규칙(2~12자, 한글·영문·숫자·_)을 확인하세요." },
  INVALID_QUERY: { status: 400, message: "조회 조건이 올바르지 않습니다." },
  UNAUTHORIZED: { status: 401, message: "입장 정보가 올바르지 않습니다." },
  ORIGIN_FORBIDDEN: { status: 403, message: "허용되지 않은 접속 경로입니다." },
  NOT_FOUND: { status: 404, message: "요청한 경로가 없습니다." },
  ROOM_NOT_FOUND: { status: 404, message: "방을 찾을 수 없습니다." },
  NICKNAME_TAKEN: { status: 409, message: "이미 사용 중인 닉네임입니다." },
  PAYLOAD_TOO_LARGE: { status: 413, message: "요청이 너무 큽니다." },
  UPGRADE_REQUIRED: { status: 426, message: "WebSocket 연결이 필요합니다." },
  RATE_LIMITED: { status: 429, message: "요청이 너무 잦습니다. 잠시 후 다시 시도하세요." },
  INTERNAL_ERROR: { status: 500, message: "서버 오류가 발생했습니다." },
  STORAGE_UNAVAILABLE: { status: 503, message: "기록 저장소에 연결할 수 없습니다. 잠시 후 다시 시도하세요." },
} as const;
export type RestErrorCode = keyof typeof REST_ERRORS;

/** api-gate §4.2 WebSocket `reject` (비치명 — 소켓 유지) */
export const REJECT_MESSAGES = {
  CLEAR_REJECTED: "진행 기록이 올바르지 않아 공격이 취소되었습니다.",
  NOT_ACTIVE: "지금은 사용할 수 없습니다.",
  GAUGE_LOW: "믿음이 부족합니다.",
  COOLDOWN: "아직 준비되지 않았습니다.",
  ANGEL_SEALED: "천사 소환이 봉인되었습니다.",
  SKILL_INVALID: "사용할 수 없는 스킬입니다.",
  MODE_FORBIDDEN: "이 모드에서는 사용할 수 없습니다.",
  NO_ARMOR: "보유한 갑주가 없습니다.",
  QUIZ_WRONG: "틀렸습니다. 3초 뒤 다시 고를 수 있습니다.",
  QUIZ_LOCKED: "잠시 후 다시 고를 수 있습니다.",
  QUIZ_CLOSED: "말씀 대결이 끝났습니다.",
  REACTION_INVALID: "보낼 수 없는 리액션입니다.",
  RATE_LIMITED: "입력이 너무 빠릅니다.",
} as const;
export type RejectCode = keyof typeof REJECT_MESSAGES;

/** api-gate §4.3 WebSocket `error` (치명 — 지정 Close 코드로 소켓 종료) */
export const WS_ERRORS = {
  BAD_MESSAGE: { close: 4000, message: "메시지 형식이 올바르지 않습니다." },
  HERO_INVALID: { close: 4000, message: "선택할 수 없는 위인입니다." },
  MODE_INVALID: { close: 4000, message: "선택할 수 없는 모드입니다." },
  UNAUTHORIZED: { close: 4001, message: "입장 정보가 올바르지 않습니다." },
  AUTH_TIMEOUT: { close: 4001, message: "연결 인증 시간이 지났습니다." },
  TICKET_INVALID: { close: 4003, message: "방 입장 권한이 없습니다." },
  ROOM_NOT_FOUND: { close: 4004, message: "방을 찾을 수 없습니다." },
  INVITE_NOT_FOUND: { close: 4404, message: "초대 코드를 찾을 수 없습니다." },
  INVITE_EXPIRED: { close: 4408, message: "초대 코드가 만료되었습니다." },
  INVITE_FULL: { close: 4409, message: "이미 가득 찬 방입니다." },
  ALREADY_QUEUED: { close: 4409, message: "이미 다른 창에서 대기 중입니다." },
  OPPONENT_LEFT: { close: 4410, message: "상대가 나갔습니다." },
  RATE_LIMITED: { close: 4429, message: "요청이 너무 잦아 연결을 종료합니다." },
  MATCH_SETUP_FAILED: { close: 1011, message: "방을 준비하지 못했습니다. 다시 시도하세요." },
  MATCH_ABORTED: { close: 1011, message: "경기를 계속할 수 없습니다." },
  STORAGE_UNAVAILABLE: { close: 1011, message: "기록 저장소에 연결할 수 없습니다." },
} as const;
export type WsErrorCode = keyof typeof WS_ERRORS;

/** api-gate §4.3 정상 종료 Close 1000 reason (API-008·API-010·API-030) */
export const CLOSE_NORMAL = 1000;
export const CLOSE_REASON = { cancelled: "cancelled", matched: "matched", matchEnd: "match_end" } as const;

/** D-20 정상 봉투 `{"type": "<메시지명>", "data": {...}}` 직렬화 */
export function envelope(type: string, data: unknown): string {
  return JSON.stringify({ type, data });
}

/** D-20·API-031 치명 오류 봉투 `{"type": "error", "error": {code, message}}` (REST와 같은 code·message 구조) */
export function errorEnvelope(code: WsErrorCode): string {
  return JSON.stringify({ type: ROOM_OUT.error, error: { code, message: WS_ERRORS[code].message } });
}

/** API-025 `reject` 데이터 — retryInMs는 COOLDOWN·ANGEL_SEALED·QUIZ_*·RATE_LIMITED만 값, 그 밖은 null (api-gate §4.2) */
export function rejectData(action: string, code: RejectCode, retryInMs: number | null = null) {
  return { action, code, message: REJECT_MESSAGES[code], retryInMs };
}
