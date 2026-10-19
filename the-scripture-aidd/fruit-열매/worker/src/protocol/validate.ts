// TASK-032-2 · NFR-003 · FR-032 · C-009 · R-08 — 수신 WS 프레임 상태 없는 스키마 검사 (api-gate §2.4·§2.6 표의 기계적 옮김)
// 크기·JSON·봉투·type·필드 타입·범위·추가 필드·R-08만 본다. seq·garbageIn·pieceCount 단조성(R-02~R-07)은 에브라임 progress-guard 몫.
import {
  ANGEL_IDS, ARMOR_IDS, BOT_LEVELS, HERO_IDS, LIMITS, MM_C2S, MODES, PATTERNS, REACTION_IDS, ROOM_C2S, SPECIAL_KINDS,
  angelSkillId, heroSkillId,
} from '../../../client/js/net/protocol.js';

export type Channel = 'matchmaker' | 'room';
export type ParseResult =
  | { ok: true; type: string; data: Record<string, unknown> }
  | { ok: false; code: 'INVALID_MESSAGE'; ref: string };

const INVALID = Symbol('invalid');
type Checked = unknown | typeof INVALID;
type Check = (value: unknown) => Checked;

/* ───────── 필드 검사기 (api-gate §2.1: 문자열은 NFC·trim 후 검증) ───────── */

const text = (value: unknown): string | typeof INVALID =>
  typeof value === 'string' ? value.normalize('NFC').trim() : INVALID;

const oneOf = (allowed: readonly string[]): Check => (value) => {
  const s = text(value);
  return s !== INVALID && allowed.includes(s) ? s : INVALID;
};

const matches = (re: RegExp, transform: (s: string) => string = (s) => s): Check => (value) => {
  const s = text(value);
  if (s === INVALID) return INVALID;
  const t = transform(s);
  return re.test(t) ? t : INVALID;
};

const int = (min: number, max: number): Check => (value) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : INVALID;

const bool: Check = (value) => (typeof value === 'boolean' ? value : INVALID);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 객체의 키가 허용 목록 안에 있고 필수 키가 모두 있는가 (추가 필드 거부 — C-009) */
function hasOnlyKeys(obj: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(obj);
  if (!required.every((k) => Object.prototype.hasOwnProperty.call(obj, k))) return false;
  return keys.every((k) => required.includes(k) || optional.includes(k));
}

const A = LIMITS.ACTIVE;
const active: Check = (value) => {
  if (value === null) return null;
  if (!isPlainObject(value) || !hasOnlyKeys(value, ['type', 'rot', 'x', 'y'])) return INVALID;
  const out = {
    type: int(A.TYPE_MIN, A.TYPE_MAX)(value.type),
    rot: int(A.ROT_MIN, A.ROT_MAX)(value.rot),
    x: int(A.X_MIN, A.X_MAX)(value.x),
    y: int(A.Y_MIN, A.Y_MAX)(value.y),
  };
  return Object.values(out).includes(INVALID) ? INVALID : out;
};

/** specials 원소 (pieceIndex ≤ pieceCount는 봉투 단위 후검사에서 본다) */
const specials: Check = (value) => {
  if (!Array.isArray(value) || value.length > LIMITS.SPECIALS_MAX) return INVALID;
  const out: Array<Record<string, unknown>> = [];
  for (const item of value) {
    if (!isPlainObject(item)) return INVALID;
    const kind = oneOf(SPECIAL_KINDS)(item.kind);
    if (kind === INVALID) return INVALID;
    const isArmor = kind === 'armor';
    if (!hasOnlyKeys(item, isArmor ? ['kind', 'pieceIndex', 'armorId'] : ['kind', 'pieceIndex'])) return INVALID;
    const pieceIndex = int(0, LIMITS.PIECE_COUNT_MAX)(item.pieceIndex);
    if (pieceIndex === INVALID) return INVALID;
    const entry: Record<string, unknown> = { kind, pieceIndex };
    if (isArmor) {
      const armorId = oneOf(ARMOR_IDS)(item.armorId);
      if (armorId === INVALID) return INVALID;
      entry.armorId = armorId;
    }
    out.push(entry);
  }
  return out;
};

const SKILL_IDS: readonly string[] = [...HERO_IDS.map(heroSkillId), ...ANGEL_IDS.map(angelSkillId)];

