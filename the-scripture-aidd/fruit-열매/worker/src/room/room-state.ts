// TASK-023-1 · FR-005 · FR-009 · REQ-001 · ARCH-011 — GameRoom 방·플레이어 상태 타입, 초기화, 공용 송신·상태 직렬화 도우미.
// 단일 책임: 방 메모리 상태의 모양과 생성(라운드별 초기화 포함). 판정 계산은 attack.ts·room/* 서비스가 맡는다.
import type { RoomInit, RoomMode, RosterEntry } from '../env';
import type { BotLevel, HeroId, MatchMode, PersonalRecord, SlotStats } from '../store/store';
import { encodeErrorMessage, encodeServerMessage } from '../../../client/js/net/protocol.js';
import { balance } from '../content';
import { createArmorState, type ArmorState } from './armor';
import { cooldownSnapshot, createFaithState, shiftCooldowns, type FaithState } from './faith';
import { createInterferenceLedger, nextExpiryAt, sealedRemainingMs, shiftEffects, type InterferenceLedger } from './interference';
import { createProgressLedger, type ProgressLedger } from './progress-guard';
import type { RoomTimers } from './timers';
import type { QuizState } from './quiz-duel';
import type { SpecialsLedger } from './specials';

export type SlotNo = 1 | 2;
/** devguide §7.4 "GameRoom이 ≤ 50ms 간격으로 tick 호출" — 봇 구동 간격 */
export const BOT_TICK_MS = 50;
export type Phase = 'waiting' | 'countdown' | 'playing' | 'quiz' | 'roundEnd' | 'ended';

/* ── 지파 간 계약의 구조 타입 (devguide §7.4·§7.5 그대로 — 셸(game-room.ts)이 실제 구현을 주입) ── */
export interface BotInit { level: BotLevel; seed: number; stage: 0 | 1 | 2; startAt: number; matchElapsedMs: number }
export interface BotOutput { type: 'state' | 'clear' | 'topout'; data: Record<string, unknown> }
export interface BotAttack { garbage: number; holeColumn: number; spiritId: string | null; duration: number; params: Record<string, unknown> }
export interface BotPlayerPort {
  tick(now: number): BotOutput[];
  receiveAttack(attack: BotAttack): void;
  applyEffect(effect: { kind: string; id: string; action: { type: string; [k: string]: unknown } }): void;
  freeze(now: number): void;
  resume(now: number): void;
  readonly toppedOut: boolean;
}
export interface SlotOutcome {
  slot: SlotNo; guestId: string | null; heroId: HeroId; isBot: boolean; botLevel: BotLevel | null;
  ratingAtStart: number | null; roundsDelta: number; lossStreak: number;
}
export interface MatchOutcome {
  roomId: string; mode: MatchMode; slots: [SlotOutcome, SlotOutcome]; winnerSlot: SlotNo;
  score: [number, number]; endReason: 'topout' | 'disconnect'; durationMs: number;
  stats: { p1: SlotStats; p2: SlotStats; rounds: Array<{ round: number; winnerSlot: SlotNo; durationMs: number }>; quizCount: number; verseRef: string };
}
export interface SlotResult {
  ratingDelta: number | null; rating: number | null; record: PersonalRecord;
  growth: { maxCombo: number; attackPerMin: number; quizAccuracy: number } | null; achievements: string[];
}

/** 방 서비스가 쓰는 주입 의존성 (DO 셸이 구현, 테스트는 대역) — devguide §3.4 */
export interface RoomDeps {
  /** 사람 슬롯 소켓으로 송신 (봇·미연결 슬롯은 무시) */
  send(slot: SlotNo, frame: string): void;
  /** 모든 소켓 종료 */
  closeAll(code: number, reason: string): void;
  timers: RoomTimers;
  /** 서버 난수 스트림 (구멍 열·영·출제·보상) */
  rand: () => number;
  /** 라운드 시드 (32비트 부호 없는 정수 — crypto.getRandomValues) */
  randomSeed(): number;
  createBot(init: BotInit): BotPlayerPort;
  planBotQuizAnswer(level: BotLevel, answerIndex: number, rand: () => number): { choice: 0 | 1 | 2 | 3; delayMs: number };
  recordMatch(outcome: MatchOutcome): Promise<{ saved: boolean; slots: { 1: SlotResult; 2: SlotResult } }>;
  recordPractice(input: { guestId: string; roundsDelta: number; stats: SlotStats; playTimeMs: number }):
    Promise<{ saved: boolean; record: PersonalRecord; growth: SlotResult['growth'] }>;
  /** 방 종료 통지 (Matchmaker roomClosed — 1회, 실패는 로그만) */
  roomClosed(): void;
  log(event: string, fields?: Record<string, unknown>): void;
}

