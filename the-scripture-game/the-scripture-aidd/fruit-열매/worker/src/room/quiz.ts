// quiz.ts — 말씀 대결 수명주기·판정·보상 결정만 (봇 응답은 주입된 콜백)
// TASK-017 | REQ-011 FR-022 FR-040 FR-041 FR-042 FR-043 C-003 | ARCH-011 | API-016 API-026 API-027 | TBL-016 TBL-017
// TBL-018 `quiz`
// UC-013 | OQ #13 #21 | architecture §8.3
// 서버 도착 순서로 판정: 첫 정답 도착자 = 승자. 둘 다 맞혔으면 늦은 쪽 도착까지(최대 timeLimitMs) 기다려 gapMs 계산 (API-027).
// 정지·재개(보드 멈춤)는 match-flow가 hooks로 받는다.
import { armor as armorContent, quiz as quizContent, type QuizItem } from "../content";
import type { Slot } from "../storage/adapter";
import { addArmor, addGauge, sendStatus, type RoomContext, type SlotState } from "./player-state";

interface SlotAnswer {
  lockedUntil: number;
  answered: boolean;
  correctAt: number | null;
}

/** 진행 중인 말씀 대결 1건 */
export interface QuizState {
  item: QuizItem;
  openedAt: number;
  deadline: number;
  answers: Map<Slot, SlotAnswer>;
  winnerSlot: Slot | null;
  done: boolean;
  timers: Array<() => void>;
}

/** quiz.ts가 쓰는 방 상태 (match-flow MatchState의 부분) */
export interface QuizRoom {
  slots: Map<Slot, SlotState>;
  quiz: QuizState | null;
  usedQuizIds: Set<string>;
  autoQuizCancel: (() => void) | null;
}

/** match-flow·봇이 주입하는 훅 */
export interface QuizHooks {
  /** FR-041 두 보드 정지 */
  pause(): void;
  /** 재개 (resumeDelayMs 뒤) */
  resume(): void;
  /** FR-022 봇 응답 계획 — 봇 슬롯별 {지연 ms, 보기} (사람만이면 빈 배열) */
  botAnswers(item: QuizItem): Array<{ slot: Slot; delayMs: number; choice: number }>;
}

export type AnswerResult =
  | { ok: true }
  | { ok: false; code: "QUIZ_WRONG" | "QUIZ_LOCKED" | "QUIZ_CLOSED"; retryInMs: number | null };

/** 아직 안 낸 문항 중 무작위 (전부 냈으면 다시 처음부터) */
function pickItem(ctx: RoomContext, room: QuizRoom): QuizItem {
  let pool = quizContent.filter((q) => !room.usedQuizIds.has(q.id));
  if (pool.length === 0) {
    room.usedQuizIds.clear();
    pool = quizContent.slice();
  }
  const item = pool[Math.min(pool.length - 1, Math.floor(ctx.random() * pool.length))];
  room.usedQuizIds.add(item.id);
  return item;
}

/**
 * FR-040 말씀 대결 열기 (말씀 칸 삭제 또는 90초 자동). 이미 진행 중이면 무시(null).
 * 양측에 API-026 `quiz`(정답 인덱스 제외 — TBL-017), timeLimitMs 마감 타이머, 봇 응답 예약.
 */
export function openQuiz(ctx: RoomContext, room: QuizRoom, hooks: QuizHooks): QuizState | null {
  if (room.quiz && !room.quiz.done) return null;
  room.autoQuizCancel?.();
  room.autoQuizCancel = null;
  const now = ctx.now();
  const q = ctx.rules.quiz;
  const item = pickItem(ctx, room);
  const state: QuizState = { item, openedAt: now, deadline: now + q.timeLimitMs, answers: new Map(), winnerSlot: null,
    done: false, timers: [] };
  for (const slot of room.slots.keys()) state.answers.set(slot, { lockedUntil: 0, answered: false, correctAt: null });
  room.quiz = state;
  hooks.pause();
  ctx.broadcast("quiz", {
    quizId: item.id, type: item.type, difficulty: item.difficulty, question: item.question_ko,
    choices: item.choices.slice(), timeLimitMs: q.timeLimitMs,
  });
  state.timers.push(ctx.schedule(q.timeLimitMs, () => resolveQuiz(ctx, room, hooks)));
  // FR-022 봇이 난이도별 정답률·응답 시간으로 답한다 — 사람과 같은 answerQuiz 경로
  for (const plan of hooks.botAnswers(item)) {
    state.timers.push(ctx.schedule(plan.delayMs, () => { answerQuiz(ctx, room, plan.slot, item.id, plan.choice,
      hooks); }));
  }
  return state;
}

/**
 * API-016 `answer` 판정. 오답 → wrongLockMs 잠금(QUIZ_WRONG, UC-013 E1), 잠금 중 → QUIZ_LOCKED,
 * 마감 후·다른 문제·이미 판정·이미 정답 → QUIZ_CLOSED (UC-013 E3).
 */