/** api-gate §2.6 필드 표 */
const FIELDS: Record<string, Check> = {
  token: matches(PATTERNS.TOKEN),
  heroId: oneOf(HERO_IDS),
  mode: oneOf(MODES),
  roomCode: matches(PATTERNS.ROOM_CODE, (s) => s.toUpperCase()),
  botLevel: oneOf(BOT_LEVELS),
  seq: int(0, LIMITS.SEQ_MAX),
  board: matches(PATTERNS.BOARD),
  active,
  score: int(0, LIMITS.SCORE_MAX),
  garbageIn: int(0, Number.MAX_SAFE_INTEGER),
  lines: int(LIMITS.LINES_MIN, LIMITS.LINES_MAX),
  combo: int(0, LIMITS.COMBO_MAX),
  b2b: bool,
  tspin: bool,
  pieceCount: int(0, LIMITS.PIECE_COUNT_MAX),
  specials,
  skillId: oneOf(SKILL_IDS),
  armorId: oneOf(ARMOR_IDS),
  quizId: matches(PATTERNS.QUIZ_ID),
  choice: int(LIMITS.CHOICE_MIN, LIMITS.CHOICE_MAX),
  reactionId: oneOf(REACTION_IDS),
};

interface MessageSchema {
  required: readonly string[];
  optional?: readonly string[];
  /** 필드 사이 규칙 (조건부 필수·R-08 등) */
  refine?: (data: Record<string, unknown>) => boolean;
}

/** API-101 join: roomCode는 invite에서만 필수, botLevel은 bot에서만 필수 — 그 밖의 모드에서는 금지 */
const refineMatchmakerJoin = (d: Record<string, unknown>): boolean =>
  (d.mode === 'invite') === ('roomCode' in d) && (d.mode === 'bot') === ('botLevel' in d);

/** API-204 clear: R-08 tspin은 lines ≤ 3, specials[].pieceIndex ≤ pieceCount */
const refineClear = (d: Record<string, unknown>): boolean => {
  if (d.tspin === true && (d.lines as number) > 3) return false;
  return (d.specials as Array<{ pieceIndex: number }>).every((s) => s.pieceIndex <= (d.pieceCount as number));
};

const SCHEMAS: Record<Channel, Record<string, MessageSchema>> = {
  matchmaker: {
    [MM_C2S.JOIN]: { required: ['token', 'heroId', 'mode'], optional: ['roomCode', 'botLevel'], refine: refineMatchmakerJoin },
    [MM_C2S.CREATE_ROOM]: { required: ['token', 'heroId'] },
    [MM_C2S.CANCEL]: { required: [] },
  },
  room: {
    [ROOM_C2S.JOIN]: { required: ['token', 'heroId'] },
    [ROOM_C2S.READY]: { required: [] },
    [ROOM_C2S.STATE]: { required: ['seq', 'board', 'active', 'score', 'garbageIn'] },
    [ROOM_C2S.CLEAR]: { required: ['seq', 'lines', 'combo', 'b2b', 'tspin', 'pieceCount', 'specials'], refine: refineClear },
    [ROOM_C2S.SKILL]: { required: ['skillId'] },
    [ROOM_C2S.ARMOR]: { required: ['armorId'] },
    [ROOM_C2S.TOPOUT]: { required: ['seq', 'pieceCount'] },
    [ROOM_C2S.QUIZ_ANSWER]: { required: ['quizId', 'choice'] },
    [ROOM_C2S.REACTION]: { required: ['reactionId'] },
    [ROOM_C2S.QUIT]: { required: [] },
  },
};

const fail = (ref: string): ParseResult => ({ ok: false, code: 'INVALID_MESSAGE', ref });

// NFR-003 수신 프레임 검사 — 성공 시 정규화된 data(검증한 필드만 재구성)를 돌려준다 (devguide §7.5)
export function parseClientFrame(channel: Channel, raw: string | ArrayBuffer): ParseResult {
  if (typeof raw !== 'string') return fail(''); // 바이너리 프레임 거부 (api-gate §2.1)
  if (new TextEncoder().encode(raw).length > LIMITS.MAX_FRAME_BYTES) return fail('');
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return fail(''); // JSON 아님 — 오류 내용은 응답·로그에 싣지 않는다 (봉인 제1계명)
  }
  if (!isPlainObject(envelope) || typeof envelope.type !== 'string') return fail('');
  const type = envelope.type;
  const schema = Object.prototype.hasOwnProperty.call(SCHEMAS[channel], type) ? SCHEMAS[channel][type] : undefined;
  if (!schema) return fail('');
  if (!hasOnlyKeys(envelope, ['type', 'data']) || !isPlainObject(envelope.data)) return fail(type);
  const input = envelope.data;
  if (!hasOnlyKeys(input, schema.required, schema.optional)) return fail(type);
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    const checked = FIELDS[key](input[key]);
    if (checked === INVALID) return fail(type);
    data[key] = checked;
  }
  if (schema.refine && !schema.refine(data)) return fail(type);
  return { ok: true, type, data };
}
