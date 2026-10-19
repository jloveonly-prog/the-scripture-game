// game-room.ts — GameRoom DO 셸만 — setup/config·소켓 수명주기·타이머 등록·Matchmaker 기록 RPC
// TASK-033 | REQ-001 REQ-005 REQ-006 REQ-007 REQ-013 REQ-014 FR-005 FR-006 FR-008 FR-009 FR-021 FR-023 FR-068 NFR-002
// NFR-003 | ARCH-011 | API-006 API-010(setup) API-011~API-031 | data-ark §8.2 | D-07 D-08 D-10 | architecture §9.7
import { DurableObject } from "cloudflare:workers";
import { rules } from "./content";
import type { Env } from "./env";
import type { RoomSetup } from "./lobby/pairing";
import { log } from "./log";
import { ledgerStub } from "./matchmaker";
import { CLOSE_NORMAL, CLOSE_REASON, ROOM_IN, type WsErrorCode } from "./protocol/messages";
import { LIMITED_KINDS, SocketRateLimiter, type LimitedKind } from "./protocol/rate-limit";
import { parseEnvelope, ROOM_ID_PATTERN } from "./protocol/validate";
import { BotDriver } from "./room/bot-driver";
import {
  freshMemo, onAnswer, onArmor, onClear, onReaction, onReady, onSkill, onState, onTopout, type RoomRuntime,
  type SlotMemo,
} from "./room/handlers";
import {
  abortMatch, createMatch, handleDisconnect, matchElapsedMs, type MatchEnd, type MatchState,
} from "./room/match-flow";
import { Outbox, type SocketLike } from "./room/outbox";
import type { RoomContext } from "./room/player-state";
import { finishMatch, type LedgerRpc } from "./room/results";
import type { RecordOutcome } from "./services/history-service";
import type { PracticeOutcome } from "./services/progress-service";
import { ARMOR_IDS } from "./room/specials";
import { error } from "./routes/respond";
import type { Slot } from "./storage/adapter";

/** 방 소켓 첨부 — `ready` 인증을 마친 슬롯 (휴면 복원 가능) */
interface RoomAttachment { slot: Slot | null }

const CONFIG_KEY = "config";
/** 초과 시 조용히 버리는 메시지 (api-gate §2 "state·reaction은 조용히 버림") */
const SILENT_DROP: ReadonlySet<string> = new Set([ROOM_IN.state, ROOM_IN.reaction]);
const ROOM_TYPES: ReadonlySet<string> = new Set(Object.values(ROOM_IN));

function serverRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export class GameRoom extends DurableObject<Env> {
  private setupData: RoomSetup | null = null;
  private loaded = false;
  private match: MatchState | null = null;
  private bot: BotDriver | null = null;
  /** 이번 라운드 진행 시작(카운트다운 끝) — FR-032 초당 진행 검사의 기준 시각 */
  private roundActiveAt = 0;
  private finished = false;
  private aborting = false;
  private readonly outbox = new Outbox();
  private readonly memos = new Map<Slot, SlotMemo>();
  private readonly limiters = new Map<WebSocket, SocketRateLimiter>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly ctxRoom: RoomContext = {
    rules,
    now: () => Date.now(),
    random: serverRandom,
    randomUint32: () => crypto.getRandomValues(new Uint32Array(1))[0],
    send: (slot, type, data) => (this.bot?.bot.slot === slot ? this.bot.deliver(type, data)
      : this.outbox.send(slot, type, data)),
    broadcast: (type, data) => {
      this.outbox.broadcast(type, data);
      this.bot?.deliver(type, data);
    },
    schedule: (delayMs, fn) => this.schedule(delayMs, fn),
  };

  /** API-010 Matchmaker → GameRoom `setup` RPC: 방 설정을 ctx.storage.put("config") (data-ark §8.2, 티켓은 해시만) */
  async setup(input: RoomSetup): Promise<{ ok: true } | { ok: false; code: "MATCH_SETUP_FAILED" }> {
    try {
      if (!ROOM_ID_PATTERN.test(input.config.roomId) || (await this.ctx.storage.get(CONFIG_KEY))) {
        return { ok: false, code: "MATCH_SETUP_FAILED" };
      }
      await this.ctx.storage.put(CONFIG_KEY, input);
      this.setupData = input;
      this.loaded = true;
      // UC-003 E2: 배정된 슬롯이 net.readyTimeoutMs 안에 `ready`하지 않으면(연결 전·인증 전 이탈 포함) 시작 전 이탈로 본다
      const t = setTimeout(() => {
        this.timers.delete(t);
        this.readyDeadline();
      }, rules.net.readyTimeoutMs);
      this.timers.add(t);
      return { ok: true };
    } catch {
      return { ok: false, code: "MATCH_SETUP_FAILED" };
    }
  }

  /** API-006 방 소켓 수락 (Hibernation). 설정 없는 방 → `error ROOM_NOT_FOUND` + 4004, net.readyTimeoutMs 안에 `ready` (DCL-005) */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return error("UPGRADE_REQUIRED");
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ slot: null } satisfies RoomAttachment);
    try {
      await this.load();
    } catch {
      this.setupData = null;
    }
    if (!this.runtime()) {
      this.outbox.fail(server, "ROOM_NOT_FOUND");
    } else {
      const t = setTimeout(() => {
        this.timers.delete(t);
        if (this.slotOf(server) === null) this.failSocket(server, "AUTH_TIMEOUT");
      }, rules.net.readyTimeoutMs);
      this.timers.add(t);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  /** 수신: 봉투·크기 → 인증 여부 → 속도 제한 → 종류별 핸들러 (handlers.ts가 메시지마다 try/catch) */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const now = Date.now();
      const parsed = parseEnvelope(message, rules);
      if (!parsed.ok || !ROOM_TYPES.has(parsed.value.type)) return this.failSocket(ws, "BAD_MESSAGE");
      const { type, data } = parsed.value;
      await this.load();
      const rt = this.runtime();
      const slot = this.slotOf(ws);
      if (!rt) return this.failSocket(ws, "ROOM_NOT_FOUND");
      // API-011 `ready` 이전 다른 메시지 = 인증 안 됨 / 휴면 복원 후 진행 상태가 없으면 경기 계속 불가
      if (type !== ROOM_IN.ready && slot === null) return this.failSocket(ws, "UNAUTHORIZED");
      if (slot !== null && !rt.match.connected.has(slot)) return this.failSocket(ws, "MATCH_ABORTED");
      if (type === ROOM_IN.ready && slot !== null) return;
      if (!this.passRate(ws, slot, type, now)) return;
      if (type === ROOM_IN.ready) return await onReady(rt, ws, data);
      const s = slot as Slot;
      if (type === ROOM_IN.state) return onState(rt, s, data, now);
      if (type === ROOM_IN.clear) return onClear(rt, ws, s, data, now);
      if (type === ROOM_IN.skill) return onSkill(rt, ws, s, data);
      if (type === ROOM_IN.armor) return onArmor(rt, ws, s, data);
      if (type === ROOM_IN.answer) return onAnswer(rt, ws, s, data);
      if (type === ROOM_IN.reaction) return onReaction(rt, s, data);
      return onTopout(rt, ws, s, data, now);
    } catch {
      this.failSocket(ws, "MATCH_ABORTED");
    }
  }

  /** FR-009 소켓 종료 = 이탈 (시작 전 무효 → OPPONENT_LEFT, 대전 중 남은 쪽 승리, 연습 세션 종료) */
  async webSocketClose(ws: WebSocket): Promise<void> {
    this.limiters.delete(ws);
    const slot = this.outbox.unbind(ws);
    try {
      ws.close();
    } catch {
      // 이미 닫힘
    }
    if (slot === null || !this.match || this.match.phase === "ended") return;
    try {
      handleDisconnect(this.ctxRoom, this.match, slot);
    } catch {
      this.abort();
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** 방 수준 `ready` 기한 (API-006 10초 규칙 — 소켓이 없는 슬롯에도 적용): 시작 전이면 무효 → 남은 쪽 OPPONENT_LEFT */
  private readyDeadline(): void {
    try {
      const rt = this.runtime();
      if (!rt || rt.match.phase !== "waiting") return;
      const missing = rt.match.config.slots.find((s) => !rt.match.ready.has(s.slot));
      if (missing) handleDisconnect(this.ctxRoom, rt.match, missing.slot);
    } catch {
      this.abort();
    }
  }

  /** NFR-003 소켓별 토큰 버킷: state·reaction 초과 = 조용히 버림, 나머지 = reject RATE_LIMITED, 지속 초과 = error + 4429 */
  private passRate(ws: WebSocket, slot: Slot | null, type: string, now: number): boolean {
    let limiter = this.limiters.get(ws);
    if (!limiter) this.limiters.set(ws, (limiter = new SocketRateLimiter(rules, now)));
    const kind = (LIMITED_KINDS as readonly string[]).includes(type) ? (type as LimitedKind) : null;
    const r = limiter.check(kind, now);
    if (r.allowed) return true;
    log.event("rate_limited", { code: "RATE_LIMITED" });
    if (r.fatal) this.failSocket(ws, "RATE_LIMITED");
    else if (slot !== null && !SILENT_DROP.has(type) && type !== ROOM_IN.topout) {
      this.outbox.reject(slot, type, "RATE_LIMITED", r.retryInMs);
    }
    return false;
  }

  /** 휴면·재기동 후 config 복원 → 경기 상태 생성 (data-ark §8.2 "ready 수신 시 복원") */
  private async load(): Promise<void> {
    if (this.loaded) return;
    this.setupData = (await this.ctx.storage.get<RoomSetup>(CONFIG_KEY)) ?? null;
    this.loaded = true;
  }

  /** 핸들러 실행 환경 — config가 있으면 경기 상태를 처음 한 번 만든다 */
  private runtime(): RoomRuntime | null {
    const setup = this.setupData;
    if (!setup) return null;
    if (!this.match) this.match = this.createMatchState(setup);
    const self = this;
    return {
      ctx: this.ctxRoom, match: this.match, setup, outbox: this.outbox,
      memo: (slot) => {
        let memo = self.memos.get(slot);
        if (!memo) self.memos.set(slot, (memo = freshMemo(self.roundActiveAt)));
        return memo;
      },
      verifyGuest: (token) => ledgerStub(self.env).verifyGuest(token),
      bind: async (ws, slot) => {
        // api-gate §5 티켓 1회용 — 사용 후 폐기 (config 저장)
        delete setup.ticketHashes[slot];
        await self.ctx.storage.put(CONFIG_KEY, setup);
        (ws as unknown as WebSocket).serializeAttachment({ slot } satisfies RoomAttachment);
        self.outbox.bind(slot, ws);
      },
      fail: (ws, code) => self.failSocket(ws as unknown as WebSocket, code),
      abort: () => self.abort(),
    };
  }

  /** match-flow 훅 주입 (봇 엔진·기록 RPC·봇 퀴즈 응답) */
  private createMatchState(setup: RoomSetup): MatchState {
    const botSlot = setup.config.slots.find((s) => s.isBot);
    if (botSlot && setup.config.botLevel) {
      this.bot = new BotDriver(botSlot.slot, setup.config.botLevel, botSlot.heroId, ARMOR_IDS, serverRandom, {
        runtime: () => (this.finished ? null : this.runtime()), schedule: (ms, fn) => this.schedule(ms, fn), rules,
      });
    }
    return createMatch(setup.config, {
      onRoundStart: (_round, seed, stage) => {
        this.memos.clear();
        const now = Date.now();
        this.roundActiveAt = now + rules.match.countdownMs;
        // FR-005 봇도 사람과 같은 seed·stage, D-18 낙하 곡선 기준 = 경기 경과 (start.matchElapsedMs와 같은 계산)
        if (this.bot && this.match) {
          this.bot.startRound(seed, stage, now, matchElapsedMs(this.match, now + rules.match.countdownMs));
        }
      },
      onEnd: (end) => void this.finish(end),
      botAnswers: (item) => (this.bot ? [this.bot.bot.planQuizAnswer(item)] : []),
    });
  }

  /** devguide §3.3 타이머 콜백마다 try/catch → 경기 무효 (UC-005 E2) */
  private schedule(delayMs: number, fn: () => void): () => void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      try {
        fn();
      } catch {
        log.event("reject", { code: "MATCH_ABORTED" });
        this.abort();
      }
    }, Math.max(0, delayMs));
    this.timers.add(t);
    return () => {
      clearTimeout(t);
      this.timers.delete(t);
    };
  }

  /** 처리 오류 → 무효 경기 (기록 없음 — TBL-002), `error MATCH_ABORTED` + 1011 */
  private abort(): void {
    if (this.finished) return;
    this.aborting = true;
    if (this.match && this.match.phase !== "ended") abortMatch(this.ctxRoom, this.match);
    else void this.finish({ winnerSlot: null, reason: "disconnect", voided: true });
  }

  /** 경기 끝 (hooks.onEnd): 기록 RPC + `matchEnd` (results.ts) → Close 1000 match_end → 상태 삭제 */
  private async finish(end: MatchEnd): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    try {
      if (this.aborting) this.outbox.failAll("MATCH_ABORTED");
      // UC-003 E2: 시작 전 이탈 → 남은 쪽 OPPONENT_LEFT (Close 4410, 클라이언트는 매칭 대기로)
      else if (end.voided && this.match && this.match.round === 0) this.outbox.failAll("OPPONENT_LEFT");
      else if (this.match) await finishMatch(this.ctxRoom, this.match, end, this.ledger());
    } catch {
      log.event("storage_fail", { code: "STORAGE_UNAVAILABLE" });
    }
    this.outbox.closeAll(CLOSE_NORMAL, CLOSE_REASON.matchEnd);
    // `ready` 전 소켓 — 인증 기한 타이머를 위에서 지웠으므로 여기서 닫는다 (끝난 방에 소켓이 남지 않게)
    for (const ws of this.ctx.getWebSockets()) if (this.slotOf(ws) === null) this.outbox.fail(ws, "ROOM_NOT_FOUND");
    try {
      await this.ctx.storage.deleteAll();
    } catch {
      log.event("storage_fail", { code: "STORAGE_UNAVAILABLE" });
    }
    this.setupData = null;
    this.bot = null;
  }

  /** D-04 GameRoom → Matchmaker 기록 RPC (FR-068 클라이언트 직접 기록 없음) */
  private ledger(): LedgerRpc {
    const stub = ledgerStub(this.env);
    return {
      recordMatch: (report) => stub.recordMatch(report) as Promise<RecordOutcome>,
      recordPractice: (report) => stub.recordPractice(report) as Promise<PracticeOutcome>,
    };
  }

  private slotOf(ws: WebSocket): Slot | null {
    try {
      return (ws.deserializeAttachment() as RoomAttachment | null)?.slot ?? null;
    } catch {
      return null;
    }
  }

  /** API-031 치명 오류 — 소켓 종료. 경기 중인 슬롯이었으면 이탈과 같이 처리 (FR-009) */
  private failSocket(ws: WebSocket | SocketLike, code: WsErrorCode): void {
    if (code === "UNAUTHORIZED" || code === "AUTH_TIMEOUT" || code === "TICKET_INVALID") {
      log.event("auth_fail", { code });
    }
    const slot = this.outbox.unbind(ws as SocketLike);
    this.outbox.fail(ws as SocketLike, code);
    if (slot === null || !this.match || this.match.phase === "ended") return;
    try {
      handleDisconnect(this.ctxRoom, this.match, slot);
    } catch {
      this.abort();
    }
  }
}
