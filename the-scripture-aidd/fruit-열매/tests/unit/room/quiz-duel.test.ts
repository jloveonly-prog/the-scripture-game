// TASK-022 · FR-075 · FR-040~043 · FR-022 · FR-063 · R-11 — 말씀 대결 도착순·3초 잠금·니어미스·보상·동시 정지/재개, 대표 구절 검사.
import { describe, expect, it, vi } from 'vitest';
import type { QuizDef } from '../../../worker/src/content.ts';

const QUIZ: QuizDef = {
  id: 'q901', type: 'person', difficulty: 1, question: '골리앗을 쓰러뜨린 사람은?', choices: ['다윗', '사울', '요나단', '사무엘'],
  answer: 0, verseRef: '1 Samuel 17:49', explanation: '다윗이 물맷돌로 골리앗을 쳤다.',
};
vi.mock('../../../worker/src/content.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../worker/src/content.ts')>();
  return { ...actual, quiz: [QUIZ] };
});

const { createQuizState, judgeAnswer, nearMissDeltaMs, pickQuiz, startQuiz, submitQuizAnswer, finalizeQuiz, resumeAfterQuiz, onBotQuizTimer, cancelQuiz } =
  await import('../../../worker/src/room/quiz-duel.ts');
const { createRoomState } = await import('../../../worker/src/room/room-state.ts');
const { createRoomTimers } = await import('../../../worker/src/room/timers.ts');
const { tryApplySpirit } = await import('../../../worker/src/room/interference.ts');
const { spiritsById } = await import('../../../worker/src/content.ts');
const { selectRepresentativeVerse, VICTORY_VERSE_REF } = await import('../../../worker/src/room/representative-verse.ts');

type Sent = { slot: number; type: string; data?: Record<string, any>; error?: Record<string, any> };

function makeCtx(opts: { bot?: boolean; rand?: number } = {}) {
  const sent: Sent[] = [];
  const bot = { tick: vi.fn(() => []), receiveAttack: vi.fn(), applyEffect: vi.fn(), freeze: vi.fn(), resume: vi.fn(), toppedOut: false };
  const room = createRoomState({
    roomId: 'room-1', mode: opts.bot ? 'bot' : 'random', botLevel: opts.bot ? 'normal' : null, createdAt: 0,
    roster: [
      { slot: 1, guestId: 'guest-one', nickname: 'A', heroId: 'david', isBot: false, botLevel: null, rating: 1000, roundsPlayed: 0, lossStreak: 0 },
      opts.bot
        ? { slot: 2, guestId: null, nickname: null, heroId: 'paul', isBot: true, botLevel: 'normal', rating: null, roundsPlayed: 0, lossStreak: 0 }
        : { slot: 2, guestId: 'guest-two', nickname: 'B', heroId: 'peter', isBot: false, botLevel: null, rating: 1000, roundsPlayed: 0, lossStreak: 0 },
    ],
  });
  room.phase = 'playing';
  if (opts.bot) room.bot = bot;
  const timers = createRoomTimers(() => undefined);
  const deps = {
    send: (slot: 1 | 2, frame: string) => sent.push({ slot, ...JSON.parse(frame) }),
    closeAll: vi.fn(), timers, rand: () => opts.rand ?? 0.9, randomSeed: () => 1,
    createBot: vi.fn(() => bot), planBotQuizAnswer: vi.fn(() => ({ choice: 0 as const, delayMs: 2000 })),
    recordMatch: vi.fn(), recordPractice: vi.fn(), roomClosed: vi.fn(), log: vi.fn(),
  };
  return { ctx: { room, deps } as any, sent, bot, timers };
}