export interface PlayerState {
  slot: SlotNo;
  guestId: string | null;
  nickname: string | null;
  heroId: HeroId;
  isBot: boolean;
  botLevel: BotLevel | null;
  ratingAtStart: number | null;
  roundsPlayed: number;
  lossStreak: number;
  joined: boolean;
  connected: boolean;
  ready: boolean;
  /* 라운드 단위 */
  progress: ProgressLedger;
  faith: FaithState;
  armor: ArmorState;
  interference: InterferenceLedger;
  grace: boolean;
  pendingGarbage: number;
  garbageImmuneUntil: number;
  lastBoard: string | null;
  lastB2bTetris: boolean;
  specials: SpecialsLedger | null;
  roundStats: { linesCleared: number; maxCombo: number; attackSent: number };
  /* 경기 단위 */
  stats: SlotStats;
  jesusUsed: boolean;
  roundsThisMatch: number;
}

export interface RoomState {
  roomId: string;
  mode: RoomMode;
  botLevel: BotLevel | null;
  createdAt: number;
  players: PlayerState[];
  phase: Phase;
  round: number;
  score: [number, number];
  seed: number;
  stage: 0 | 1 | 2;
  roundStartAt: number;
  matchStartAt: number | null;
  attackSeq: number;
  quiz: QuizState | null;
  quizCount: number;
  rounds: Array<{ round: number; winnerSlot: SlotNo; durationMs: number }>;
  /** 경기 중 발동 횟수 (대표 구절 — `hero:id`·`angel:id`·`armor:id`) */
  usage: Record<string, number>;
  bot: BotPlayerPort | null;
  closed: boolean;
}

export interface RoomContext { room: RoomState; deps: RoomDeps }

export function emptySlotStats(): SlotStats {
  return {
    maxCombo: 0, linesCleared: 0, tetrises: 0, attackSent: 0, attackPerMin: 0, quizCorrect: 0, quizAnswered: 0,
    skillsUsed: 0, angelsUsed: 0, armorUsed: 0, jesusEvent: false,
  };
}

function createPlayer(entry: RosterEntry): PlayerState {
  return {
    slot: entry.slot, guestId: entry.guestId, nickname: entry.nickname, heroId: entry.heroId, isBot: entry.isBot,
    botLevel: entry.botLevel, ratingAtStart: entry.rating, roundsPlayed: entry.roundsPlayed, lossStreak: entry.lossStreak,
    joined: entry.isBot, connected: entry.isBot, ready: entry.isBot,
    progress: createProgressLedger(0), faith: createFaithState(), armor: createArmorState(), interference: createInterferenceLedger(),
    grace: false, pendingGarbage: 0, garbageImmuneUntil: 0, lastBoard: null, lastB2bTetris: false, specials: null,
    roundStats: { linesCleared: 0, maxCombo: 0, attackSent: 0 },
    stats: emptySlotStats(), jesusUsed: false, roundsThisMatch: 0,
  };
}

// FR-005·FR-009 방 상태 생성 (Matchmaker init RPC 입력 그대로)
export function createRoomState(init: RoomInit): RoomState {
  const players = [...init.roster].sort((a, b) => a.slot - b.slot).map(createPlayer);
  return {
    roomId: init.roomId, mode: init.mode, botLevel: init.botLevel, createdAt: init.createdAt, players,
    phase: 'waiting', round: 0, score: [0, 0], seed: 0, stage: 0, roundStartAt: 0, matchStartAt: null, attackSeq: 0,
    quiz: null, quizCount: 0, rounds: [], usage: {}, bot: null, closed: false,
  };
}

// FR-005 라운드 시작 시 라운드 단위 상태 초기화 (seq는 소켓 단위라 유지 — R-02)
export function resetPlayerForRound(p: PlayerState, roundStartAt: number, grace: boolean): void {
  p.progress = createProgressLedger(roundStartAt, p.progress.lastSeq);
  p.faith = createFaithState();
  p.armor = createArmorState();
  p.interference = createInterferenceLedger();
  p.grace = grace;
  p.pendingGarbage = 0;
  p.garbageImmuneUntil = 0;
  p.lastBoard = null;
  p.lastB2bTetris = false;
  p.specials = null;
  p.roundStats = { linesCleared: 0, maxCombo: 0, attackSent: 0 };
}

