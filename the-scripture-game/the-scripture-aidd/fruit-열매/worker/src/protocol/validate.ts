// validate.ts — 수신 메시지 10종 필드 타입·범위·열거 검증만 (추가 필드 무시)
// TASK-030 | REQ-001 REQ-007 FR-008 FR-032 NFR-003 | ARCH-015 | API-007 API-008 API-011~API-018 | api-gate §2 검증 원칙·§5
// D-16 (수기 검증기 — 추가 의존 0)
// 상태가 필요한 검사(seq 역행·pieceCount 단조·진행 불가능성 FR-032·quizId 일치·보유 갑주)는 room/handlers.ts가 한다.
// 이 파일은 메시지 1개만 보고 판단할 수 있는 규칙(필수·타입·범위·열거·길이)만 본다. 실패 시 공격·효과를 만들지 않는다.
import { PIECE_TYPES } from "../../../client/js/engine/index.js";
import { heroesById, type Rules } from "../content";
import { SPECIAL_KINDS } from "../room/specials";
import type { BotLevel, HeroId } from "../storage/adapter";
import type { RejectCode, WsErrorCode } from "./messages";

/** 검증 결과 — 실패는 api-gate §4.2(reject) / §4.3(error) 코드 */
export type Checked<T, C extends string = WsErrorCode> = { ok: true; value: T } | { ok: false; code: C };

/** CODE-001 경기 모드 */
export const MODES = ["random", "invite", "bot", "practice"] as const;
export type Mode = (typeof MODES)[number];

/** API-007 `join` */
export interface JoinMsg {
  token: string; heroId: HeroId; mode: Mode; roomCode: string | null; botLevel: BotLevel | null;
}
/** API-011 `ready` */
export interface ReadyMsg { token: string; ticket: string }
/** API-012 `state` */
export interface ActivePiece { type: string; x: number; y: number; rot: number }
export interface StateMsg {
  seq: number; board: string; active: ActivePiece | null; hold: string | null; score: number; combo: number;
  pieceCount: number;
}
/** API-013 `clear` */
export interface ClearMsg {
  seq: number; lines: number; combo: number; b2b: boolean; tspin: boolean; pieceCount: number;
  specials: Array<{ kind: string; pieceIndex: number; armorId?: string }>;
}
/** API-014 `skill` */
export interface SkillMsg { kind: "hero" | "angel"; skillId: string }
/** API-015 `armor` */
export interface ArmorMsg { armorId: string }
/** API-016 `answer` */
export interface AnswerMsg { quizId: string; choice: number }
/** API-017 `reaction` */
export interface ReactionMsg { reactionId: string }
/** API-018 `topout` */
export interface TopoutMsg { seq: number; pieceCount: number; voluntary: boolean }

/** api-gate §5 게스트 토큰 = base64url 43자 (API-002 검증 규칙) */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** api-gate API-010 입장 티켓 = 24자 무작위 (lobby/pairing.ts가 base64url로 발급) */
export const TICKET_PATTERN = /^[A-Za-z0-9_-]{24}$/;
/** API-006 roomId = UUID v4 (36자) */
export const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** 문자열 식별자 상한 (skillId·armorId·quizId — id는 snake_case·Q017 형식, 추가 필드 무시 원칙과 별개로 길이만 제한) */
const MAX_ID_LENGTH = 64;
/** API-013 specials 최대 개수 (줄 4개) */
const MAX_SPECIALS = 4;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isInt(v: unknown, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}
function isId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LENGTH;
}

/** api-gate §2 메시지 크기: UTF-8 바이트 수 */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * D-20 공통 봉투 파싱: 텍스트 프레임 1개 = JSON 1개, 최대 rateLimit.maxMessageBytes(4,096B), `{type: string, data: object}`.
 * 바이너리 프레임·초과·파싱 실패·봉투 위반 → BAD_MESSAGE (api-gate §2 "초과 시 BAD_MESSAGE").
 */
export function parseEnvelope(raw: string | ArrayBuffer,
  rules: Rules): Checked<{ type: string; data: Obj }, "BAD_MESSAGE"> {
  const bad = { ok: false as const, code: "BAD_MESSAGE" as const };
  if (typeof raw !== "string" || utf8Bytes(raw) > rules.rateLimit.maxMessageBytes) return bad;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, code: "BAD_MESSAGE" };
  }
  if (!isObj(parsed) || typeof parsed.type !== "string" || !isObj(parsed.data)) return bad;
  return { ok: true, value: { type: parsed.type, data: parsed.data } };
}

