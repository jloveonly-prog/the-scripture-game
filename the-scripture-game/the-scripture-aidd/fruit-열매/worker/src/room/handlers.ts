// handlers.ts — 수신 메시지 8종(ready·state·clear·skill·armor·answer·reaction·topout) → room/* 호출, 핸들러마다 try/catch →
// reject/error
// TASK-033 | REQ-001 REQ-005 REQ-007~REQ-009 REQ-011 REQ-013 FR-005 FR-006 FR-009 FR-021 FR-032 FR-064 NFR-002 NFR-003
// ARCH-011 | API-011~API-018 API-020 API-025 | data-ark §8.2 | D-07 | W-01 인계(history 16:58:30) `clear` 합성 순서
// 판정 계산은 room/*·attack.ts만 — 여기는 순서·거부 코드만. 예기치 못한 예외 = 경기 무효(MATCH_ABORTED, devguide §3.3).
import { computeAttack } from "../attack";
import type { BotClear } from "../bot/bot-player";
import { spirits } from "../content";
import { log } from "../log";
import type { RoomSetup } from "../lobby/pairing";
import { ROOM_OUT, type RejectCode, type WsErrorCode } from "../protocol/messages";
import {
  validateAnswer, validateArmor, validateClear, validateReaction, validateReady, validateSkill, validateState,
  validateTopout,
} from "../protocol/validate";
import { sha256Hex } from "../services/guest-service";
import type { Slot } from "../storage/adapter";
import { summonAngel } from "./angels";
import { useArmor } from "./armor";
import { deliverAttack } from "./garbage";
import { useHeroSkill } from "./hero-skills";
import { checkJesusEvent } from "./jesus";
import {
  handleTopout, isActive, isVersus, markReady, opponentOf, openWordQuiz, quizHooks, type MatchState,
} from "./match-flow";
import type { Outbox, SocketLike } from "./outbox";
import {
  addGauge, gaugeForClear, noteClear, notePieceCount, pendingTotal, sendStatus, type RoomContext, type SlotState,
} from "./player-state";
import { answerQuiz } from "./quiz";
import { applySpecials, verifySpecials } from "./specials";

/** FR-032 "초당" 판정 창 (단위 정의 — 1초) */
const ONE_SECOND_MS = 1000;

/** 슬롯별 진행 검사 기억 (라운드마다 초기화 — 엔진·pieceCount가 라운드마다 새로 시작) */
export interface SlotMemo {
  /** 직전에 통과한 `clear`의 콤보 (−1 = 이번 라운드 삭제 없음) */
  combo: number;
  /** 직전에 통과한 `clear`가 테트리스·T-Spin이었는가 (b2b 검사) */
  difficult: boolean;
  /** 최근 1초 pieceCount 증가 기록 (FR-032 초당 증가량) */
  pieces: Array<{ at: number; n: number }>;
  /** pieceCount를 마지막으로 반영한 시각 (처음 = 라운드 진행 시작) */
  since: number;
}

/** @param since 라운드 진행 시작 시각 (카운트다운 끝) */
export function freshMemo(since: number): SlotMemo {
  return { combo: -1, difficult: false, pieces: [], since };
}

/** GameRoom(DO 셸)이 핸들러에 주는 방 1개의 실행 환경 */
export interface RoomRuntime {
  readonly ctx: RoomContext;
  readonly match: MatchState;
  readonly setup: RoomSetup;
  readonly outbox: Outbox;
  memo(slot: Slot): SlotMemo;
  /** API-011 토큰 검증 — Matchmaker RPC (원장) */
  verifyGuest(token: string): Promise<{ ok: true; guestId: string }
    | { ok: false; code: "UNAUTHORIZED" | "STORAGE_UNAVAILABLE" }>;
  /** 티켓 폐기(config 저장) + 소켓 첨부·송신함 연결 */
  bind(ws: SocketLike, slot: Slot): Promise<void>;
  fail(ws: SocketLike, code: WsErrorCode): void;
  /** 처리 오류 — 경기 무효 (UC-005 E2) */
  abort(): void;
}

function guestOf(rt: RoomRuntime, slot: Slot): string | null {
  return rt.setup.config.slots.find((s) => s.slot === slot)?.guestId ?? null;
}

/** API-025 거부 + 보안 로그 (봇 슬롯이면 로그만) */
function reject(rt: RoomRuntime, slot: Slot, action: string, code: RejectCode, retryInMs: number | null = null): void {
  log.event("reject", { gid: guestOf(rt, slot), code });
  rt.outbox.reject(slot, action, code, retryInMs);
}

