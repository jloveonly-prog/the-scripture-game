// match-flow.ts — 라운드·경기 상태 전이(시작·승패·다음 라운드·이탈·무효·연습)만
// TASK-018 | REQ-001 REQ-006 REQ-012 REQ-013 FR-005 FR-007 FR-009 FR-010 FR-023 FR-040 FR-047 FR-062 | ARCH-011
// API-018 API-019 API-023(grace) API-029 | TBL-018 `match`·`board`·`grace` | architecture §9.5 §9.8 §9.9 | UC-015
// UC-016 | OQ #1 #12
// 경기 종료 기록·matchEnd 조립은 results.ts (hooks.onEnd를 받은 GameRoom이 호출 — 위상 순서 match-flow → results).
import type { QuizItem } from "../content";
import { isGrace, stageForPlayers, unlockStage, type Stage } from "../services/progress-service";
import type { BotLevel, EndReason, HeroId, Slot } from "../storage/adapter";
import { shiftEffectTimers } from "./effects";
import { cancelAllPending, pausePending, resumePending } from "./garbage";
import { createSlotState, resetForRound, sendStatus, type RoomContext, type SlotState } from "./player-state";
import { cancelQuiz, openQuiz, scheduleAutoQuiz, type QuizHooks, type QuizRoom } from "./quiz";

/** api-gate §2 프로토콜 버전 1 (`start`·`matched`의 `protocol`) */
const PROTOCOL_VERSION = 1;

/** CODE-001 */
export type MatchModeAll = "random" | "invite" | "bot" | "practice";

/** data-ark §8.2 방 설정 `config` 슬롯 */
export interface SlotConfig {
  slot: Slot;
  guestId: string | null;
  nickname: string | null;
  heroId: HeroId;
  isBot: boolean;
  roundsPlayed: number; // 끝낸 라운드 누적 (해금 단계 — TBL-004)
  consecutiveRoundLosses: number; // 연속으로 진 대전 라운드 (은혜 — TBL-004)
}

export interface MatchConfig { roomId: string; mode: MatchModeAll; botLevel: BotLevel | null; slots: SlotConfig[] }

export type Phase = "waiting" | "countdown" | "active" | "quiz" | "between" | "ended";

/** 경기 끝 — voided면 기록·matchEnd 없음 (UC-016 E1, UC-005 E2) */
export interface MatchEnd { winnerSlot: Slot | null; reason: EndReason; voided: boolean }

/** GameRoom(02)이 주입하는 훅 */
export interface MatchHooks {
  onRoundStart(round: number, seed: number, stage: Stage): void; // 봇 엔진 새로 만들기 등 (사람과 같은 seed·stage)
  onEnd(end: MatchEnd): void; // 경기 끝 → results.finishMatch 호출·소켓 정리
  botAnswers(item: QuizItem): Array<{ slot: Slot; delayMs: number; choice: number }>; // FR-022 봇 퀴즈 응답 계획
}

/** data-ark §8.2 라운드 상태 + 슬롯별 판정 상태 */
export interface MatchState extends QuizRoom {
  config: MatchConfig;
  hooks: MatchHooks;
  phase: Phase;
  round: number;
  wins: Map<Slot, number>;
  seed: number;
  stage: Stage;
  matchStartedAt: number | null;
  pausedTotalMs: number;
  pausedAt: number | null;
  endedAt: number | null;
  ready: Set<Slot>;
  connected: Set<Slot>;
  /** 라운드별 승자 (중도 이탈 라운드 포함) */
  roundWinners: Slot[];
  lossStreak: Map<Slot, number>;
  roundsFinished: Map<Slot, number>;
  timers: Array<() => void>;
  end: MatchEnd | null;
}

/** 대전(사람·봇) 여부 — 연습 제외 (spec-tablet §9.8 #3) */
export function isVersus(m: MatchState): boolean {
  return m.config.mode !== "practice";
}

