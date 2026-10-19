// TASK-023-4 · FR-008 · FR-009 · NFR-003 · R-13 · D-02 · D-03 · API-006·201·251 — GameRoom Durable Object 셸 (판정 계산 없음).
// 단일 책임: Hibernation 핸들러·init RPC·입장 명단 검증·빈도 제한·alarm 분배·방 종료 통지. 판정은 room/* 서비스로 위임한다.
import { DurableObject } from 'cloudflare:workers';
import { CLOSE_CODES, ERRORS, TIMING, encodeErrorMessage, encodeServerMessage } from '../../client/js/net/protocol.js';
import { mulberry32 } from '../../client/js/engine/rng.js';
import type { Env, GameRoomRpc, MatchmakerRpc, RoomInit } from './env';
import { resolveGuest } from './auth/token';
import { parseClientFrame } from './protocol/validate';
import { createRateLimiter, type RateLimiter } from './protocol/rate-limit';
import { selectStore } from './store/select-store';
import { recordMatchOutcome, recordPracticeOutcome } from './results/record-match';
import { createBotPlayer } from './room/bot/bot-player';
import { planBotQuizAnswer } from './room/bot/bot-quiz';
import { createRoomState, bestOf, type RoomContext, type RoomDeps, type RoomState, type SlotNo } from './room/room-state';
import { createRoomTimers, type RoomTimers, type TimerKey } from './room/timers';
import { routeMessage, onBotTick, onSpiritsTimer } from './room/message-router';
import { handleDisconnect, onJoinTimeout, onNextRound, onRoundGo } from './room/round-flow';
import { finalizeQuiz, onAutoQuizTimer, onBotQuizTimer, resumeAfterQuiz } from './room/quiz-duel';

interface Attachment { slot: SlotNo | null; openedAt: number }

const [STORAGE_INIT, STORAGE_STARTED, STORAGE_CLOSED] = ['init', 'started', 'closed'] as const;

const randomU32 = (): number => crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;

/** 로그에는 오류 이름만 (스택·내부 메시지 미출력 — 봉인 제1계명) */
const errName = (err: unknown): string => (err instanceof Error ? err.name : 'unknown');

function log(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...fields }));
}

