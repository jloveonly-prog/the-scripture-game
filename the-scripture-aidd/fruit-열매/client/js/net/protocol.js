// TASK-004 · REQ-001 · FR-008 · NFR-003 · C-006 · C-009 · D-12 · D-30 · D-31
// 단일 책임: 클라이언트·서버가 함께 import 하는 WebSocket 메시지 타입·공통 코드·필드 한계·에러 코드 상수(동형 모듈).
// 이 파일은 `window`·`document`·Node 전용 API를 쓰지 않는다 (worker가 읽기 전용으로 import — architecture D-12).
// 원본: api-gate-성문.md §1·§2.4·§2.6·§2.7·§4, data-ark-법궤.md §4 CODE-001~015. 수치 밸런스는 content/balance.json에 있다.

const freeze = Object.freeze;

/* ───────────── 메시지 타입 (api-gate §1.3·§1.4) ───────────── */

/** Matchmaker 소켓 C→S (API-101~103) */
export const MM_C2S = freeze({ JOIN: 'join', CREATE_ROOM: 'createRoom', CANCEL: 'cancel' });
/** Matchmaker 소켓 S→C (API-151~154) */
export const MM_S2C = freeze({ QUEUED: 'queued', ROOM_CREATED: 'roomCreated', MATCHED: 'matched', CANCELLED: 'cancelled' });
/** GameRoom 소켓 C→S (API-201~210) */
export const ROOM_C2S = freeze({
  JOIN: 'join', READY: 'ready', STATE: 'state', CLEAR: 'clear', SKILL: 'skill',
  ARMOR: 'armor', TOPOUT: 'topout', QUIZ_ANSWER: 'quizAnswer', REACTION: 'reaction', QUIT: 'quit',
});
/** GameRoom 소켓 S→C (API-251~262) */
export const ROOM_S2C = freeze({
  JOINED: 'joined', START: 'start', OPPONENT_STATE: 'opponentState', ATTACK: 'attack', EFFECT: 'effect',
  PLAYER_STATUS: 'playerStatus', QUIZ_START: 'quizStart', QUIZ_LOCK: 'quizLock', QUIZ_RESULT: 'quizResult',
  REACTION: 'reaction', ROUND_END: 'roundEnd', MATCH_END: 'matchEnd',
});
/** 두 소켓 공통 S→C 거부·오류 (API-290) */
export const MSG_ERROR = 'error';

/** 메시지 타입 → API-ID (추적·로그용, RTM API-ID 열과 같은 값) */
export const API_IDS = freeze({
  matchmaker: freeze({ join: 'API-101', createRoom: 'API-102', cancel: 'API-103', queued: 'API-151', roomCreated: 'API-152', matched: 'API-153', cancelled: 'API-154' }),
  room: freeze({
    join: 'API-201', ready: 'API-202', state: 'API-203', clear: 'API-204', skill: 'API-205', armor: 'API-206',
    topout: 'API-207', quizAnswer: 'API-208', reactionC2S: 'API-209', quit: 'API-210', joined: 'API-251',
    start: 'API-252', opponentState: 'API-253', attack: 'API-254', effect: 'API-255', playerStatus: 'API-256',
    quizStart: 'API-257', quizLock: 'API-258', quizResult: 'API-259', reactionS2C: 'API-260', roundEnd: 'API-261', matchEnd: 'API-262',
  }),
  error: 'API-290',
});

/* ───────────── 공통 코드 (data-ark §4) ───────────── */

