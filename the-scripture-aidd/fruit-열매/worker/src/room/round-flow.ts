// TASK-023-2 · FR-005 · FR-007 · FR-009 · FR-010 · FR-023 · FR-047 · FR-062 · FR-067 · D-22 · D-23 — 라운드·경기 수명주기.
// 단일 책임: ready → start(같은 시드·단계·은혜·경과) → roundEnd → matchEnd, 이탈·입장 마감·연습 종료, 진행 기록 메모리 누적.
import { CLOSE_CODES } from '../../../client/js/net/protocol.js';
import type { MatchMode, PersonalRecord, SlotStats } from '../store/store';
import { balance } from '../content';
import { isGraceActive, nextLossStreak } from './grace';
import { cancelQuiz } from './quiz-duel';
import { selectRepresentativeVerse, VICTORY_VERSE_REF } from './representative-verse';
import {
  BOT_TICK_MS, broadcast, emptySlotStats, humans, isPractice, playerAt, resetPlayerForRound, sendError, sendMessage, sendStatus,
  type MatchOutcome, type PlayerState, type RoomContext, type SlotNo, type SlotOutcome, type SlotResult,
} from './room-state';
import { createSpecialsLedger, stageForRoundsPlayed } from './specials';

const MS_PER_MINUTE = 60000;
/** SlotStats.attackPerMin 표기 소수 1자리 (api-gate API-262 예시 6.3) */
const PER_MIN_DECIMALS = 10;

const allJoinedAndReady = (ctx: RoomContext): boolean => ctx.room.players.every((p) => p.joined && p.connected && p.ready);
export const allJoined = (ctx: RoomContext): boolean => ctx.room.players.every((p) => p.joined);

// FR-005 API-202 ready — 사람 전원 준비 시 1라운드 시작 (봇은 항상 준비됨)
export function handleReady(ctx: RoomContext, slot: SlotNo, now: number): void {
  const p = playerAt(ctx.room, slot);
  if (!p || ctx.room.phase !== 'waiting') {
    sendError(ctx, slot, 'GAME_NOT_RUNNING', 'ready');
    return;
  }
  p.ready = true;
  if (allJoinedAndReady(ctx)) startRound(ctx, now);
}

// FR-005·FR-010·FR-047·FR-062 API-252 라운드 시작: 같은 시드, 해금 단계(사람 중 낮은 쪽), 은혜(내 것만), 경기 경과
export function startRound(ctx: RoomContext, now: number): void {
  const { room, deps } = ctx;
  room.round += 1;
  const startAt = now + balance.match.countdownMs;
  if (room.matchStartAt === null) room.matchStartAt = startAt;
  const matchElapsedMs = startAt - room.matchStartAt;
  room.seed = deps.randomSeed() >>> 0;
  room.stage = Math.min(...humans(room).map((p) => stageForRoundsPlayed(p.roundsPlayed))) as 0 | 1 | 2;
  room.roundStartAt = startAt;
  room.phase = 'countdown';
  deps.timers.cancel('joinTimeout');
  for (const p of room.players) {
    resetPlayerForRound(p, startAt, !p.isBot && isGraceActive(p.lossStreak));
    p.specials = createSpecialsLedger(room.seed, room.mode, room.stage);
  }
  const bot = room.players.find((p) => p.isBot);
  room.bot = bot && bot.botLevel
    ? deps.createBot({ level: bot.botLevel, seed: room.seed, stage: room.stage, startAt, matchElapsedMs })
    : null;
  if (room.bot) deps.timers.schedule('botTick', now + BOT_TICK_MS);
  deps.timers.schedule('roundGo', startAt);
  for (const p of humans(room)) {
    sendMessage(ctx, p.slot, 'start', {
      round: room.round, seed: room.seed, countdown: balance.match.countdownMs, startAt, stage: room.stage, grace: p.grace,
      matchElapsedMs, score: [...room.score],
    });
    sendStatus(ctx, p, now);
  }
}

// FR-005 카운트다운 종료 → 진행, FR-040 자동 말씀 대결 90초 예약 (대전 전용)
export function onRoundGo(ctx: RoomContext, now: number): void {
  if (ctx.room.phase !== 'countdown') return;
  ctx.room.phase = 'playing';
  if (!isPractice(ctx.room)) ctx.deps.timers.schedule('autoQuiz', now + balance.quiz.autoIntervalMs);
}

// FR-007 roundEnd 결과 표시 후 다음 라운드 (새 시드)
export function onNextRound(ctx: RoomContext, now: number): void {
  if (ctx.room.phase === 'roundEnd') startRound(ctx, now);
}

const isRunning = (ctx: RoomContext): boolean => ['countdown', 'playing', 'quiz'].includes(ctx.room.phase);

function stopRoundTimers(ctx: RoomContext): void {
  cancelQuiz(ctx);
  for (const key of ['spirits', 'botTick', 'roundGo'] as const) ctx.deps.timers.cancel(key);
}