/** NFR-003 토큰 형식 — 없거나 틀리면 UNAUTHORIZED (원인 구분 없음, api-gate §5) */
function tokenOf(d: Obj): string | null {
  return typeof d.token === "string" && TOKEN_PATTERN.test(d.token) ? d.token : null;
}

/** API-007 roomCode: 6자(invite.length), invite.alphabet 문자만, 대문자 변환 후 비교 */
export function normalizeRoomCode(code: string, rules: Rules): string | null {
  const upper = code.trim().toUpperCase();
  if (upper.length !== rules.invite.length) return null;
  for (const ch of upper) if (!rules.invite.alphabet.includes(ch)) return null;
  return upper;
}

/**
 * API-007 `join` — 토큰(UNAUTHORIZED) · heroId CODE-003(HERO_INVALID, C-008)
 * · mode CODE-001 + botLevel CODE-002 조합(MODE_INVALID)
 * · roomCode(mode=invite일 때만, 형식이 틀린 코드는 존재할 수 없으므로 INVITE_NOT_FOUND — UC-004 E1).
 */
export function validateJoin(d: Obj, rules: Rules): Checked<JoinMsg> {
  const token = tokenOf(d);
  if (!token) return { ok: false, code: "UNAUTHORIZED" };
  if (typeof d.heroId !== "string" || typeof d.mode !== "string") return { ok: false, code: "BAD_MESSAGE" };
  if (!heroesById.has(d.heroId)) return { ok: false, code: "HERO_INVALID" };
  if (!(MODES as readonly string[]).includes(d.mode)) return { ok: false, code: "MODE_INVALID" };
  const mode = d.mode as Mode;
  const hasCode = d.roomCode !== undefined && d.roomCode !== null;
  const hasLevel = d.botLevel !== undefined && d.botLevel !== null;
  if ((hasCode && typeof d.roomCode !== "string") || (hasLevel && typeof d.botLevel !== "string")) {
    return { ok: false, code: "BAD_MESSAGE" };
  }
  // API-007 roomCode는 mode=invite일 때만, botLevel은 mode=bot이면 필수이고 그 밖에는 없음
  if ((hasCode && mode !== "invite") || (mode === "bot") !== hasLevel) return { ok: false, code: "MODE_INVALID" };
  if (hasLevel && !Object.hasOwn(rules.bot, d.botLevel as string)) return { ok: false, code: "MODE_INVALID" };
  let roomCode: string | null = null;
  if (hasCode) {
    roomCode = normalizeRoomCode(d.roomCode as string, rules);
    if (!roomCode) return { ok: false, code: "INVITE_NOT_FOUND" };
  }
  return { ok: true, value: { token, heroId: d.heroId as HeroId, mode, roomCode,
    botLevel: hasLevel ? (d.botLevel as BotLevel) : null } };
}

/** API-011 `ready` — 토큰(UNAUTHORIZED) · 티켓 24자(TICKET_INVALID) */
export function validateReady(d: Obj): Checked<ReadyMsg> {
  const token = tokenOf(d);
  if (!token) return { ok: false, code: "UNAUTHORIZED" };
  if (typeof d.ticket !== "string" || !TICKET_PATTERN.test(d.ticket)) return { ok: false, code: "TICKET_INVALID" };
  return { ok: true, value: { token, ticket: d.ticket } };
}

/** API-012 active `{type ∈ IOTSZJL, x −2~11, y −2~21, rot 0~3}` */
function activeOf(v: unknown): ActivePiece | null | undefined {
  if (v === null) return null;
  if (!isObj(v) || typeof v.type !== "string" || !PIECE_TYPES.includes(v.type)) return undefined;
  if (!isInt(v.x, -2, 11) || !isInt(v.y, -2, 21) || !isInt(v.rot, 0, 3)) return undefined;
  return { type: v.type, x: v.x, y: v.y, rot: v.rot };
}

/** API-012 `state` — board 정확히 width×height자 `[0-9]`(CODE-009), combo −1 이상. 실패는 호출자가 조용히 버린다 */
export function validateState(d: Obj, rules: Rules): Checked<StateMsg, "BAD_MESSAGE"> {
  const bad = { ok: false as const, code: "BAD_MESSAGE" as const };
  const cells = rules.board.width * rules.board.height;
  if (!isInt(d.seq, 0) || typeof d.board !== "string") return bad;
  if (d.board.length !== cells || !/^[0-9]+$/.test(d.board)) return bad;
  const active = activeOf(d.active);
  if (active === undefined) return bad;
  if (!(d.hold === null || (typeof d.hold === "string" && PIECE_TYPES.includes(d.hold)))) return bad;
  if (!isInt(d.score, 0) || !isInt(d.combo, -1) || !isInt(d.pieceCount, 0)) return bad;
  return { ok: true, value: { seq: d.seq, board: d.board, active, hold: d.hold as string | null, score: d.score,
    combo: d.combo, pieceCount: d.pieceCount } };
}