describe('판정 (순수 — R-11, FR-041·FR-042)', () => {
  it('오답 → 3초 잠금, 잠금 중 재응답 거부, 잠금 후 정답', () => {
    const s = createQuizState(QUIZ, 'timer', 0);
    expect(judgeAnswer(s, 1, 'q901', 2, 1000)).toEqual({ ok: true, kind: 'locked', lockedMs: 3000 });
    expect(judgeAnswer(s, 1, 'q901', 0, 2500)).toEqual({ ok: false, code: 'QUIZ_LOCKED', retryAfterMs: 1500 });
    expect(judgeAnswer(s, 1, 'q901', 0, 4000)).toEqual({ ok: true, kind: 'correct', first: true });
    expect(judgeAnswer(s, 1, 'q901', 0, 4100)).toEqual({ ok: false, code: 'QUIZ_ALREADY_ANSWERED' });
  });

  it('도착순: 첫 정답자가 승자, 늦은 정답과의 차이 = 니어미스 deltaMs', () => {
    const s = createQuizState(QUIZ, 'wordBlock', 0);
    judgeAnswer(s, 2, 'q901', 0, 3000);
    expect(judgeAnswer(s, 1, 'q901', 0, 3120)).toEqual({ ok: true, kind: 'correct', first: false });
    expect(s.winnerSlot).toBe(2);
    expect(nearMissDeltaMs(s)).toBe(120);
  });

  it('마감 후·다른 문항·대결 없음 → QUIZ_CLOSED', () => {
    const s = createQuizState(QUIZ, 'timer', 0);
    expect(judgeAnswer(s, 1, 'q901', 0, 10001)).toEqual({ ok: false, code: 'QUIZ_CLOSED' });
    expect(judgeAnswer(s, 1, 'q902', 0, 100)).toEqual({ ok: false, code: 'QUIZ_CLOSED' });
    expect(judgeAnswer(null, 1, 'q901', 0, 100)).toEqual({ ok: false, code: 'QUIZ_CLOSED' });
  });

  it('출제: 문항 은행이 비면 null', () => {
    expect(pickQuiz(() => 0.5, [])).toBeNull();
    expect(pickQuiz(() => 0.5)?.id).toBe('q901');
  });
});