/** CODE-001 게임 모드 */
export const MODES = freeze(['random', 'invite', 'bot', 'practice']);
/** CODE-002 봇 난이도 */
export const BOT_LEVELS = freeze(['easy', 'normal', 'hard']);
/** CODE-003 위인 */
export const HERO_IDS = freeze(['david', 'solomon', 'peter', 'paul']);
/** CODE-004 천사 — 순서 = 키 1~5 (design-vision §4.3) */
export const ANGEL_IDS = freeze(['michael', 'gabriel', 'cherubim', 'seraphim', 'ministering_spirits']);
/** CODE-005 악한 영 14종 (보스 dragon 포함) */
export const SPIRIT_IDS = freeze([
  'unclean_spirit', 'deaf_dumb_spirit', 'legion', 'lying_spirit', 'divination_spirit', 'beelzebub', 'prince_of_the_air',
  'prince_of_persia', 'abaddon', 'jezebel', 'wickedness', 'babylon', 'angel_of_light', 'dragon',
]);
/** CODE-006 전신갑주 — 순서 = 키 Q~Y = 보드 셀 코드 d~i */
export const ARMOR_IDS = freeze([
  'belt_of_truth', 'breastplate_of_righteousness', 'gospel_shoes', 'shield_of_faith', 'helmet_of_salvation', 'sword_of_the_spirit',
]);
/** CODE-007 방해 효과 범주 */
export const EFFECT_CATEGORIES = freeze(['vision', 'deception', 'control', 'speed', 'seal', 'board']);
/** CODE-008 경기 종료 사유 (저장) + matchEnd 전용 연습 종료 사유 (API-262) */
export const END_REASONS = freeze(['topout', 'disconnect']);
export const MATCH_END_REASONS = freeze(['topout', 'disconnect', 'practiceEnd']);
/** CODE-009 보드 셀 코드 (`state.board` 200자, 위→아래·왼→오른) */
export const CELL = freeze({
  EMPTY: '0', I: '1', O: '2', T: '3', S: '4', Z: '5', J: '6', L: '7', GARBAGE: '8', LEAD: '9', WORD: 'a', JERICHO: 'b', MANNA: 'c',
});
/** CODE-009 갑주 칸 셀 코드 — ARMOR_IDS와 같은 순서 */
export const ARMOR_CELL_CODES = freeze(['d', 'e', 'f', 'g', 'h', 'i']);
/** CODE-010 리액션 3종 (자유 텍스트 없음 — C-009) */
export const REACTION_IDS = freeze(['amen', 'hallelujah', 'halo']);
/** CODE-011 초대 코드 상태 */
export const INVITE_STATUS = freeze(['open', 'full', 'closed']);
/** CODE-012 특수 블록 해금 단계 */
export const STAGES = freeze([0, 1, 2]);
/** CODE-013 effect.kind */
export const EFFECT_KINDS = freeze(['hero', 'angel', 'armor', 'jesus', 'special', 'spiritEnd', 'offset', 'attackSent', 'reflect']);
/** CODE-014 업적 */
export const ACHIEVEMENT_IDS = freeze(['goliath_hunter']);
/** api-gate §1.4 quizStart.trigger, §2.6 specials.kind */
export const QUIZ_TRIGGERS = freeze(['wordBlock', 'timer']);
export const SPECIAL_KINDS = freeze(['word', 'jericho', 'manna', 'armor']);
/** 예수님 이벤트 effect.id (API-255) — 선택 캐릭터가 아니다 (C-002) */
export const JESUS_EFFECT_ID = 'overcome_the_world';

/** skillId 구성 (api-gate §2.6: `hero_` + CODE-003 또는 `angel_` + CODE-004) */
export const heroSkillId = (heroId) => `hero_${heroId}`;
export const angelSkillId = (angelId) => `angel_${angelId}`;

/* ───────────── 필드 한계 (api-gate §2.6) ───────────── */

export const LIMITS = freeze({
  MAX_FRAME_BYTES: 4096,
  BOARD_COLS: 10,
  BOARD_ROWS: 20,
  BOARD_CELLS: 200,
  SEQ_MAX: 2147483647,
  SCORE_MAX: 99999999,
  PIECE_COUNT_MAX: 100000,
  COMBO_MAX: 99,
  LINES_MIN: 1,
  LINES_MAX: 4,
  SPECIALS_MAX: 4,
  CHOICE_MIN: 0,
  CHOICE_MAX: 3,
  ACTIVE: freeze({ TYPE_MIN: 1, TYPE_MAX: 7, ROT_MIN: 0, ROT_MAX: 3, X_MIN: -2, X_MAX: 9, Y_MIN: -2, Y_MAX: 21 }),
  NICKNAME_MIN: 2,
  NICKNAME_MAX: 12,
  PAGE_MIN: 1,
  SIZE_MIN: 1,
  SIZE_MAX: 50,
  SIZE_DEFAULT: 20,
  RANKING_TOP: 100,
});