/**
 * API-013 `clear` — lines 1~4, combo 0 이상, b2b·tspin Boolean, pieceCount 0 이상, specials 배열 최대 4개
 * `{kind CODE-013, pieceIndex ≥ 1, armorId? 문자열}`. lines·tspin·b2b 조합과 진행 가능성은 FR-032 검사(handlers)가 본다.
 */
export function validateClear(d: Obj): Checked<ClearMsg, "BAD_MESSAGE"> {
  const bad = { ok: false as const, code: "BAD_MESSAGE" as const };
  if (!isInt(d.seq, 0) || !isInt(d.lines, 1, 4) || !isInt(d.combo, 0) || !isInt(d.pieceCount, 0)) return bad;
  if (typeof d.b2b !== "boolean" || typeof d.tspin !== "boolean") return bad;
  if (!Array.isArray(d.specials) || d.specials.length > MAX_SPECIALS) return bad;
  const specials: ClearMsg["specials"] = [];
  for (const s of d.specials) {
    if (!isObj(s) || typeof s.kind !== "string" || !(SPECIAL_KINDS as readonly string[]).includes(s.kind)) return bad;
    if (!isInt(s.pieceIndex, 1)) return bad;
    if (s.armorId !== undefined && s.armorId !== null && !isId(s.armorId)) return bad;
    specials.push({ kind: s.kind, pieceIndex: s.pieceIndex, ...(typeof s.armorId === "string"
      ? { armorId: s.armorId } : {}) });
  }
  return { ok: true, value: { seq: d.seq, lines: d.lines, combo: d.combo, b2b: d.b2b, tspin: d.tspin,
    pieceCount: d.pieceCount, specials } };
}

/** API-014 `skill` — kind CODE-015 `hero`·`angel`, skillId 문자열 (내 위인 스킬인지는 hero-skills·angels가 SKILL_INVALID) */
export function validateSkill(d: Obj): Checked<SkillMsg, "BAD_MESSAGE"> {
  if ((d.kind !== "hero" && d.kind !== "angel") || !isId(d.skillId)) return { ok: false, code: "BAD_MESSAGE" };
  return { ok: true, value: { kind: d.kind, skillId: d.skillId } };
}

/** API-015 `armor` — armorId 문자열 (보유 여부는 armor.ts가 NO_ARMOR) */
export function validateArmor(d: Obj): Checked<ArmorMsg, "BAD_MESSAGE"> {
  if (!isId(d.armorId)) return { ok: false, code: "BAD_MESSAGE" };
  return { ok: true, value: { armorId: d.armorId } };
}

/** API-016 `answer` — quizId 문자열, choice 0~3 (현재 문제 일치는 quiz.ts가 QUIZ_CLOSED) */
export function validateAnswer(d: Obj): Checked<AnswerMsg, "BAD_MESSAGE"> {
  if (!isId(d.quizId) || !isInt(d.choice, 0, 3)) return { ok: false, code: "BAD_MESSAGE" };
  return { ok: true, value: { quizId: d.quizId, choice: d.choice } };
}

/** API-017 `reaction` — CODE-014 rules.reactions id만 (자유 텍스트 없음 — C-009). 실패 = reject REACTION_INVALID */
export function validateReaction(d: Obj, rules: Rules): Checked<ReactionMsg, Extract<RejectCode, "REACTION_INVALID">> {
  if (typeof d.reactionId !== "string" || !rules.reactions.some((r) => r.id === d.reactionId)) {
    return { ok: false, code: "REACTION_INVALID" };
  }
  return { ok: true, value: { reactionId: d.reactionId } };
}

/** API-018 `topout` — seq·pieceCount 0 이상 정수, voluntary Boolean (연습에서만 true는 match-flow가 MODE_FORBIDDEN) */
export function validateTopout(d: Obj): Checked<TopoutMsg, "BAD_MESSAGE"> {
  if (!isInt(d.seq, 0) || !isInt(d.pieceCount, 0) || typeof d.voluntary !== "boolean") {
    return { ok: false, code: "BAD_MESSAGE" };
  }
  return { ok: true, value: { seq: d.seq, pieceCount: d.pieceCount, voluntary: d.voluntary } };
}