export function playerAt(room: RoomState, slot: SlotNo): PlayerState | undefined {
  return room.players.find((p) => p.slot === slot);
}

export function opponentOf(room: RoomState, slot: SlotNo): PlayerState | undefined {
  return room.players.find((p) => p.slot !== slot);
}

export const humans = (room: RoomState): PlayerState[] => room.players.filter((p) => !p.isBot);
export const isPractice = (room: RoomState): boolean => room.mode === 'practice';
export const bestOf = (room: RoomState): number => (isPractice(room) ? 1 : balance.match.bestOf);

/* ── 송신 도우미 (api-gate §2.4 봉투) ── */

export function sendMessage(ctx: RoomContext, slot: SlotNo, type: string, data: Record<string, unknown>): void {
  ctx.deps.send(slot, encodeServerMessage(type, data));
}

export function broadcast(ctx: RoomContext, type: string, data: Record<string, unknown>): void {
  for (const p of humans(ctx.room)) sendMessage(ctx, p.slot, type, data);
}

export function sendError(ctx: RoomContext, slot: SlotNo, code: string, ref: string, retryAfterMs?: number): void {
  ctx.deps.send(slot, encodeErrorMessage(code, ref, retryAfterMs));
}

/** API-255 effect 데이터 */
export interface EffectData {
  kind: string; id: string; bySlot: SlotNo; targetSlot: SlotNo;
  action: { type: string; [k: string]: unknown }; verseRef: string | null; durationMs: number;
}

// FR-035·FR-037 effect 양측 송신 + 대상이 봇이면 봇 보드에 적용 지시 (devguide §7.4 applyEffect)
export function sendEffect(ctx: RoomContext, effect: EffectData): void {
  broadcast(ctx, 'effect', { ...effect });
  const target = playerAt(ctx.room, effect.targetSlot);
  if (target?.isBot && ctx.room.bot) ctx.room.bot.applyEffect({ kind: effect.kind, id: effect.id, action: effect.action });
}

// FR-033·FR-036·FR-062 API-256 playerStatus (나에게만)
export function buildPlayerStatus(p: PlayerState, now: number): Record<string, unknown> {
  return {
    faith: p.faith.faith,
    cooldowns: cooldownSnapshot(p.faith, p.heroId, now),
    armor: [...p.armor.owned],
    wards: { ...p.armor.wards },
    sealedMs: sealedRemainingMs(p.interference, now),
    pendingGarbage: p.pendingGarbage,
    grace: p.grace,
    jesusUsed: p.jesusUsed,
  };
}

export function sendStatus(ctx: RoomContext, p: PlayerState, now: number): void {
  if (!p.isBot) sendMessage(ctx, p.slot, 'playerStatus', buildPlayerStatus(p, now));
}

// FR-041 말씀 대결 정지 시간만큼 플레이어 시계를 미룬다 (영 효과·쿨다운·베드로 무효)
export function shiftPlayerClocks(p: PlayerState, deltaMs: number, pausedAt: number): void {
  shiftEffects(p.interference, deltaMs, pausedAt);
  shiftCooldowns(p.faith, deltaMs, pausedAt);
  if (p.garbageImmuneUntil > pausedAt) p.garbageImmuneUntil += deltaMs;
}

// FR-031 영 효과 종료 통지 타이머를 가장 이른 만료 시각으로 맞춘다 (말씀 대결 정지 중에는 멈춤)
export function scheduleSpiritExpiry(ctx: RoomContext): void {
  let next: number | null = null;
  for (const p of ctx.room.players) {
    const at = nextExpiryAt(p.interference);
    if (at !== null && (next === null || at < next)) next = at;
  }
  if (next === null || ctx.room.phase === 'quiz') ctx.deps.timers.cancel('spirits');
  else ctx.deps.timers.schedule('spirits', next);
}

/** 경기 사용 횟수 기록 (FR-063 대표 구절 입력) */
export function noteUsage(room: RoomState, key: string): void {
  room.usage[key] = (room.usage[key] ?? 0) + 1;
}