export const PATTERNS = freeze({
  TOKEN: /^[A-Za-z0-9_-]{43}$/,
  ROOM_CODE: /^[A-HJ-NP-Z2-9]{6}$/,
  UUID_V4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  BOARD: /^[0-9a-i]{200}$/,
  QUIZ_ID: /^q\d{3}$/,
  NICKNAME: /^[가-힣A-Za-z0-9_]{2,12}$/,
});
/** D-09 초대 코드 문자 집합 (0·O·1·I 제외 32종) */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/* ───────────── 시간 규약 (api-gate §3) ───────────── */

export const TIMING = freeze({
  AUTH_TIMEOUT_MS: 10000, // API-005·006: 연결 후 인증 메시지 마감 → 4001
  ROOM_JOIN_TIMEOUT_MS: 15000, // API-201: 예약 명단 전원 입장 마감 → OPPONENT_LEFT
  STATE_INTERVAL_MS: 83, // `state` 12Hz (data-ark §8.8.8)
});

/* ───────────── 빈도 제한 (api-gate §2.7 — D-31) ───────────── */

/** WS 메시지 종류별 토큰 버킷: `limit`회 / `windowMs`. `onExceed`: 'ignore'(조용히 무시) | 'reject'(RATE_LIMITED) */
export const RATE_LIMITS = freeze({
  state: freeze({ limit: 20, windowMs: 1000, onExceed: 'ignore' }),
  clear: freeze({ limit: 10, windowMs: 1000, onExceed: 'reject' }),
  skill: freeze({ limit: 4, windowMs: 1000, onExceed: 'reject' }),
  armor: freeze({ limit: 4, windowMs: 1000, onExceed: 'reject' }),
  quizAnswer: freeze({ limit: 4, windowMs: 1000, onExceed: 'reject' }),
  reaction: freeze({ limit: 1, windowMs: 1500, onExceed: 'ignore' }),
  join: freeze({ limit: 3, windowMs: 10000, onExceed: 'reject' }),
  createRoom: freeze({ limit: 3, windowMs: 10000, onExceed: 'reject' }),
  cancel: freeze({ limit: 3, windowMs: 10000, onExceed: 'reject' }),
});
/** 같은 소켓 10초 안에 RATE_LIMITED 3회 → 종료 4008 */
export const RATE_ABUSE = freeze({ violations: 3, windowMs: 10000 });
/** HTTP 빈도 제한 */
export const HTTP_RATE_LIMITS = freeze({
  guestCreate: freeze({ limit: 5, windowMs: 60000 }), // POST /api/guest — 출처 주소당 (주소 미저장)
  query: freeze({ limit: 30, windowMs: 60000 }), // 조회 API — 토큰당
});

/* ───────────── WebSocket 종료 코드 (api-gate §4.3) ───────────── */

export const CLOSE_CODES = freeze({
  NORMAL: 1000,
  GOING_AWAY: 1001,
  AUTH_FAILED: 4001,
  NOT_ELIGIBLE: 4003,
  ROOM_GONE: 4004,
  RATE_ABUSE: 4008,
});

/* ───────────── 에러 코드 (api-gate §4.2 — CODE-015) ───────────── */

