// TASK-034-2 · FR-018 · FR-019 · FR-020 · FR-021 · FR-023 · FR-072 · NFR-003 · D-04 · devguide §7.6 — Matchmaker DO 셸 (싱글턴 'global')
// Hibernation WS 핸들러(10초 인증 마감·소켓 첨부 복원) + 로컬 모드 Store RPC(DoSqliteStore 위임) + roomClosed + alarm 정리.
// 규칙 계산은 matchmaking/*·auth/*·protocol/*에 있고, 이 파일은 분배·송신·상태 첨부만 한다 (devguide §3.4).
import { DurableObject } from 'cloudflare:workers';
import {
  CLOSE_CODES, MM_C2S, MM_S2C, TIMING, encodeErrorMessage, encodeServerMessage,
} from '../../client/js/net/protocol.js';
import { resolveGuest } from './auth/token';
import { pickOpponent } from './matchmaking/queue';
import {
  closeInviteCode, closeInviteCodesForRoom, expireInviteCodes, issueInviteCode, redeemInviteCode, reopenInviteCode, secureRandom,
} from './matchmaking/invite-codes';
import { buildRoomInit, buildRoster, createRoomId, initRoom, matchedPayload, pickBotHero } from './matchmaking/room-factory';
import type { Participant } from './matchmaking/room-factory';
import { createRateLimiter } from './protocol/rate-limit';
import type { RateLimiter } from './protocol/rate-limit';
import { parseClientFrame } from './protocol/validate';
import { applySchema } from './store/do-sqlite-schema';
import { DoSqliteInviteRepo, DoSqliteStore } from './store/do-sqlite-store';
import { isSupabaseMode, selectStore } from './store/select-store';
import { StoreError } from './store/store';
import type { BotLevel, HeroId, Profile, RecordMatchInput, RecordPracticeInput, Store } from './store/store';
import type { Env, MatchmakerRpc, RoomInit, RoomMode } from './env';

/** data-ark §5: 초대 코드 만료 정리 alarm 주기 (열린 코드가 있을 때만) */
const INVITE_SWEEP_INTERVAL_MS = 60000;

type Attachment =
  | { state: 'pending'; connectedAt: number }
  | { state: 'idle'; guestId: string }
  | ({ state: 'queued'; queuedAt: number } & Participant)
  | ({ state: 'hosting'; roomCode: string; roomId: string } & Participant)
  | { state: 'closed' };

const log = (event: string, guestId?: string, roomId?: string): void => {
  console.log(JSON.stringify({ at: new Date().toISOString(), event, guest: guestId?.slice(0, 8), roomId })); // devguide §3.7
};