function crash(rt: RoomRuntime, slot: Slot | null): void {
  log.event("reject", { gid: slot === null ? null : guestOf(rt, slot), code: "MATCH_ABORTED" });
  rt.abort();
}

/** API-011 `ready`: 형식 → 방 설정 → 티켓 SHA-256 일치·1회용(TICKET_INVALID) → 토큰 guestId 일치(UNAUTHORIZED) → 슬롯 연결 */
export async function onReady(rt: RoomRuntime, ws: SocketLike, data: Record<string, unknown>): Promise<void> {
  try {
    const v = validateReady(data);
    if (!v.ok) return rt.fail(ws, v.code);
    if (rt.match.phase === "ended") return rt.fail(ws, "ROOM_NOT_FOUND");
    const hash = await sha256Hex(v.value.ticket);
    const slot = rt.setup.config.slots.find((s) => rt.setup.ticketHashes[s.slot] === hash)?.slot;
    if (slot === undefined || rt.outbox.has(slot)) return rt.fail(ws, "TICKET_INVALID");
    const auth = await rt.verifyGuest(v.value.token);
    if (!auth.ok) return rt.fail(ws, auth.code);
    if (auth.guestId !== guestOf(rt, slot)) return rt.fail(ws, "UNAUTHORIZED");
    // 기다리는 동안 같은 티켓이 먼저 쓰였으면 거부 (사용 후 폐기 — api-gate §5)
    if (rt.setup.ticketHashes[slot] !== hash || rt.outbox.has(slot)) return rt.fail(ws, "TICKET_INVALID");
    await rt.bind(ws, slot);
    markReady(rt.ctx, rt.match, slot);
  } catch {
    rt.fail(ws, "MATCH_ABORTED");
  }
}

/**
 * FR-032 ② pieceCount 감소 없음 + 초당 증가량 ≤ progressCheck.maxPiecesPerSecond. 마지막 반영 뒤 1초 넘게 지났으면
 * 그 경과 시간 전체에 같은 비율을 적용한다 (W-02: `state`를 보내지 않는 봇·드물게 보내는 클라이언트의 정직한 진행이
 * "한 번에 10개 초과"로 거부되던 결함 — 봇이 줄을 모아 지우면 모든 clear가 거부됐다).
 */
function piecesPossible(rt: RoomRuntime, me: SlotState, memo: SlotMemo, pieceCount: number, now: number): boolean {
  if (pieceCount < me.lastPieceCount) return false;
  const max = rt.ctx.rules.progressCheck.maxPiecesPerSecond;
  const jump = pieceCount - me.lastPieceCount;
  const idle = now - memo.since;
  if (idle >= ONE_SECOND_MS) return jump <= (max * idle) / ONE_SECOND_MS;
  memo.pieces = memo.pieces.filter((p) => now - p.at < ONE_SECOND_MS);
  return memo.pieces.reduce((sum, p) => sum + p.n, 0) + jump <= max;
}

/** 검사를 통과한 pieceCount 반영 (통계 piecesPlaced·초당 기록) */
function commitPieces(me: SlotState, memo: SlotMemo, pieceCount: number, now: number): void {
  if (pieceCount > me.lastPieceCount) {
    memo.pieces.push({ at: now, n: pieceCount - me.lastPieceCount });
    memo.since = now;
  }
  notePieceCount(me, pieceCount, now);
}

/** API-012 `state`: 스키마·seq 역행은 조용히 버림 → 위기 판정(예수님 이벤트 FR-039) → 상대에게 `opponentState` (FR-006) */
export function onState(rt: RoomRuntime, slot: Slot, data: Record<string, unknown>, now: number): void {
  try {
    const m = rt.match;
    const v = validateState(data, rt.ctx.rules);
    if (!v.ok) return log.event("reject", { gid: guestOf(rt, slot), code: v.code });
    const me = m.slots.get(slot) as SlotState;
    const s = v.value;
    if (s.seq <= me.lastSeq || m.phase === "waiting" || m.phase === "ended") return;
    me.lastSeq = s.seq;
    if (piecesPossible(rt, me, rt.memo(slot), s.pieceCount, now)) commitPieces(me, rt.memo(slot), s.pieceCount, now);
    // D-07 서버는 보드로 위기만 판정 — API-012 "위기 + 게이지 가득이면 effect source=jesus"
    if (m.phase === "active") checkJesusEvent(rt.ctx, me, isVersus(m), s.board);
    const opp = opponentOf(m, slot);
    if (opp && !opp.isBot) {
      rt.ctx.send(opp.slot, ROOM_OUT.opponentState, { slot, seq: s.seq, board: s.board, active: s.active, hold: s.hold,
        score: s.score, combo: s.combo, pending: pendingTotal(me) });
    }
  } catch {
    crash(rt, slot);
  }
}