/** D-22 라운드 1판 누적 (판 수 +1, 사람은 연속 패배 갱신) */
function accountRound(ctx: RoomContext, winnerSlot: SlotNo | null): void {
  for (const p of ctx.room.players) {
    p.roundsPlayed += 1;
    p.roundsThisMatch += 1;
    if (!p.isBot && winnerSlot !== null) p.lossStreak = nextLossStreak(p.lossStreak, p.slot === winnerSlot);
  }
}

// FR-007·FR-023 API-207 topout — 대전: 상대가 라운드 승자 (먼저 도착한 쪽 패배 — UC-015 E1), 연습: 세션 종료
export async function handleTopout(ctx: RoomContext, slot: SlotNo, now: number): Promise<void> {
  if (isPractice(ctx.room)) {
    await endPractice(ctx, 'topout', now);
    return;
  }
  const winner = ctx.room.players.find((p) => p.slot !== slot);
  if (winner) await endRound(ctx, winner.slot, now);
}

// FR-007 API-261 라운드 종료 → 2승이면 API-262
export async function endRound(ctx: RoomContext, winnerSlot: SlotNo, now: number): Promise<void> {
  const { room, deps } = ctx;
  if (!isRunning(ctx)) return;
  stopRoundTimers(ctx);
  room.bot = null;
  room.score[winnerSlot - 1] += 1;
  room.rounds.push({ round: room.round, winnerSlot, durationMs: Math.max(0, now - room.roundStartAt) });
  accountRound(ctx, winnerSlot);
  const matchOver = room.score[winnerSlot - 1] >= balance.match.winsNeeded;
  const nextRoundAt = matchOver ? null : now + balance.match.roundResultMs;
  const stats: Record<string, unknown> = {};
  for (const p of room.players) stats[`p${p.slot}`] = { ...p.roundStats };
  room.phase = 'roundEnd';
  broadcast(ctx, 'roundEnd', { round: room.round, winnerSlot, reason: 'topout', score: [...room.score], stats, nextRoundAt });
  if (matchOver) await endMatch(ctx, winnerSlot, 'topout', now);
  else deps.timers.schedule('nextRound', nextRoundAt as number);
}

function finalizeStats(p: PlayerState, durationMs: number): SlotStats {
  const perMin = durationMs > 0 ? (p.stats.attackSent * MS_PER_MINUTE) / durationMs : 0;
  p.stats.attackPerMin = Math.round(perMin * PER_MIN_DECIMALS) / PER_MIN_DECIMALS;
  return { ...p.stats };
}

function fallbackRecord(stats: SlotStats, mode: MatchMode | 'practice', playTimeMs?: number): PersonalRecord {
  const quizAccuracy = stats.quizAnswered > 0 ? stats.quizCorrect / stats.quizAnswered : 0;
  const record: PersonalRecord = { maxCombo: stats.maxCombo, attackPerMin: stats.attackPerMin, quizAccuracy, mode };
  if (playTimeMs !== undefined) record.playTimeMs = playTimeMs;
  return record;
}

function closeRoom(ctx: RoomContext): void {
  ctx.room.phase = 'ended';
  ctx.room.closed = true;
  ctx.deps.timers.clear();
  ctx.deps.roomClosed();
  ctx.deps.closeAll(CLOSE_CODES.NORMAL, 'room closed');
}

// FR-007·FR-009·FR-063·FR-065~068 API-262 경기 종료 — 저장(record-match, D-20) 후 송신, 저장 실패여도 결과 표시 (UC-015 E2)
export async function endMatch(ctx: RoomContext, winnerSlot: SlotNo, reason: 'topout' | 'disconnect', now: number): Promise<void> {
  const { room, deps } = ctx;
  if (room.phase === 'ended' || isPractice(room)) return;
  stopRoundTimers(ctx);
  room.phase = 'ended';
  const durationMs = Math.max(0, now - (room.matchStartAt ?? now));
  const stats: Record<string, SlotStats> = {};
  for (const p of room.players) stats[`p${p.slot}`] = finalizeStats(p, durationMs);
  const jesusEvent = room.players.some((p) => p.jesusUsed);
  const verseFor = (p: PlayerState): string => selectRepresentativeVerse({ jesusEvent, usage: room.usage, heroId: p.heroId });
  const winner = playerAt(room, winnerSlot) as PlayerState;
  const slotOutcome = (p: PlayerState): SlotOutcome => ({
    slot: p.slot, guestId: p.guestId, heroId: p.heroId, isBot: p.isBot, botLevel: p.botLevel,
    ratingAtStart: p.ratingAtStart, roundsDelta: p.roundsThisMatch, lossStreak: p.isBot ? 0 : p.lossStreak,
  });
  const ordered = [...room.players].sort((a, b) => a.slot - b.slot);
  const outcome: MatchOutcome = {
    roomId: room.roomId, mode: room.mode as MatchMode, slots: [slotOutcome(ordered[0]), slotOutcome(ordered[1])], winnerSlot,
    score: [...room.score] as [number, number], endReason: reason, durationMs,
    stats: { p1: stats.p1, p2: stats.p2, rounds: [...room.rounds], quizCount: room.quizCount, verseRef: verseFor(winner) },
  };
  let result: { saved: boolean; slots: { 1: SlotResult; 2: SlotResult } } | null = null;
  try {
    result = await deps.recordMatch(outcome);
    deps.log(result.saved ? 'match-recorded' : 'match-record-failed', { roomId: room.roomId });
  } catch (err) {
    deps.log('match-record-failed', { roomId: room.roomId, error: err instanceof Error ? err.name : 'unknown' });
  }
  for (const p of humans(room)) {
    const r = result?.slots[p.slot];
    sendMessage(ctx, p.slot, 'matchEnd', {
      mode: room.mode, winnerSlot, reason, score: [...room.score], durationMs, stats: outcome.stats,
      ratingDelta: r?.ratingDelta ?? null, rating: r?.rating ?? null, record: r?.record ?? fallbackRecord(stats[`p${p.slot}`], room.mode as MatchMode),
      growth: r?.growth ?? null, achievements: r?.achievements ?? [], verseRef: verseFor(p),
      victoryVerseRef: p.slot === winnerSlot ? VICTORY_VERSE_REF : null, saved: result?.saved ?? false,
    });
  }
  closeRoom(ctx);
}

