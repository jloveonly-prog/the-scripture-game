// TASK-022 · FR-040 · FR-041 · FR-042 · FR-043 · FR-022 · REQ-011 · R-11 · D-19 · OQ #13 · OQ #21 — 말씀 대결 진행·판정.
// 단일 책임: 트리거(말씀 칸·90초) → 동시 정지·출제(정답 미포함) → 서버 수신 시각 도착순 판정·3초 잠금 → 보상·니어미스 → 동시 재개.
import { balance, getVerse, quiz as quizBank, type QuizDef } from '../content';
import { acquireArmor, randomUnownedArmor } from './armor';
import { addFaith } from './faith';
import {
  broadcast, humans, isPractice, playerAt, scheduleSpiritExpiry, sendError, sendMessage, sendStatus, shiftPlayerClocks,
  type RoomContext, type SlotNo,
} from './room-state';

type QuizCfg = typeof balance.quiz;
export type QuizTrigger = 'wordBlock' | 'timer';

export interface QuizState {
  quiz: QuizDef;
  trigger: QuizTrigger;
  startedAt: number;
  deadlineAt: number;
  /** 서버 수신 시각 기준 정답 도착 시각 */
  correctAt: Partial<Record<SlotNo, number>>;
  answered: Partial<Record<SlotNo, boolean>>;
  lockedUntil: Partial<Record<SlotNo, number>>;
  winnerSlot: SlotNo | null;
  finalized: boolean;
  resumeAt: number | null;
  botChoice: number | null;
}

export type AnswerOutcome =
  | { ok: true; kind: 'locked'; lockedMs: number }
  | { ok: true; kind: 'correct'; first: boolean }
  | { ok: false; code: 'QUIZ_CLOSED' | 'QUIZ_ALREADY_ANSWERED' }
  | { ok: false; code: 'QUIZ_LOCKED'; retryAfterMs: number };

// FR-043 출제 (서버 난수 스트림에서 무작위 — 중복 방지는 N-05 보존으로 미구현)
export function pickQuiz(rand: () => number, bank: readonly QuizDef[] = quizBank): QuizDef | null {
  return bank.length === 0 ? null : bank[Math.floor(rand() * bank.length)];
}

// FR-041 퀴즈 상태 생성 (순수)
export function createQuizState(quiz: QuizDef, trigger: QuizTrigger, now: number, cfg: QuizCfg = balance.quiz): QuizState {
  return {
    quiz, trigger, startedAt: now, deadlineAt: now + cfg.timeLimitMs, correctAt: {}, answered: {}, lockedUntil: {},
    winnerSlot: null, finalized: false, resumeAt: null, botChoice: null,
  };
}

// FR-041 R-11 응답 판정 (순수 — 도착순은 서버 수신 시각 now)
export function judgeAnswer(state: QuizState | null, slot: SlotNo, quizId: string, choice: number, now: number, cfg: QuizCfg = balance.quiz): AnswerOutcome {
  if (!state || state.finalized || now > state.deadlineAt || state.quiz.id !== quizId) return { ok: false, code: 'QUIZ_CLOSED' };
  if (state.correctAt[slot] !== undefined) return { ok: false, code: 'QUIZ_ALREADY_ANSWERED' };
  const lock = state.lockedUntil[slot] ?? 0;
  if (lock > now) return { ok: false, code: 'QUIZ_LOCKED', retryAfterMs: lock - now };
  state.answered[slot] = true;
  if (choice !== state.quiz.answer) {
    state.lockedUntil[slot] = now + cfg.wrongLockMs;
    return { ok: true, kind: 'locked', lockedMs: cfg.wrongLockMs };
  }
  state.correctAt[slot] = now;
  const first = state.winnerSlot === null;
  if (first) state.winnerSlot = slot;
  return { ok: true, kind: 'correct', first };
}

// FR-042 니어미스: 둘 다 정답이면 도착 시간 차 (아니면 null)
export function nearMissDeltaMs(state: QuizState): number | null {
  const times = Object.values(state.correctAt).filter((t): t is number => typeof t === 'number');
  return times.length >= 2 ? Math.max(...times) - Math.min(...times) : null;
}

// FR-040 말씀 대결 개시 — 대전(사람·봇) 전용, 진행 중일 때만. 두 보드 동시 정지 (API-257, 정답 미포함)
export function startQuiz(ctx: RoomContext, trigger: QuizTrigger, now: number): boolean {
  const { room, deps } = ctx;
  if (isPractice(room) || room.phase !== 'playing' || room.quiz !== null) return false;
  const quiz = pickQuiz(deps.rand);
  if (!quiz) {
    deps.log('quiz-bank-empty', { roomId: room.roomId });
    deps.timers.schedule('autoQuiz', now + balance.quiz.autoIntervalMs);
    return false;
  }
  const state = createQuizState(quiz, trigger, now);
  room.quiz = state;
  room.phase = 'quiz';
  deps.timers.cancel('autoQuiz');
  deps.timers.cancel('spirits');
  deps.timers.schedule('quizDeadline', state.deadlineAt);
  broadcast(ctx, 'quizStart', {
    quizId: quiz.id, type: quiz.type, difficulty: quiz.difficulty, question: quiz.question, choices: [...quiz.choices],
    timeLimitMs: balance.quiz.timeLimitMs, deadlineAt: state.deadlineAt, trigger,
  });
  const botPlayer = room.players.find((p) => p.isBot);
  if (room.bot && botPlayer?.botLevel) {
    room.bot.freeze(now);
    // FR-022 봇 응답 예약 (난이도별 정답률·응답 시간 — 유다 planBotQuizAnswer)
    const plan = deps.planBotQuizAnswer(botPlayer.botLevel, quiz.answer, deps.rand);
    state.botChoice = plan.choice;
    if (now + plan.delayMs <= state.deadlineAt) deps.timers.schedule('botQuiz', now + plan.delayMs);
  }
  return true;
}