/** 방 설정 → 경기 상태. 봇 슬롯은 처음부터 준비·연결 상태 (API-011 "봇 슬롯은 즉시") */
export function createMatch(config: MatchConfig, hooks: MatchHooks): MatchState {
  const slots = new Map<Slot, SlotState>();
  for (const c of config.slots) slots.set(c.slot, createSlotState(c.slot, c.heroId, c.isBot));
  const bots = config.slots.filter((c) => c.isBot).map((c) => c.slot);
  return {
    config, hooks, slots, quiz: null, usedQuizIds: new Set(), autoQuizCancel: null,
    phase: "waiting", round: 0, wins: new Map(config.slots.map((c) => [c.slot, 0])), seed: 0,
    stage: { word: false, jericho: false, manna: false },
    matchStartedAt: null, pausedTotalMs: 0, pausedAt: null, endedAt: null,
    ready: new Set(bots), connected: new Set(bots), roundWinners: [],
    lossStreak: new Map(config.slots.map((c) => [c.slot, c.consecutiveRoundLosses])),
    roundsFinished: new Map(config.slots.map((c) => [c.slot, 0])), timers: [], end: null,
  };
}

/** 상대 슬롯 (연습 = null) */
export function opponentOf(m: MatchState, slot: Slot): SlotState | null {
  for (const [s, state] of m.slots) if (s !== slot) return state;
  return null;
}

/** 스킬·갑주·clear 허용 여부 (NOT_ACTIVE — 라운드 대기·말씀 대결 정지 중 거부) */
export function isActive(m: MatchState): boolean {
  return m.phase === "active";
}

/** API-011 `ready` 인증 통과 — 모든 슬롯 준비되면 첫 라운드 (연습은 바로) */
export function markReady(ctx: RoomContext, m: MatchState, slot: Slot): void {
  m.ready.add(slot);
  m.connected.add(slot);
  if (m.phase === "waiting" && m.config.slots.every((c) => m.ready.has(c.slot))) startRound(ctx, m);
}

/** 경기 경과 ms (D-18 낙하 곡선 기준 — 말씀 대결 정지 시간 제외) */
export function matchElapsedMs(m: MatchState, now: number): number {
  return m.matchStartedAt === null ? 0 : Math.max(0, now - m.matchStartedAt - m.pausedTotalMs);
}

/** 퀴즈 정지·재개 훅 (FR-041 "두 플레이어 화면이 동시에 멈추고", 재개 후 autoIntervalMs 자동 대결 예약 — OQ #21) */
export function quizHooks(ctx: RoomContext, m: MatchState): QuizHooks {
  const hooks: QuizHooks = {
    pause: () => {
      m.phase = "quiz";
      m.pausedAt = ctx.now();
      for (const s of m.slots.values()) pausePending(s, m.pausedAt);
    },
    resume: () => {
      if (m.phase !== "quiz" || m.pausedAt === null) return;
      const paused = ctx.now() - m.pausedAt;
      m.pausedTotalMs += paused;
      m.pausedAt = null;
      m.phase = "active";
      for (const s of m.slots.values()) {
        shiftEffectTimers(s, paused);
        resumePending(ctx, s);
        sendStatus(ctx, s);
      }
      scheduleAutoQuiz(ctx, m, hooks);
    },
    botAnswers: (item) => m.hooks.botAnswers(item),
  };
  return hooks;
}

/** FR-040 말씀 칸 삭제로 대결 열기 (대전 전용, 진행 중일 때만) */
export function openWordQuiz(ctx: RoomContext, m: MatchState): boolean {
  if (!isVersus(m) || m.phase !== "active") return false;
  return openQuiz(ctx, m, quizHooks(ctx, m)) !== null;
}

/**
 * 라운드 시작 (API-019): 라운드마다 새 시드(architecture §9.8), 해금 단계 = 사람 중 낮은 쪽(OQ #12, 연습은 말씀 없음),
 * 슬롯별 은혜(FR-062), 미리보기(솔로몬 previewSolomon — FR-015), countdownMs 뒤 진행 + 90초 자동 대결 예약(대전).
 */