/** code → { http: HTTP 상태(WS 전용은 null), message: 사용자 문구(표시 없음은 '') } */
export const ERRORS = freeze({
  INVALID_BODY: freeze({ http: 400, message: '요청 형식이 올바르지 않습니다.' }),
  INVALID_NICKNAME: freeze({ http: 400, message: '닉네임 규칙(길이·문자)을 확인하세요.' }),
  NICKNAME_TAKEN: freeze({ http: 409, message: '이미 사용 중인 닉네임입니다.' }),
  UNAUTHORIZED: freeze({ http: 401, message: '입장 정보가 필요합니다.' }),
  INVALID_TOKEN: freeze({ http: 401, message: '입장 정보가 올바르지 않습니다.' }),
  INVALID_PARAM: freeze({ http: 400, message: '요청 값이 올바르지 않습니다.' }),
  NOT_FOUND: freeze({ http: 404, message: '요청을 처리할 수 없습니다.' }),
  METHOD_NOT_ALLOWED: freeze({ http: 405, message: '요청을 처리할 수 없습니다.' }),
  ORIGIN_FORBIDDEN: freeze({ http: 403, message: '연결할 수 없습니다.' }),
  UPGRADE_REQUIRED: freeze({ http: 426, message: '연결할 수 없습니다.' }),
  ROOM_NOT_FOUND: freeze({ http: 404, message: '방을 찾을 수 없습니다.' }),
  RATE_LIMITED: freeze({ http: 429, message: '요청이 너무 잦습니다.' }),
  STORE_UNAVAILABLE: freeze({ http: 503, message: '기록 저장소에 연결할 수 없습니다.' }),
  INTERNAL_ERROR: freeze({ http: 500, message: '잠시 후 다시 시도하세요.' }),
  INVALID_MESSAGE: freeze({ http: null, message: '잘못된 메시지입니다.' }),
  NOT_AUTHENTICATED: freeze({ http: null, message: '입장 정보가 필요합니다.' }),
  ALREADY_QUEUED: freeze({ http: null, message: '이미 상대를 찾는 중입니다.' }),
  INVITE_NOT_FOUND: freeze({ http: null, message: '초대 코드를 찾을 수 없습니다.' }),
  ROOM_FULL: freeze({ http: null, message: '이미 가득 찬 방입니다.' }),
  OWN_INVITE: freeze({ http: null, message: '내가 만든 초대 코드입니다.' }),
  CODE_EXHAUSTED: freeze({ http: null, message: '초대 코드를 만들지 못했습니다. 다시 시도하세요.' }),
  NOTHING_TO_CANCEL: freeze({ http: null, message: '취소할 대기가 없습니다.' }),
  NOT_IN_ROOM: freeze({ http: null, message: '이 방의 참가자가 아닙니다.' }),
  HERO_MISMATCH: freeze({ http: null, message: '선택한 위인이 일치하지 않습니다.' }),
  DUPLICATE_SESSION: freeze({ http: null, message: '이미 다른 창에서 접속 중입니다.' }),
  OPPONENT_LEFT: freeze({ http: null, message: '상대가 나갔습니다.' }),
  GAME_NOT_RUNNING: freeze({ http: null, message: '' }),
  SEQ_REJECTED: freeze({ http: null, message: '' }),
  PROGRESS_REJECTED: freeze({ http: null, message: '' }),
  FAITH_INSUFFICIENT: freeze({ http: null, message: '믿음이 부족합니다.' }),
  COOLDOWN: freeze({ http: null, message: '아직 다시 쓸 수 없습니다.' }),
  ANGEL_SEALED: freeze({ http: null, message: '천사 소환이 봉인되었습니다.' }),
  INVALID_SKILL: freeze({ http: null, message: '사용할 수 없는 스킬입니다.' }),
  NOT_ALLOWED_IN_MODE: freeze({ http: null, message: '이 모드에서는 쓸 수 없습니다.' }),
  ARMOR_NOT_OWNED: freeze({ http: null, message: '보유한 갑주가 없습니다.' }),
  QUIZ_CLOSED: freeze({ http: null, message: '' }),
  QUIZ_LOCKED: freeze({ http: null, message: '잠시 후 다시 고를 수 있습니다.' }),
  QUIZ_ALREADY_ANSWERED: freeze({ http: null, message: '' }),
  INVALID_REACTION: freeze({ http: null, message: '' }),
  BOT_FAILURE: freeze({ http: null, message: '경기를 계속할 수 없습니다.' }),
});

/* ───────────── 봉투 (api-gate §2.4 — D-30) ───────────── */

/** C→S 봉투 문자열 `{type, data}` */
export function encodeClientMessage(type, data = {}) {
  return JSON.stringify({ type, data });
}

/** S→C 성공 봉투 문자열 `{type, success:true, data}` */
export function encodeServerMessage(type, data = {}) {
  return JSON.stringify({ type, success: true, data });
}

/**
 * S→C 실패 봉투 문자열 `{type:"error", success:false, error:{code, message, ref, retryAfterMs?}}`.
 * `message`는 ERRORS 표의 사용자 문구만 쓴다 (내부 정보 미포함 — 봉인 제1계명).
 */
export function encodeErrorMessage(code, ref, retryAfterMs) {
  const known = Object.prototype.hasOwnProperty.call(ERRORS, code) ? code : 'INTERNAL_ERROR';
  const error = { code: known, message: ERRORS[known].message, ref: String(ref ?? '') };
  if (Number.isInteger(retryAfterMs) && retryAfterMs >= 0) error.retryAfterMs = retryAfterMs;
  return JSON.stringify({ type: MSG_ERROR, success: false, error });
}