describe('진행 (FR-040·FR-041)', () => {
  it('개시: 양측 동시 송신(정답 미포함)·정지, 연습은 열리지 않는다', () => {
    const { ctx, sent } = makeCtx();
    expect(startQuiz(ctx, 'wordBlock', 1000)).toBe(true);
    expect(ctx.room.phase).toBe('quiz');
    const starts = sent.filter((m) => m.type === 'quizStart');
    expect(starts.map((m) => m.slot)).toEqual([1, 2]);
    expect(starts[0].data).toMatchObject({ quizId: 'q901', timeLimitMs: 10000, deadlineAt: 11000, trigger: 'wordBlock' });
    expect(starts[0].data).not.toHaveProperty('answer');
    expect(startQuiz(ctx, 'timer', 1500)).toBe(false);
    const practice = makeCtx();
    practice.ctx.room.mode = 'practice';
    expect(startQuiz(practice.ctx, 'timer', 0)).toBe(false);
  });

  it('둘 다 정답 → 마감 전 확정, 보상(게이지 +50)·니어미스·resumeAt, 재개 시 정지 시간만큼 시계 이동', () => {
    const { ctx, sent, timers } = makeCtx({ rand: 0.9 });
    tryApplySpirit(ctx.room.players[1].interference, spiritsById.get('jezebel')!, 1, 500);
    startQuiz(ctx, 'timer', 1000);
    submitQuizAnswer(ctx, 2, 'q901', 3, 1500);
    expect(sent.find((m) => m.type === 'quizLock')).toMatchObject({ slot: 2, data: { quizId: 'q901', lockedMs: 3000 } });
    submitQuizAnswer(ctx, 1, 'q901', 0, 2000);
    expect(sent.some((m) => m.type === 'quizResult')).toBe(false);
    submitQuizAnswer(ctx, 2, 'q901', 0, 4620);
    const result = sent.find((m) => m.type === 'quizResult')!;
    expect(result.data).toMatchObject({ winnerSlot: 1, correctIndex: 0, reward: { type: 'faith', amount: 50 }, deltaMs: 2620, resumeAt: 7620 });
    expect(ctx.room.players[0].faith.faith).toBe(50);
    expect(ctx.room.players[0].stats).toMatchObject({ quizAnswered: 1, quizCorrect: 1 });
    expect(ctx.room.quizCount).toBe(1);
    expect(timers.at('quizResume')).toBe(7620);
    resumeAfterQuiz(ctx, 7620);
    expect(ctx.room.phase).toBe('playing');
    expect(ctx.room.players[1].interference.active[0].endsAt).toBe(6500 + 6620);
    expect(timers.at('autoQuiz')).toBe(7620 + 90000);
  });

  it('보상 50%: 갑주 쪽이면 미보유 갑주 1개, 아무도 못 맞히면 보상 없음', () => {
    const { ctx, sent } = makeCtx({ rand: 0.1 });
    startQuiz(ctx, 'timer', 0);
    submitQuizAnswer(ctx, 1, 'q901', 0, 100);
    finalizeQuiz(ctx, 10000);
    const reward = sent.find((m) => m.type === 'quizResult')!.data!.reward;
    expect(reward.type).toBe('armor');
    expect(ctx.room.players[0].armor.owned).toEqual([reward.armorId]);
    const none = makeCtx();
    startQuiz(none.ctx, 'timer', 0);
    finalizeQuiz(none.ctx, 10000);
    expect(none.sent.find((m) => m.type === 'quizResult')!.data).toMatchObject({ winnerSlot: null, reward: null, deltaMs: null });
  });

  it('봇 대전: 봇 정지·응답 예약(FR-022), 같은 도착순 규칙', () => {
    const { ctx, sent, bot, timers } = makeCtx({ bot: true });
    startQuiz(ctx, 'timer', 0);
    expect(bot.freeze).toHaveBeenCalledWith(0);
    expect(timers.at('botQuiz')).toBe(2000);
    onBotQuizTimer(ctx, 2000);
    submitQuizAnswer(ctx, 1, 'q901', 0, 2050);
    expect(sent.find((m) => m.type === 'quizResult')!.data).toMatchObject({ winnerSlot: 2, deltaMs: 50 });
    resumeAfterQuiz(ctx, 5050);
    expect(bot.resume).toHaveBeenCalledWith(5050);
  });

  it('잠금 중 응답은 QUIZ_LOCKED error, 취소 후 응답은 QUIZ_CLOSED', () => {
    const { ctx, sent } = makeCtx();
    startQuiz(ctx, 'timer', 0);
    submitQuizAnswer(ctx, 1, 'q901', 1, 100);
    submitQuizAnswer(ctx, 1, 'q901', 0, 200);
    expect(sent.at(-1)).toMatchObject({ type: 'error', error: { code: 'QUIZ_LOCKED', ref: 'quizAnswer', retryAfterMs: 2900 } });
    cancelQuiz(ctx);
    submitQuizAnswer(ctx, 1, 'q901', 0, 300);
    expect(sent.at(-1)).toMatchObject({ type: 'error', error: { code: 'QUIZ_CLOSED' } });
  });
});

describe('대표 구절 (FR-063, architecture §11 #14)', () => {
  it('예수님 이벤트 → John 16:33, 아니면 최다 발동 항목 구절, 없으면 내 위인 구절', () => {
    expect(selectRepresentativeVerse({ jesusEvent: true, usage: { 'angel:michael': 3 }, heroId: 'david' })).toBe('John 16:33');
    expect(selectRepresentativeVerse({ jesusEvent: false, usage: { 'hero:david': 1, 'armor:shield_of_faith': 2 }, heroId: 'david' })).toBe('Ephesians 6:16');
    expect(selectRepresentativeVerse({ jesusEvent: false, usage: { 'angel:gabriel': 2, 'hero:paul': 2 }, heroId: 'david' })).toBe('Luke 1:19');
    expect(selectRepresentativeVerse({ jesusEvent: false, usage: {}, heroId: 'peter' })).toBe('Matthew 16:18');
    expect(VICTORY_VERSE_REF).toBe('2 Timothy 4:7');
  });
});