export function startRound(ctx: RoomContext, m: MatchState): void {
  clearTimers(m);
  const rules = ctx.rules;
  m.round += 1;
  m.seed = ctx.randomUint32();
  const humans = m.config.slots.filter((c) => !c.isBot);
  const played = humans.map((c) => c.roundsPlayed + (m.roundsFinished.get(c.slot) ?? 0));
  const stage = isVersus(m) ? stageForPlayers(played, rules) : { ...unlockStage(played[0] ?? 0, rules), word: false };
  m.stage = stage;
  m.phase = "countdown";
  const now = ctx.now();
  const elapsed = m.matchStartedAt === null ? 0 : matchElapsedMs(m, now + rules.match.countdownMs);
  for (const c of m.config.slots) {
    const state = m.slots.get(c.slot)!;
    const grace = isGrace(m.lossStreak.get(c.slot) ?? 0, rules);
    resetForRound(state, grace);
    ctx.send(c.slot, "start", {
      protocol: PROTOCOL_VERSION, mode: m.config.mode, round: m.round, slot: c.slot, seed: m.seed,
      countdownMs: rules.match.countdownMs, matchElapsedMs: elapsed, stage, grace,
      // FR-015 솔로몬 패시브: 다음 블록 5개 미리보기
      preview: c.heroId === "solomon" ? rules.board.previewSolomon : rules.board.preview,
    });
    if (grace) {
      ctx.broadcast("effect", {
        source: "grace", id: "grace", by: null, target: c.slot,
        params: { garbageReduce: rules.grace.garbageReduce,
          gaugeMultiplier: rules.grace.gaugeMultiplier }, verseRef: null,
      });
    }
    sendStatus(ctx, state);
  }
  m.hooks.onRoundStart(m.round, m.seed, stage);
  m.timers.push(ctx.schedule(rules.match.countdownMs, () => {
    if (m.phase !== "countdown") return;
    m.phase = "active";
    if (m.matchStartedAt === null) m.matchStartedAt = ctx.now();
    if (isVersus(m)) scheduleAutoQuiz(ctx, m, quizHooks(ctx, m));
  }));
}

/**
 * API-018 `topout`: 대전 → 보낸 쪽 라운드 패배 (UC-015 E1 같은 처리 단위면 먼저 도착한 쪽 — 이미 끝난 라운드는 NOT_ACTIVE),
 * 연습 → 세션 종료 (voluntary=true "그만하기" 허용, 대전에서는 MODE_FORBIDDEN).
 */
export function handleTopout(ctx: RoomContext, m: MatchState, slot: Slot,
  voluntary: boolean): { ok: true } | { ok: false; code: "NOT_ACTIVE" | "MODE_FORBIDDEN" } {
  if (voluntary && isVersus(m)) return { ok: false, code: "MODE_FORBIDDEN" };
  if (!isVersus(m)) {
    if (m.phase !== "active" && m.phase !== "countdown") return { ok: false, code: "NOT_ACTIVE" };
    endMatch(ctx, m, { winnerSlot: null, reason: "topout", voided: false });
    return { ok: true };
  }
  if (m.phase !== "active") return { ok: false, code: "NOT_ACTIVE" };
  const winner = opponentOf(m, slot);
  if (!winner) return { ok: false, code: "NOT_ACTIVE" };
  endRound(ctx, m, winner.slot);
  return { ok: true };
}