export class Matchmaker extends DurableObject<Env> implements MatchmakerRpc {
  private readonly local: DoSqliteStore;
  private readonly invites: DoSqliteInviteRepo;
  private readonly limiters = new WeakMap<WebSocket, RateLimiter>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.local = new DoSqliteStore(ctx.storage);
    this.invites = new DoSqliteInviteRepo(ctx.storage);
    void ctx.blockConcurrencyWhile(async () => {
      try {
        applySchema(ctx.storage); // data-ark §7.1 — 깨어날 때 TBL-007 버전 비교 후 DDL 적용
      } catch {
        log('schema-apply-failed');
      }
    });
  }

  /** 매칭에 쓰는 프로필 저장소 — Supabase 모드면 SupabaseStore, 로컬이면 자기 DoSqliteStore (자기 자신에게 RPC 하지 않는다) */
  private get players(): Store {
    return isSupabaseMode(this.env) ? selectStore(this.env) : this.local;
  }

  /* ───────── Store RPC (로컬 모드 — devguide §7.6, 오류는 코드 메시지 StoreError로 재던짐) ───────── */

  private async rpc<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw new StoreError(err instanceof StoreError ? err.code : 'STORE_UNAVAILABLE');
    }
  }
  createProfile(input: { id: string; nickname: string; nicknameKey: string; tokenHash: string }) { return this.rpc(() => this.local.createProfile(input)); }
  getProfileByTokenHash(tokenHash: string) { return this.rpc(() => this.local.getProfileByTokenHash(tokenHash)); }
  touchProfile(guestId: string) { return this.rpc(() => this.local.touchProfile(guestId)); }
  getPlayers(guestIds: string[]) { return this.rpc(() => this.local.getPlayers(guestIds)); }
  recordMatch(input: RecordMatchInput) { return this.rpc(() => this.local.recordMatch(input)); }
  recordPractice(input: RecordPracticeInput) { return this.rpc(() => this.local.recordPractice(input)); }
  listMatches(guestId: string, page: number, size: number) { return this.rpc(() => this.local.listMatches(guestId, page, size)); }
  getLeaderboard() { return this.rpc(() => this.local.getLeaderboard()); }
  getRank(guestId: string) { return this.rpc(() => this.local.getRank(guestId)); }

  // FR-019 GameRoom 종료 통지 — 그 방의 초대 코드 즉시 closed (TBL-005 idx_invite_codes_room_id)
  async roomClosed(roomId: string): Promise<void> {
    try {
      closeInviteCodesForRoom(this.invites, roomId, Date.now());
    } catch {
      log('room-closed-failed', undefined, roomId);
      throw new Error('ROOM_CLOSED_FAILED');
    }
  }

  /* ───────── WebSocket (API-005 — Worker가 Upgrade·Origin 검사를 마친 요청만 온다) ───────── */

  async fetch(_request: Request): Promise<Response> {
    try {
      const pair = new WebSocketPair();
      const now = Date.now();
      this.ctx.acceptWebSocket(pair[1]);
      this.setAttachment(pair[1], { state: 'pending', connectedAt: now });
      await this.scheduleAlarm(now);
      return new Response(null, { status: 101, webSocket: pair[0] });
    } catch {
      log('matchmaker-accept-failed');
      return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도하세요.' } }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let ref = '';
    try {
      const now = Date.now();
      const parsed = parseClientFrame('matchmaker', message);
      if (!parsed.ok) {
        this.sendError(ws, 'INVALID_MESSAGE', parsed.ref);
        return;
      }
      ref = parsed.type;
      const limiter = this.limiters.get(ws) ?? createRateLimiter();
      this.limiters.set(ws, limiter);
      const verdict = limiter.check(parsed.type, now);
      if (verdict === 'ignore') return;
      if (verdict === 'reject') {
        this.sendError(ws, 'RATE_LIMITED', ref);
        if (limiter.noteRejected(now)) {
          log('rate-abuse-close', this.guestOf(ws));
          await this.cleanup(ws, now);
          ws.close(CLOSE_CODES.RATE_ABUSE, 'RATE_LIMITED');
        }
        return;
      }
      if (parsed.type === MM_C2S.JOIN) await this.onJoin(ws, parsed.data, now);
      else if (parsed.type === MM_C2S.CREATE_ROOM) await this.onCreateRoom(ws, parsed.data, now);
      else if (parsed.type === MM_C2S.CANCEL) await this.onCancel(ws, now);
    } catch {
      log('matchmaker-message-error', this.guestOf(ws));
      this.sendError(ws, 'INTERNAL_ERROR', ref); // 한 메시지 실패가 DO 전체를 멈추지 않게 한다 (devguide §3.6)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      await this.cleanup(ws, Date.now()); // FR-020 끊기면 대기열·초대 코드 정리
      try { ws.close(code, reason); } catch { /* 이미 닫힌 소켓 — 정리는 끝났다 */ }
    } catch {
      log('matchmaker-close-error');
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try {
      await this.cleanup(ws, Date.now());
    } catch {
      log('matchmaker-socket-error');
    }
  }

  // API-005 10초 인증 마감(4001) · FR-019 초대 코드 만료(API-154 expired) · TBL-005 정리
  async alarm(): Promise<void> {
    try {
      const now = Date.now();
      for (const ws of this.ctx.getWebSockets()) {
        const a = this.attachment(ws);
        if (a.state === 'pending' && now - a.connectedAt >= TIMING.AUTH_TIMEOUT_MS) {
          this.setAttachment(ws, { state: 'closed' });
          try { ws.close(CLOSE_CODES.AUTH_FAILED, 'NOT_AUTHENTICATED'); } catch { /* 이미 닫힘 */ }
        }
      }
      for (const row of expireInviteCodes(this.invites, now)) {
        const host = this.findHost(row.code);
        if (host) {
          this.setAttachment(host.ws, { state: 'idle', guestId: host.a.guestId });
          this.send(host.ws, MM_S2C.CANCELLED, { reason: 'expired' });
        }
      }
      await this.scheduleAlarm(now);
    } catch {
      log('matchmaker-alarm-error');
    }
  }

  /* ───────── 메시지 처리 ───────── */

  // API-101 join — random 대기열 / invite 코드 입장 / bot / practice
  private async onJoin(ws: WebSocket, data: Record<string, unknown>, now: number): Promise<void> {
    const me = await this.authenticate(ws, data.token, data.heroId as HeroId, 'join');
    if (!me) return;
    const mode = data.mode as RoomMode;
    if (mode === 'random') {
      const waiting = this.sockets().flatMap(({ ws: w, a }) => (a.state === 'queued' ? [{ ...a, ws: w }] : []));
      const opp = pickOpponent(waiting, me);
      if (!opp) {
        this.setAttachment(ws, { state: 'queued', queuedAt: now, ...me });
        this.send(ws, MM_S2C.QUEUED, { mode: 'random', queuedAt: now });
        return;
      }
      const { ws: oppWs, state: _s, queuedAt: _q, ...oppP } = opp;
      this.setAttachment(oppWs, { state: 'idle', guestId: oppP.guestId }); // await 사이 이중 짝 방지
      const init = buildRoomInit(createRoomId(), 'random', buildRoster([oppP, me]), null, now);
      if (!(await this.tryInit(ws, init))) {
        // 상대가 그사이 끊기지 않았다면 대기열로 되돌린다
        if (this.attachment(oppWs).state === 'idle') this.setAttachment(oppWs, { state: 'queued', queuedAt: opp.queuedAt, ...oppP });
        return;
      }
      this.send(oppWs, MM_S2C.MATCHED, matchedPayload(init, 1));
      this.send(ws, MM_S2C.MATCHED, matchedPayload(init, 2));
      return;
    }
    if (mode === 'invite') {
      const redeemed = redeemInviteCode(this.invites, String(data.roomCode), me.guestId, now);
      if (!redeemed.ok) return this.sendError(ws, redeemed.code, 'join');
      const host = this.findHost(redeemed.code);
      if (!host) {
        closeInviteCode(this.invites, redeemed.code, now); // 방장 소켓이 없으면 코드는 무효 (UC-004 E3)
        return this.sendError(ws, 'INVITE_NOT_FOUND', 'join');
      }
      const { state: _s, roomCode: _c, roomId: _r, ...hostP } = host.a;
      const init = buildRoomInit(redeemed.roomId, 'invite', buildRoster([hostP, me]), null, now);
      if (!(await this.tryInit(ws, init))) {
        reopenInviteCode(this.invites, redeemed.code);
        return;
      }
      this.setAttachment(host.ws, { state: 'idle', guestId: hostP.guestId });
      this.send(host.ws, MM_S2C.MATCHED, matchedPayload(init, 1));
      this.send(ws, MM_S2C.MATCHED, matchedPayload(init, 2));
      return;
    }
    const botLevel = mode === 'bot' ? (data.botLevel as BotLevel) : null;
    const roster = botLevel ? buildRoster([me], { heroId: pickBotHero(secureRandom), botLevel }) : buildRoster([me]);
    const init = buildRoomInit(createRoomId(), mode, roster, botLevel, now);
    if (await this.tryInit(ws, init)) this.send(ws, MM_S2C.MATCHED, matchedPayload(init, 1));
  }

  // API-102 createRoom — 방장 1명당 열린 코드 1개, 소켓을 연 채 대기
  private async onCreateRoom(ws: WebSocket, data: Record<string, unknown>, now: number): Promise<void> {
    const me = await this.authenticate(ws, data.token, data.heroId as HeroId, 'createRoom');
    if (!me) return;
    const roomId = createRoomId();
    const issued = issueInviteCode(this.invites, { hostId: me.guestId, roomId, now });
    if (!issued.ok) return this.sendError(ws, issued.code, 'createRoom');
    this.setAttachment(ws, { state: 'hosting', roomCode: issued.code, roomId, ...me });
    this.send(ws, MM_S2C.ROOM_CREATED, { roomCode: issued.code, roomId, expiresAt: new Date(issued.expiresAt).toISOString() });
    await this.scheduleAlarm(now);
  }

  // API-103 cancel — 랜덤 대기 취소 또는 열린 초대 코드 닫기
  private async onCancel(ws: WebSocket, now: number): Promise<void> {
    const a = this.attachment(ws);
    if (a.state === 'pending' || a.state === 'closed') return this.sendError(ws, 'NOT_AUTHENTICATED', 'cancel');
    if (a.state === 'idle') return this.sendError(ws, 'NOTHING_TO_CANCEL', 'cancel');
    if (a.state === 'hosting') closeInviteCode(this.invites, a.roomCode, now);
    this.setAttachment(ws, { state: 'idle', guestId: a.guestId });
    this.send(ws, MM_S2C.CANCELLED, { reason: 'user' });
  }

  /* ───────── 보조 ───────── */

  /** 토큰 검증 → 중복 대기 검사 → 진행 기록 조회. 실패 시 오류 송신 후 null */
  private async authenticate(ws: WebSocket, token: unknown, heroId: HeroId, ref: string): Promise<Participant | null> {
    let profile: Profile | null;
    try {
      profile = await resolveGuest(this.players, token);
    } catch {
      this.sendError(ws, 'STORE_UNAVAILABLE', ref);
      return null;
    }
    if (!profile) {
      log('token-invalid');
      this.sendError(ws, 'INVALID_TOKEN', ref);
      this.setAttachment(ws, { state: 'closed' });
      try { ws.close(CLOSE_CODES.AUTH_FAILED, 'INVALID_TOKEN'); } catch { /* 이미 닫힘 */ }
      return null;
    }
    const busy = this.sockets().some(({ a }) => (a.state === 'queued' || a.state === 'hosting') && a.guestId === profile.id);
    if (busy) {
      this.sendError(ws, 'ALREADY_QUEUED', ref);
      return null;
    }
    this.setAttachment(ws, { state: 'idle', guestId: profile.id });
    try {
      const snap = (await this.players.getPlayers([profile.id]))[0];
      if (!snap) throw new StoreError('STORE_UNAVAILABLE');
      return {
        guestId: profile.id, nickname: profile.nickname, heroId, rating: snap.profile.rating,
        roundsPlayed: snap.progress.roundsPlayed, lossStreak: snap.progress.lossStreak,
      };
    } catch {
      this.sendError(ws, 'STORE_UNAVAILABLE', ref);
      return null;
    }
  }

  private async tryInit(ws: WebSocket, init: RoomInit): Promise<boolean> {
    try {
      await initRoom(this.env, init);
      return true;
    } catch {
      log('room-init-failed', this.guestOf(ws), init.roomId);
      this.sendError(ws, 'INTERNAL_ERROR', 'join');
      return false;
    }
  }

  /** FR-020 소켓 정리 — 대기열 제거(첨부 closed), 방장이면 코드 즉시 무효 (UC-004 E3) */
  private async cleanup(ws: WebSocket, now: number): Promise<void> {
    const a = this.attachment(ws);
    if (a.state === 'hosting') closeInviteCode(this.invites, a.roomCode, now);
    this.setAttachment(ws, { state: 'closed' });
  }

  private async scheduleAlarm(now: number): Promise<void> {
    const candidates: number[] = [];
    for (const { a } of this.sockets()) if (a.state === 'pending') candidates.push(a.connectedAt + TIMING.AUTH_TIMEOUT_MS);
    const expiry = this.invites.nextExpiry();
    if (expiry !== null) candidates.push(expiry, now + INVITE_SWEEP_INTERVAL_MS);
    if (candidates.length === 0) return;
    const next = Math.max(now, Math.min(...candidates));
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current > next || current < now) await this.ctx.storage.setAlarm(next);
  }

  private sockets(): Array<{ ws: WebSocket; a: Attachment }> {
    return this.ctx.getWebSockets().map((ws) => ({ ws, a: this.attachment(ws) }));
  }

  private findHost(code: string): { ws: WebSocket; a: Extract<Attachment, { state: 'hosting' }> } | null {
    for (const { ws, a } of this.sockets()) if (a.state === 'hosting' && a.roomCode === code) return { ws, a };
    return null;
  }

  private attachment(ws: WebSocket): Attachment {
    return (ws.deserializeAttachment() as Attachment | null) ?? { state: 'closed' };
  }

  private setAttachment(ws: WebSocket, a: Attachment): void {
    ws.serializeAttachment(a);
  }

  private guestOf(ws: WebSocket): string | undefined {
    const a = this.attachment(ws);
    return 'guestId' in a ? a.guestId : undefined;
  }

  private send(ws: WebSocket, type: string, data: Record<string, unknown>): void {
    try { ws.send(encodeServerMessage(type, data)); } catch { log('matchmaker-send-failed', this.guestOf(ws)); }
  }

  private sendError(ws: WebSocket, code: string, ref: string): void {
    try { ws.send(encodeErrorMessage(code, ref)); } catch { log('matchmaker-send-failed', this.guestOf(ws)); }
  }
}
