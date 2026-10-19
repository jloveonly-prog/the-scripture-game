// TASK-090 · FR-021 · FR-032 · REQ-005 · devguide §7.4 — 통합 검사(여호수아): 실제 봇(유다 bot-player)의 출력이
// 실제 GameRoom 판정 파이프라인(에브라임 message-router → progress-guard R-02~R-07 → 공격 → 영)을 거부 없이 통과하는가.
// 사람 슬롯 1도 같은 엔진으로 움직이는 봇으로 대신해 사람 메시지 경로(state·clear·topout, attack·effect 수신)를 함께 태운다.
import { describe, expect, it, vi } from 'vitest';
import type { RosterEntry } from '../../../worker/src/env.ts';
import { createRoomState, type RoomContext } from '../../../worker/src/room/room-state.ts';
import { createRoomTimers, type TimerKey } from '../../../worker/src/room/timers.ts';
import { onBotTick, onSpiritsTimer, routeMessage } from '../../../worker/src/room/message-router.ts';
import { handleReady, onJoinTimeout, onNextRound, onRoundGo } from '../../../worker/src/room/round-flow.ts';
import { finalizeQuiz, onAutoQuizTimer, onBotQuizTimer, resumeAfterQuiz } from '../../../worker/src/room/quiz-duel.ts';
import { createBotPlayer, type BotPlayer } from '../../../worker/src/room/bot/bot-player.ts';
import { planBotQuizAnswer } from '../../../worker/src/room/bot/bot-quiz.ts';
import { mulberry32 } from '../../../client/js/engine/rng.js';

const STEP_MS = 50;
const human: RosterEntry = { slot: 1, guestId: 'guest-1-0000-0000', nickname: 'P1', heroId: 'david', isBot: false, botLevel: null, rating: 1000, roundsPlayed: 20, lossStreak: 0 };
const bot: RosterEntry = { slot: 2, guestId: null, nickname: null, heroId: 'paul', isBot: true, botLevel: 'hard', rating: null, roundsPlayed: 0, lossStreak: 0 };

function runMatch(maxMs: number, humanLevel: 'easy' | 'normal' | 'hard') {
  const timers = createRoomTimers(() => undefined);
  const room = createRoomState({ roomId: 'room-int', mode: 'bot', botLevel: 'hard', createdAt: 0, roster: [human, bot] });
  for (const p of room.players) { p.joined = true; p.connected = true; }
  const rand = mulberry32(12345);
  let seed = 777;
  const toHuman: Array<{ type: string; data?: Record<string, any>; error?: Record<string, any> }> = [];
  const log = vi.fn();
  const recordMatch = vi.fn(async () => ({ saved: true, slots: { 1: { ratingDelta: null, rating: null, record: { maxCombo: 0, attackPerMin: 0, quizAccuracy: 0, mode: 'bot' }, growth: null, achievements: [] }, 2: { ratingDelta: null, rating: null, record: { maxCombo: 0, attackPerMin: 0, quizAccuracy: 0, mode: 'bot' }, growth: null, achievements: [] } } }));
  const deps = {
    send: (slot: 1 | 2, frame: string) => { if (slot === 1) toHuman.push(JSON.parse(frame)); },
    closeAll: vi.fn(), timers, rand, randomSeed: () => (seed += 101),
    createBot: (init: Parameters<typeof createBotPlayer>[0]) => createBotPlayer(init), planBotQuizAnswer,
    recordMatch, recordPractice: vi.fn(), roomClosed: vi.fn(), log,
  };
  const ctx = { room, deps } as unknown as RoomContext;
  let me: BotPlayer | null = null; // 사람 대역 (클라이언트 엔진과 같은 game.js)
  let resumeMeAt: number | null = null;
  let read = 0;
  let socketSeq = 0;
  const dispatch = async (key: TimerKey, now: number) => {
    switch (key) {
      case 'joinTimeout': return onJoinTimeout(ctx);
      case 'roundGo': return onRoundGo(ctx, now);
      case 'nextRound': return onNextRound(ctx, now);
      case 'quizDeadline': return finalizeQuiz(ctx, now);
      case 'quizResume': return resumeAfterQuiz(ctx, now);
      case 'autoQuiz': return onAutoQuizTimer(ctx, now);
      case 'botQuiz': return onBotQuizTimer(ctx, now);
      case 'botTick': return onBotTick(ctx, now);
      case 'spirits': return onSpiritsTimer(ctx, now);
      default: return undefined;
    }
  };
  return (async () => {
    handleReady(ctx, 1, 0);
    for (let now = 0; now <= maxMs && room.phase !== 'ended'; now += STEP_MS) {
      for (const key of timers.takeDue(now)) await dispatch(key, now);
      // 사람 쪽 수신 메시지 → 사람 대역 엔진 (battle-controller가 하는 일의 판정 관련 부분만)
      for (; read < toHuman.length; read += 1) {
        const m = toHuman[read];
        if (m.type === 'start') me = createBotPlayer({ level: humanLevel, seed: m.data!.seed, stage: m.data!.stage, startAt: m.data!.startAt, matchElapsedMs: m.data!.matchElapsedMs });
        else if (m.type === 'attack') me?.receiveAttack(m.data as never);
        else if (m.type === 'effect' && m.data!.targetSlot === 1 && m.data!.kind !== 'spiritEnd') me?.applyEffect(m.data as never);
        else if (m.type === 'quizStart') me?.freeze(now);
        else if (m.type === 'quizResult') resumeMeAt = m.data!.resumeAt;
        else if (m.type === 'roundEnd') me = null;
      }
      if (resumeMeAt !== null && now >= resumeMeAt) { me?.resume(now); resumeMeAt = null; }
      if (me && (room.phase === 'playing' || room.phase === 'countdown')) {
        // 사람 소켓은 room-client.sendSequenced처럼 소켓 단위 seq를 이어 쓴다 (D4-17)
        for (const out of me.tick(now)) { socketSeq += 1; await routeMessage(ctx, 1, out.type, { ...out.data, seq: socketSeq }, now); }
      }
    }
    return { room, toHuman, log, recordMatch };
  })();
}

describe('통합: 봇 출력 ↔ 진행 검증 R-02~R-07 (TASK-090)', () => {
  it('봇 대 봇(사람 경로 포함) 경기 — clear·state·topout 거부 0건, 라운드가 진행되어 경기가 끝난다', async () => {
    const { room, toHuman, log, recordMatch } = await runMatch(20 * 60 * 1000, 'easy');
    const rejected = log.mock.calls.filter(([event]) => event === 'clear-rejected');
    expect(rejected).toEqual([]);
    const errors = toHuman.filter((m) => m.type === 'error').map((m) => m.error!.code);
    expect(errors.filter((c) => c === 'SEQ_REJECTED' || c === 'PROGRESS_REJECTED')).toEqual([]);
    expect(toHuman.filter((m) => m.type === 'roundEnd').length).toBeGreaterThanOrEqual(2);
    expect(room.phase).toBe('ended');
    expect(recordMatch).toHaveBeenCalledTimes(1);
    expect(log.mock.calls.filter(([event]) => event === 'bot-failure')).toEqual([]);
  }, 120000);
});