export function answerQuiz(ctx: RoomContext, room: QuizRoom, slot: Slot, quizId: string, choice: number,
  hooks: QuizHooks): AnswerResult {
  const state = room.quiz;
  const now = ctx.now();
  const answer = state?.answers.get(slot);
  if (!state || state.done || state.item.id !== quizId || now > state.deadline || !answer
    || answer.correctAt !== null) {
    return { ok: false, code: "QUIZ_CLOSED", retryInMs: null };
  }
  if (now < answer.lockedUntil) return { ok: false, code: "QUIZ_LOCKED", retryInMs: answer.lockedUntil - now };
  const player = room.slots.get(slot)!;
  // TBL-003 quiz_answered = 참여(1회 이상 선택) 수
  if (!answer.answered) player.totals.quizAnswered += 1;
  answer.answered = true;
  if (choice !== state.item.answer) {
    answer.lockedUntil = now + ctx.rules.quiz.wrongLockMs;
    return { ok: false, code: "QUIZ_WRONG", retryInMs: ctx.rules.quiz.wrongLockMs };
  }
  // TBL-003 quiz_correct = 정답 선택 수 (먼저 맞힘 여부와 무관)
  player.totals.quizCorrect += 1;
  answer.correctAt = now;
  if (state.winnerSlot === null) state.winnerSlot = slot;
  // 모두 정답이면 바로 판정 (늦은 쪽 gapMs 확정), 아니면 마감까지 다른 쪽 도착을 기다린다 (API-027 검증 규칙)
  if ([...state.answers.values()].every((a) => a.correctAt !== null)) resolveQuiz(ctx, room, hooks);
  return { ok: true };
}

/**
 * 판정 확정 (API-027): 승자 보상 = 서버 무작위 gaugeRewardChance → 게이지 +quizReward, 아니면 무작위 갑주 (OQ #13).
 * 늦게 맞힌 쪽에만 gapMs (FR-042 니어미스). resumeDelayMs 뒤 동시 재개, 이후 autoIntervalMs 자동 대결 예약은 match-flow.
 */
export function resolveQuiz(ctx: RoomContext, room: QuizRoom, hooks: QuizHooks): void {
  const state = room.quiz;
  if (!state || state.done) return;
  state.done = true;
  for (const cancel of state.timers) cancel();
  const q = ctx.rules.quiz;
  let reward: { kind: "gauge"; amount: number } | { kind: "armor"; armorId: string } | null = null;
  const winner = state.winnerSlot !== null ? room.slots.get(state.winnerSlot) ?? null : null;
  if (winner) {
    if (ctx.random() < q.gaugeRewardChance) {
      addGauge(winner, ctx.rules.gauge.quizReward, ctx.rules);
      reward = { kind: "gauge", amount: ctx.rules.gauge.quizReward };
    } else {
      const armorId = armorContent[Math.min(armorContent.length - 1,
        Math.floor(ctx.random() * armorContent.length))].id;
      addArmor(winner, armorId);
      reward = { kind: "armor", armorId };
    }
  }
  const winnerAt = state.winnerSlot !== null ? state.answers.get(state.winnerSlot)?.correctAt ?? null : null;
  for (const [slot, answer] of state.answers) {
    const late = winnerAt !== null && slot !== state.winnerSlot && answer.correctAt !== null;
    ctx.send(slot, "quizResult", {
      quizId: state.item.id, correctIndex: state.item.answer, winnerSlot: state.winnerSlot, reward,
      verseRef: state.item.verse_ref, gapMs: late ? (answer.correctAt as number) - (winnerAt as number) : null,
      resumeInMs: q.resumeDelayMs,
    });
  }
  if (winner) sendStatus(ctx, winner);
  state.timers = [ctx.schedule(q.resumeDelayMs, () => {
    room.quiz = null;
    hooks.resume();
  })];
}

/** 대결 취소 (UC-013 E2 상대 이탈 · 라운드 종료) — 결과 없이 타이머만 정리 */
export function cancelQuiz(room: QuizRoom): void {
  if (room.quiz) for (const cancel of room.quiz.timers) cancel();
  room.quiz = null;
  room.autoQuizCancel?.();
  room.autoQuizCancel = null;
}

/** OQ #21 라운드 시작·직전 대결 종료 후 autoIntervalMs 자동 대결 예약 (대전 전용 — 호출자가 판단) */
export function scheduleAutoQuiz(ctx: RoomContext, room: QuizRoom, hooks: QuizHooks): void {
  room.autoQuizCancel?.();
  room.autoQuizCancel = ctx.schedule(ctx.rules.quiz.autoIntervalMs, () => {
    room.autoQuizCancel = null;
    openQuiz(ctx, room, hooks);
  });
}