/**
 * API-013 `clear` 판정 (사람·봇 공용 — architecture §9.4). W-01 인계 순서 고정:
 * ① FR-032 검사(진행 중·seq 역행·pieceCount·누적 줄 수·조합) → ② pieceCount 반영 → ③ verifySpecials(D-09)
 * → ④ noteClear → ⑤ 게이지 → ⑥ computeAttack(jericho = 검증된 여리고 수) → ⑦ deliverAttack → ⑧ applySpecials → ⑨ 말씀 대결.
 * 거부되면 상태를 바꾸지 않는다 (seq 순서 기록만 전진 — UC-007 E4 "공격 없음, 진행은 계속").
 * @returns 거부 코드 (통과면 null)
 */
export function applyClear(rt: RoomRuntime, slot: Slot, c: BotClear, now: number): RejectCode | null {
  const m = rt.match;
  const ctx = rt.ctx;
  const rules = ctx.rules;
  if (!isActive(m)) return "NOT_ACTIVE";
  const me = m.slots.get(slot) as SlotState;
  const memo = rt.memo(slot);
  const prev = { combo: memo.combo, difficult: memo.difficult };
  const seqOk = c.seq > me.lastSeq;
  // seq는 수신 순서 기록 — 거부돼도 앞으로만 (재전송 차단). 콤보·b2b 기억은 통과한 clear만 (W-02: 거부된 주장으로 부풀리기 차단)
  if (seqOk) me.lastSeq = c.seq;
  // FR-032 ③ 누적 지운 줄 × 10 > 누적 pieceCount × 4 + 받은 쓰레기 줄 × 9 + 납 블록 칸 → 블록 수보다 많은 줄 삭제
  const cellsCleared = (me.round.linesCleared + c.lines) * rules.board.width;
  const cellsAvailable = c.pieceCount * 4 + me.round.garbageRows * (rules.board.width - 1) + me.round.leadCells;
  // FR-032 ④ 조합: T-Spin은 3줄 이하, b2b는 직전 삭제가 테트리스·T-Spin일 때만, combo는 직전+1 또는 0
  const comboOk = c.combo === 0 || c.combo === prev.combo + 1;
  if (!seqOk || !piecesPossible(rt, me, memo, c.pieceCount, now) || cellsCleared > cellsAvailable
    || (c.tspin && c.lines > 3) || (c.b2b && !prev.difficult) || !comboOk) return "CLEAR_REJECTED";
  // D-09 특수 칸 재계산 검증 (해금 단계·대전 여부·같은 칸 두 번 금지)
  const verdict = verifySpecials(c.specials, m.seed, m.stage, isVersus(m), c.pieceCount, me.claimedSpecials, rules);
  if (!verdict.ok) return "CLEAR_REJECTED";
  commitPieces(me, memo, c.pieceCount, now);
  memo.combo = c.combo;
  memo.difficult = c.lines === 4 || c.tspin;
  const streak = noteClear(me, c);
  // FR-033 rules.gauge 충전 (은혜 배율은 addGauge)
  addGauge(me, gaugeForClear(c.lines, c.tspin, rules), rules);
  // FR-024·FR-026·FR-045 서버 판정 공격 (여리고 +jerichoBonus×개수)
  const attack = computeAttack({ lines: c.lines, combo: c.combo, b2b: c.b2b, tspin: c.tspin, jericho: verdict.jericho,
    b2bTetrisStreak: streak }, rules, spirits, ctx.random);
  const opp = opponentOf(m, slot);
  let statusSent = false;
  if (opp && attack.attackPower > 0) {
    // FR-025 내 대기 공격 먼저 상쇄 → 상대 방어·은혜·상한 → 양측 `attack` (NFR-002 같은 처리 단위에서 즉시 전송)
    deliverAttack(ctx, me, opp, { linesCleared: c.lines, attackPower: attack.attackPower, spiritId: attack.spiritId,
      reflected: false });
    statusSent = true;
  }
  if (applySpecials(ctx, me, verdict).length > 0) statusSent = true;
  if (!statusSent) sendStatus(ctx, me);
  // FR-040 말씀 칸 → 말씀 대결 (대전 전용)
  if (verdict.word) openWordQuiz(ctx, m);
  return null;
}