function jsonError(status: number, code: keyof typeof ERRORS): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message: ERRORS[code].message } }), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export class GameRoom extends DurableObject<Env> implements GameRoomRpc {
  private room: RoomState | null = null;
  private readonly timers: RoomTimers;
  private readonly limiters = new WeakMap<WebSocket, RateLimiter>();
  private readonly rand = mulberry32(randomU32());
  private persisted = { started: false, closed: false };
  private closedNotified = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.timers = createRoomTimers((at) => {
      const op = at === null ? this.ctx.storage.deleteAlarm() : this.ctx.storage.setAlarm(at);
      op.catch((err: unknown) => log('room-alarm-error', { error: errName(err) }));
    });
    void this.ctx.blockConcurrencyWhile(() => this.restore());
  }

  /** 하이버네이션 후 깨어남 — 시작 전이면 명단·소켓 첨부로 복원, 진행 중 상태를 잃었으면 방 무효 (N-02 재접속 복귀 없음) */
  private async restore(): Promise<void> {
    try {
      const init = await this.ctx.storage.get<RoomInit>(STORAGE_INIT);
      if (!init || (await this.ctx.storage.get<boolean>(STORAGE_CLOSED))) return;
      this.room = createRoomState(init);
      if (await this.ctx.storage.get<boolean>(STORAGE_STARTED)) {
        this.room.closed = true;
        this.room.phase = 'ended';
        this.deps().roomClosed();
        this.deps().closeAll(CLOSE_CODES.ROOM_GONE, 'room gone');
        await this.syncFlags();
        return;
      }
      for (const ws of this.ctx.getWebSockets()) {
        const slot = this.attachment(ws).slot;
        const p = slot === null ? undefined : this.room.players.find((x) => x.slot === slot);
        if (p) { p.joined = true; p.connected = true; }
      }
      this.timers.schedule('joinTimeout', Math.max(Date.now(), init.createdAt + TIMING.ROOM_JOIN_TIMEOUT_MS));
    } catch (err) {
      log('room-restore-error', { error: errName(err) });
    }
  }

  private attachment(ws: WebSocket): Attachment {
    const a = ws.deserializeAttachment() as Attachment | null;
    return a ?? { slot: null, openedAt: 0 };
  }

  private deps(): RoomDeps {
    const roomId = this.room?.roomId ?? '';
    return {
      send: (slot, frame) => this.eachSocket('room-send-error', (ws) => this.attachment(ws).slot === slot, (ws) => ws.send(frame)),
      closeAll: (code, reason) => this.eachSocket('room-close-error', () => true, (ws) => ws.close(code, reason)),
      timers: this.timers,
      rand: this.rand,
      randomSeed: randomU32,
      createBot: (init) => createBotPlayer(init),
      planBotQuizAnswer: (level, answerIndex, rand) => planBotQuizAnswer(level, answerIndex, rand),
      recordMatch: (outcome) => recordMatchOutcome(selectStore(this.env), outcome),
      recordPractice: (input) => recordPracticeOutcome(selectStore(this.env), input),
      roomClosed: () => {
        if (this.closedNotified || !roomId) return;
        this.closedNotified = true;
        const stub = this.env.MATCHMAKER.get(this.env.MATCHMAKER.idFromName('global')) as unknown as MatchmakerRpc;
        this.ctx.waitUntil(stub.roomClosed(roomId).catch((err: unknown) => log('room-closed-notify-failed', { roomId, error: errName(err) })));
      },
      log: (event, fields = {}) => log(event, { roomId, ...fields }),
    };
  }

  private eachSocket(event: string, match: (ws: WebSocket) => boolean, act: (ws: WebSocket) => void): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (!match(ws)) continue;
      try { act(ws); } catch (err) { log(event, { roomId: this.room?.roomId, error: errName(err) }); }
    }
  }

  private context(): RoomContext | null {
    return this.room ? { room: this.room, deps: this.deps() } : null;
  }

  private async syncFlags(): Promise<void> {
    if (!this.room) return;
    const pending: Array<['started' | 'closed', string]> = [];
    if (this.room.round > 0 && !this.persisted.started) pending.push(['started', STORAGE_STARTED]);
    if (this.room.closed && !this.persisted.closed) pending.push(['closed', STORAGE_CLOSED]);
    for (const [flag, key] of pending) {
      this.persisted[flag] = true;
      await this.ctx.storage.put(key, true);
    }
  }

  // FR-008 Matchmaker → GameRoom init RPC (api-gate API-153: matched 송신 전에 완료)
  async init(init: RoomInit): Promise<void> {
    try {
      if (!init || typeof init.roomId !== 'string' || !Array.isArray(init.roster) || init.roster.length < 1) throw new Error('INVALID_ROOM_INIT');
      await this.ctx.storage.put(STORAGE_INIT, init);
      this.room = createRoomState(init);
      this.persisted = { started: false, closed: false };
      this.closedNotified = false;
      this.timers.clear();
      this.timers.schedule('joinTimeout', Date.now() + TIMING.ROOM_JOIN_TIMEOUT_MS);
    } catch (err) {
      log('room-init-failed', { error: errName(err) }); // 봉인 제1계명 — 메시지 본문은 남기지 않는다
      throw err instanceof Error ? err : new Error('INIT_FAILED');
    }
  }

  // API-006 Worker가 Upgrade·Origin·UUID 검사를 마친 요청만 — 초기화 전/종료 후 404, 아니면 101
  async fetch(_request: Request): Promise<Response> {
    try {
      if (!this.room || this.room.closed) return jsonError(404, 'ROOM_NOT_FOUND');
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.ctx.acceptWebSocket(server);
      const openedAt = Date.now();
      server.serializeAttachment({ slot: null, openedAt } satisfies Attachment);
      const authAt = openedAt + TIMING.AUTH_TIMEOUT_MS;
      const current = this.timers.at('auth');
      if (current === null || authAt < current) this.timers.schedule('auth', authAt);
      return new Response(null, { status: 101, webSocket: client });
    } catch (err) {
      log('room-fetch-error', { error: errName(err) });
      return jsonError(500, 'INTERNAL_ERROR');
    }
  }

  // FR-008·R-13 API-201 join — 토큰 → 게스트 → 예약 명단·위인 일치, 한 게스트 두 번째 연결 거부
  private async handleJoin(ws: WebSocket, ctx: RoomContext, data: Record<string, unknown>): Promise<void> {
    const reject = (code: string, close: number): void => {
      ws.send(encodeErrorMessage(code, 'join'));
      ws.close(close, code);
    };
    if (this.attachment(ws).slot !== null) return void ws.send(encodeErrorMessage('DUPLICATE_SESSION', 'join'));
    const profile = await resolveGuest(selectStore(this.env), data.token);
    if (!profile) {
      ctx.deps.log('token-invalid', {});
      return reject('INVALID_TOKEN', CLOSE_CODES.AUTH_FAILED);
    }
    const player = ctx.room.players.find((p) => !p.isBot && p.guestId === profile.id);
    if (!player) return reject('NOT_IN_ROOM', CLOSE_CODES.NOT_ELIGIBLE);
    if (player.heroId !== data.heroId) return reject('HERO_MISMATCH', CLOSE_CODES.NOT_ELIGIBLE);
    const taken = this.ctx.getWebSockets().some((other) => other !== ws && this.attachment(other).slot === player.slot);
    if (taken || player.joined) return reject('DUPLICATE_SESSION', CLOSE_CODES.NOT_ELIGIBLE);
    if (ctx.room.phase !== 'waiting') return reject('GAME_NOT_RUNNING', CLOSE_CODES.ROOM_GONE);
    ws.serializeAttachment({ ...this.attachment(ws), slot: player.slot } satisfies Attachment);
    player.joined = true;
    player.connected = true;
    ws.send(encodeServerMessage('joined', {
      roomId: ctx.room.roomId, mode: ctx.room.mode, slot: player.slot, bestOf: bestOf(ctx.room),
      players: ctx.room.players.map((p) => ({ slot: p.slot, nickname: p.isBot ? null : p.nickname, heroId: p.heroId, isBot: p.isBot, botLevel: p.botLevel })),
    }));
    if (ctx.room.players.every((p) => p.joined)) ctx.deps.timers.cancel('joinTimeout');
  }

  // NFR-003 수신 1건: 스키마 검증 → 빈도 제한 → 인증 → 분배 (예외는 INTERNAL_ERROR — devguide §3.6)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let ref = '';
    try {
      const ctx = this.context();
      if (!ctx || ctx.room.closed) return void ws.close(CLOSE_CODES.ROOM_GONE, 'room gone');
      const now = Date.now();
      const parsed = parseClientFrame('room', message);
      if (!parsed.ok) {
        // api-gate API-203: state 스키마 위반은 조용히 버린다
        // api-gate API-209: reaction 스키마 위반은 INVALID_REACTION (표시 없음) — validate는 INVALID_MESSAGE만 돌려주므로 여기서 사상 (여호수아 조정)
        if (parsed.ref === 'reaction') ws.send(encodeErrorMessage('INVALID_REACTION', parsed.ref));
        else if (parsed.ref !== 'state') ws.send(encodeErrorMessage(parsed.code, parsed.ref));
        return;
      }
      ref = parsed.type;
      let limiter = this.limiters.get(ws);
      if (!limiter) { limiter = createRateLimiter(); this.limiters.set(ws, limiter); }
      const verdict = limiter.check(parsed.type, now);
      if (verdict === 'ignore') return;
      if (verdict === 'reject') {
        ws.send(encodeErrorMessage('RATE_LIMITED', ref));
        if (limiter.noteRejected(now)) {
          ctx.deps.log('rate-abuse-close', {});
          ws.close(CLOSE_CODES.RATE_ABUSE, 'rate abuse');
        }
        return;
      }
      if (parsed.type === 'join') return await this.handleJoin(ws, ctx, parsed.data);
      const slot = this.attachment(ws).slot;
      if (slot === null) return void ws.send(encodeErrorMessage('NOT_AUTHENTICATED', ref));
      await routeMessage(ctx, slot, parsed.type, parsed.data, now);
    } catch (err) {
      log('room-message-error', { roomId: this.room?.roomId, ref, error: errName(err) });
      try { ws.send(encodeErrorMessage('INTERNAL_ERROR', ref)); } catch (sendErr) { log('room-send-error', { error: errName(sendErr) }); }
    } finally {
      await this.safeSync();
    }
  }

  private async safeSync(): Promise<void> {
    await this.syncFlags().catch((err: unknown) => log('room-storage-error', { error: errName(err) }));
  }

  private async onSocketGone(ws: WebSocket): Promise<void> {
    try {
      const ctx = this.context();
      const slot = this.attachment(ws).slot;
      if (ctx && slot !== null && !ctx.room.closed) await handleDisconnect(ctx, slot, Date.now());
    } catch (err) {
      log('room-close-handler-error', { roomId: this.room?.roomId, error: errName(err) });
    } finally {
      await this.safeSync();
    }
  }

  // FR-009 이탈 판정 (webSocketClose·webSocketError 공통)
  async webSocketClose(ws: WebSocket, code: number, _reason: string, _wasClean: boolean): Promise<void> {
    await this.onSocketGone(ws);
    // 예약 코드(1005·1006 등)는 되돌려 보낼 수 없으므로 정상 종료 코드로 응답
    try { ws.close(code === CLOSE_CODES.NORMAL || (code >= 4000 && code <= 4999) ? code : CLOSE_CODES.NORMAL, 'closed'); } catch (err) { log('room-close-ack', { error: errName(err) }); }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> { await this.onSocketGone(ws); }

  /** API-005·006 연결 후 10초 안에 join 없는 소켓 종료 4001 */
  private closeUnauthenticated(now: number): void {
    const deadline = (ws: WebSocket): number | null => {
      const a = this.attachment(ws);
      return a.slot === null ? a.openedAt + TIMING.AUTH_TIMEOUT_MS : null;
    };
    this.eachSocket('room-close-error', (ws) => (deadline(ws) ?? Infinity) <= now, (ws) => ws.close(CLOSE_CODES.AUTH_FAILED, 'auth timeout'));
    const later = this.ctx.getWebSockets().map(deadline).filter((d): d is number => d !== null && d > now);
    if (later.length > 0) this.timers.schedule('auth', Math.min(...later));
  }

  private async dispatchTimer(ctx: RoomContext, key: TimerKey, now: number): Promise<void> {
    switch (key) {
      case 'joinTimeout': return onJoinTimeout(ctx);
      case 'auth': return this.closeUnauthenticated(now);
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
  }

  // FR-005·FR-009 방 타이머 (카운트다운·라운드 간격·말씀 대결·봇·영 종료·입장 마감)
  async alarm(): Promise<void> {
    try {
      const ctx = this.context();
      if (!ctx) return;
      const now = Date.now();
      for (const key of this.timers.takeDue(now)) {
        // 타이머 1건 실패가 나머지 타이머·방을 멈추지 않게 (devguide §3.6)
        try { await this.dispatchTimer(ctx, key, now); } catch (err) { log('room-timer-error', { roomId: ctx.room.roomId, key, error: errName(err) }); }
      }
    } catch (err) {
      log('room-alarm-error', { roomId: this.room?.roomId, error: errName(err) });
    } finally {
      await this.safeSync();
    }
  }
}