/** 라운드 종료 (API-029): 승수·연속 패배·끝낸 라운드 갱신 → roundsToWin이면 경기 끝, 아니면 nextRoundDelayMs 뒤 새 라운드 */
function endRound(ctx: RoomContext, m: MatchState, winnerSlot: Slot): void {
  const rules = ctx.rules;
  stopRound(m);
  noteRoundResult(m, winnerSlot);
  m.wins.set(winnerSlot, (m.wins.get(winnerSlot) ?? 0) + 1);
  const matchOver = (m.wins.get(winnerSlot) ?? 0) >= rules.match.roundsToWin;
  ctx.broadcast("roundEnd", {
    round: m.round, winnerSlot, wins: winsArray(m), reason: "topout",
    nextRoundInMs: matchOver ? null : rules.match.nextRoundDelayMs,
  });
  if (matchOver) {
    endMatch(ctx, m, { winnerSlot, reason: "topout", voided: false });
    return;
  }
  m.phase = "between";
  m.timers.push(ctx.schedule(rules.match.nextRoundDelayMs, () => {
    if (m.phase === "between") startRound(ctx, m);
  }));
}

/** 라운드 결과 기록 — 승자 연속 패배 0, 패자 +1, 양측 끝낸 라운드 +1 (TBL-004 원천) */
function noteRoundResult(m: MatchState, winnerSlot: Slot): void {
  m.roundWinners.push(winnerSlot);
  for (const c of m.config.slots) {
    m.roundsFinished.set(c.slot, (m.roundsFinished.get(c.slot) ?? 0) + 1);
    m.lossStreak.set(c.slot, c.slot === winnerSlot ? 0 : (m.lossStreak.get(c.slot) ?? 0) + 1);
  }
}

/** API-029·API-030 `wins` 배열 [슬롯1, 슬롯2] */
export function winsArray(m: MatchState): number[] {
  return [m.wins.get(1) ?? 0, m.wins.get(2) ?? 0];
}

/**
 * 소켓 종료 (FR-009, UC-016): 시작 전이면 무효, 연습이면 세션 종료, 대전이면 남은 쪽(봇 포함) 경기 승리 —
 * 진행 중이던 라운드는 이탈자 패배로 센다. 남은 사람이 없으면 무효 (UC-016 E1).
 */
export function handleDisconnect(ctx: RoomContext, m: MatchState, slot: Slot): void {
  m.connected.delete(slot);
  if (m.phase === "ended") return;
  if (m.round === 0) {
    endMatch(ctx, m, { winnerSlot: null, reason: "disconnect", voided: true });
    return;
  }
  if (!isVersus(m)) {
    endMatch(ctx, m, { winnerSlot: null, reason: "topout", voided: false });
    return;
  }
  const other = opponentOf(m, slot);
  if (!other || !m.connected.has(other.slot)) {
    endMatch(ctx, m, { winnerSlot: null, reason: "disconnect", voided: true });
    return;
  }
  if (m.phase !== "between") noteRoundResult(m, other.slot);
  endMatch(ctx, m, { winnerSlot: other.slot, reason: "disconnect", voided: false });
}

/** 봇 처리 중 서버 오류 (UC-005 E2) — 무효 */
export function abortMatch(ctx: RoomContext, m: MatchState): void {
  if (m.phase !== "ended") endMatch(ctx, m, { winnerSlot: null, reason: "disconnect", voided: true });
}

/** 경기 끝 — 모든 타이머 정리 후 훅 (기록·matchEnd는 results.finishMatch) */
function endMatch(ctx: RoomContext, m: MatchState, end: MatchEnd): void {
  stopRound(m);
  m.phase = "ended";
  m.endedAt = ctx.now();
  m.end = end;
  m.hooks.onEnd(end);
}

/** 진행 중 라운드의 타이머·대결·대기 공격 정리 */
function stopRound(m: MatchState): void {
  clearTimers(m);
  cancelQuiz(m);
  for (const s of m.slots.values()) cancelAllPending(s);
  m.pausedAt = null;
}

function clearTimers(m: MatchState): void {
  for (const cancel of m.timers.splice(0)) cancel();
}

/** FR-007 경기 시간 — 첫 카운트다운 종료부터 경기 끝까지 (TBL-002 duration_ms) */
export function matchDurationMs(m: MatchState): number {
  if (m.matchStartedAt === null) return 0;
  return Math.max(0, (m.endedAt ?? m.matchStartedAt) - m.matchStartedAt);
}