/** 모든 참가자가 정답을 냈으면 마감을 기다리지 않는다 */
function everyoneCorrect(ctx: RoomContext, state: QuizState): boolean {
  return ctx.room.players.every((p) => state.correctAt[p.slot] !== undefined);
}

// FR-041 응답 처리 (API-208) — 오답 → quizLock, 거부 → error
export function submitQuizAnswer(ctx: RoomContext, slot: SlotNo, quizId: string, choice: number, now: number): void {
  const state = ctx.room.quiz;
  const outcome = judgeAnswer(state, slot, quizId, choice, now);
  if (!outcome.ok) {
    if (!playerAt(ctx.room, slot)?.isBot) sendError(ctx, slot, outcome.code, 'quizAnswer', 'retryAfterMs' in outcome ? outcome.retryAfterMs : undefined);
    return;
  }
  if (outcome.kind === 'locked') {
    if (!playerAt(ctx.room, slot)?.isBot) sendMessage(ctx, slot, 'quizLock', { quizId, lockedMs: outcome.lockedMs });
    return;
  }
  if (state && everyoneCorrect(ctx, state)) finalizeQuiz(ctx, now);
}

// FR-022 봇 응답 타이머
export function onBotQuizTimer(ctx: RoomContext, now: number): void {
  const state = ctx.room.quiz;
  const bot = ctx.room.players.find((p) => p.isBot);
  if (!state || !bot || state.botChoice === null) return;
  submitQuizAnswer(ctx, bot.slot, state.quiz.id, state.botChoice, now);
}

// FR-041·FR-042·OQ #13 판정 확정 → 보상(게이지 +50 / 무작위 갑주 각 50%, 6종 보유면 게이지) → API-259 → resumeAt 예약
export function finalizeQuiz(ctx: RoomContext, now: number): void {
  const { room, deps } = ctx;
  const state = room.quiz;
  if (!state || state.finalized) return;
  state.finalized = true;
  deps.timers.cancel('quizDeadline');
  deps.timers.cancel('botQuiz');
  const cfg = balance.quiz;
  let reward: Record<string, unknown> | null = null;
  const winner = state.winnerSlot === null ? undefined : playerAt(room, state.winnerSlot);
  if (winner) {
    const armorId = deps.rand() < cfg.rewardArmorChance ? randomUnownedArmor(winner.armor, deps.rand) : null;
    if (armorId !== null && acquireArmor(winner.armor, armorId)) reward = { type: 'armor', armorId };
    else {
      addFaith(winner.faith, cfg.rewardFaith);
      reward = { type: 'faith', amount: cfg.rewardFaith };
    }
  }
  for (const p of room.players) {
    if (state.answered[p.slot]) p.stats.quizAnswered += 1;
    if (state.correctAt[p.slot] !== undefined) p.stats.quizCorrect += 1;
  }
  room.quizCount += 1;
  state.resumeAt = now + cfg.resultShowMs;
  const verse = getVerse(state.quiz.verseRef) ?? { ref: state.quiz.verseRef, kjv: '', ko: '' };
  broadcast(ctx, 'quizResult', {
    quizId: state.quiz.id, correctIndex: state.quiz.answer, winnerSlot: state.winnerSlot, reward, deltaMs: nearMissDeltaMs(state),
    explanation: state.quiz.explanation, verse: { ref: verse.ref, kjv: verse.kjv, ko: verse.ko }, resumeAt: state.resumeAt,
  });
  if (winner) sendStatus(ctx, winner, now);
  deps.timers.schedule('quizResume', state.resumeAt);
}

// FR-041 resumeAt 도달 — 두 보드 동시 재개, 정지 시간만큼 시계 이동, 다음 자동 대결 90초 예약
export function resumeAfterQuiz(ctx: RoomContext, now: number): void {
  const { room, deps } = ctx;
  const state = room.quiz;
  if (!state) return;
  const paused = now - state.startedAt;
  for (const p of room.players) shiftPlayerClocks(p, paused, state.startedAt);
  room.quiz = null;
  room.phase = 'playing';
  room.bot?.resume(now);
  deps.timers.schedule('autoQuiz', now + balance.quiz.autoIntervalMs);
  scheduleSpiritExpiry(ctx);
  for (const p of humans(room)) sendStatus(ctx, p, now);
}

// FR-040 90초 자동 개시 타이머
export function onAutoQuizTimer(ctx: RoomContext, now: number): void {
  startQuiz(ctx, 'timer', now);
}

// UC-013 E2 라운드 종료·이탈 시 진행 중 대결 취소 (보상 없음)
export function cancelQuiz(ctx: RoomContext): void {
  const { timers } = ctx.deps;
  for (const key of ['quizDeadline', 'quizResume', 'botQuiz', 'autoQuiz'] as const) timers.cancel(key);
  ctx.room.quiz = null;
}