// FR-023·FR-067 연습 세션 종료 (topout·quit·이탈) — 진행 기록만 저장, API-262 mode practice
export async function endPractice(ctx: RoomContext, reason: 'topout' | 'practiceEnd', now: number): Promise<void> {
  const { room, deps } = ctx;
  if (room.phase === 'ended' || !isPractice(room)) return;
  stopRoundTimers(ctx);
  room.phase = 'ended';
  const p = humans(room)[0];
  const durationMs = Math.max(0, now - (room.matchStartAt ?? now));
  const stats = finalizeStats(p, durationMs);
  let result: { saved: boolean; record: PersonalRecord; growth: SlotResult['growth'] } | null = null;
  try {
    if (p.guestId) result = await deps.recordPractice({ guestId: p.guestId, roundsDelta: room.round > 0 ? 1 : 0, stats, playTimeMs: durationMs });
  } catch (err) {
    deps.log('practice-record-failed', { roomId: room.roomId, error: err instanceof Error ? err.name : 'unknown' });
  }
  const verseRef = selectRepresentativeVerse({ jesusEvent: false, usage: room.usage, heroId: p.heroId });
  sendMessage(ctx, p.slot, 'matchEnd', {
    mode: room.mode, winnerSlot: null, reason, score: [...room.score], durationMs,
    stats: { p1: stats, p2: emptySlotStats(), rounds: [], quizCount: 0, verseRef },
    ratingDelta: null, rating: null, record: result?.record ?? fallbackRecord(stats, 'practice', durationMs), growth: result?.growth ?? null,
    achievements: [], verseRef, victoryVerseRef: null, saved: result?.saved ?? false,
  });
  closeRoom(ctx);
}

// FR-009·UC-016 소켓 종료 → 시작 전: OPPONENT_LEFT 후 방 무효 / 진행 중: 남은 쪽 승리(봇 대전은 봇 승리) / 둘 다 끊김: 무효
export async function handleDisconnect(ctx: RoomContext, slot: SlotNo, now: number): Promise<void> {
  const { room } = ctx;
  const leaver = playerAt(room, slot);
  if (!leaver || room.phase === 'ended') return;
  leaver.connected = false;
  if (room.round === 0) {
    for (const p of humans(room)) if (p.connected && p.joined) sendError(ctx, p.slot, 'OPPONENT_LEFT', 'join');
    closeRoom(ctx);
    return;
  }
  if (isPractice(room)) {
    await endPractice(ctx, 'practiceEnd', now);
    return;
  }
  const remaining = room.players.find((p) => p.slot !== slot && (p.isBot || p.connected));
  if (!remaining || (remaining.isBot && room.mode !== 'bot')) {
    ctx.deps.log('room-void', { roomId: room.roomId });
    closeRoom(ctx);
    return;
  }
  // 진행 중이던 라운드는 이탈자 패배 1판으로 누적 (D-22)
  if (isRunning(ctx)) accountRound(ctx, remaining.slot);
  await endMatch(ctx, remaining.slot, 'disconnect', now);
}

// API-201 예약 명단 전원 입장 마감(15초) — 들어온 쪽에 OPPONENT_LEFT 후 방 종료 (UC-003 E2)
export function onJoinTimeout(ctx: RoomContext): void {
  if (ctx.room.phase !== 'waiting' || allJoined(ctx)) return;
  for (const p of humans(ctx.room)) if (p.joined && p.connected) sendError(ctx, p.slot, 'OPPONENT_LEFT', 'join');
  ctx.deps.log('room-join-timeout', { roomId: ctx.room.roomId });
  closeRoom(ctx);
}

/** DO 셸이 방을 강제로 닫을 때 (봇 실패 등) */
export function abortRoom(ctx: RoomContext, code: string, ref: string): void {
  for (const p of humans(ctx.room)) if (p.connected) sendError(ctx, p.slot, code, ref);
  closeRoom(ctx);
}