/** API-013 사람 `clear` */
export function onClear(rt: RoomRuntime, ws: SocketLike, slot: Slot, data: Record<string, unknown>, now: number): void {
  try {
    const v = validateClear(data);
    if (!v.ok) return rt.fail(ws, v.code);
    const code = applyClear(rt, slot, v.value, now);
    if (code) reject(rt, slot, "clear", code);
  } catch {
    crash(rt, slot);
  }
}

/** API-014 `skill`: NOT_ACTIVE → 위인 스킬(FR-034) / 천사(FR-035 — 대전만) */
export function onSkill(rt: RoomRuntime, ws: SocketLike, slot: Slot, data: Record<string, unknown>): void {
  try {
    const v = validateSkill(data);
    if (!v.ok) return rt.fail(ws, v.code);
    const m = rt.match;
    if (!isActive(m)) return reject(rt, slot, "skill", "NOT_ACTIVE");
    const me = m.slots.get(slot) as SlotState;
    const r = v.value.kind === "hero" ? useHeroSkill(rt.ctx, me, opponentOf(m, slot), v.value.skillId)
      : summonAngel(rt.ctx, me, isVersus(m), v.value.skillId);
    if (!r.ok) reject(rt, slot, "skill", r.code, r.retryInMs);
  } catch {
    crash(rt, slot);
  }
}

/** API-015 `armor`: NOT_ACTIVE → 갑주 사용 (FR-037 — NO_ARMOR·MODE_FORBIDDEN) */
export function onArmor(rt: RoomRuntime, ws: SocketLike, slot: Slot, data: Record<string, unknown>): void {
  try {
    const v = validateArmor(data);
    if (!v.ok) return rt.fail(ws, v.code);
    const m = rt.match;
    if (!isActive(m)) return reject(rt, slot, "armor", "NOT_ACTIVE");
    const r = useArmor(rt.ctx, m.slots.get(slot) as SlotState, opponentOf(m, slot), isVersus(m), v.value.armorId);
    if (!r.ok) reject(rt, slot, "armor", r.code, r.retryInMs);
  } catch {
    crash(rt, slot);
  }
}

/** API-016 `answer`: 서버 도착 순서 판정 (FR-041 — QUIZ_WRONG·QUIZ_LOCKED·QUIZ_CLOSED) */
export function onAnswer(rt: RoomRuntime, ws: SocketLike, slot: Slot, data: Record<string, unknown>): void {
  try {
    const v = validateAnswer(data);
    if (!v.ok) return rt.fail(ws, v.code);
    const m = rt.match;
    const r = answerQuiz(rt.ctx, m, slot, v.value.quizId, v.value.choice, quizHooks(rt.ctx, m));
    if (!r.ok) reject(rt, slot, "answer", r.code, r.retryInMs);
  } catch {
    crash(rt, slot);
  }
}

/** API-017 `reaction`: 정의된 3종만(C-009), 사람 대 사람만 상대에게 API-028 (UC-017 1a 봇·연습 중계 없음) */
export function onReaction(rt: RoomRuntime, slot: Slot, data: Record<string, unknown>): void {
  try {
    const v = validateReaction(data, rt.ctx.rules);
    if (!v.ok) return reject(rt, slot, "reaction", v.code);
    const m = rt.match;
    const opp = opponentOf(m, slot);
    if (!opp || opp.isBot || m.phase === "ended") return;
    rt.ctx.send(opp.slot, ROOM_OUT.reaction, { from: slot, reactionId: v.value.reactionId });
  } catch {
    crash(rt, slot);
  }
}

/** API-018 `topout`: 대전 라운드 패배 / 연습 세션 종료 (NOT_ACTIVE·MODE_FORBIDDEN) */
export function onTopout(rt: RoomRuntime, ws: SocketLike, slot: Slot, data: Record<string, unknown>,
  now: number): void {
  try {
    const v = validateTopout(data);
    if (!v.ok) return rt.fail(ws, v.code);
    const m = rt.match;
    const me = m.slots.get(slot) as SlotState;
    if (v.value.seq > me.lastSeq) me.lastSeq = v.value.seq;
    if (v.value.pieceCount > me.lastPieceCount) notePieceCount(me, v.value.pieceCount, now);
    const r = handleTopout(rt.ctx, m, slot, v.value.voluntary);
    if (!r.ok) reject(rt, slot, "topout", r.code);
  } catch {
    crash(rt, slot);
  }
}
