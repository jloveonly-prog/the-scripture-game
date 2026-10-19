// lobby-flow.ts — 로비 소켓 1개 수명주기(join 기한·join·cancel·종료 정리)와 방 배정 순서(setup RPC → matched → Close)만
// TASK-032 | REQ-004 REQ-005 REQ-006 FR-008 FR-018 FR-019 FR-020 FR-021 FR-023 NFR-003 | ARCH-010 | API-005
// API-007~API-010
// API-031 | data-ark §8.1 | D-19 | architecture §9.7 (대기열 = 열린 소켓의 첨부 — 휴면 후 getWebSockets()로 재구성)
// task-wall §3.3 #10-1 (D-02 분할: matchmaker.ts 300줄 초과 → DO 셸·RPC 파사드와 로비 흐름 분리). cloudflare:workers 비의존.
import { rules } from "../content";
import { log } from "../log";
import {
  CLOSE_NORMAL, CLOSE_REASON, envelope, errorEnvelope, LOBBY_IN, LOBBY_OUT, PROTOCOL_VERSION, WS_ERRORS,
  type WsErrorCode,
} from "../protocol/messages";
import { SocketRateLimiter } from "../protocol/rate-limit";
import { parseEnvelope, validateJoin } from "../protocol/validate";
import type { MatchModeAll } from "../room/match-flow";
import { sha256Hex, type GuestService } from "../services/guest-service";
import type { ProgressService } from "../services/progress-service";
import type { BotLevel, Slot } from "../storage/adapter";
import {
  botSetup, botView, generateTicket, humanView, inviteExpired, issueInviteCode, matchedData, pickOpponent,
  practiceSetup, randomBotHero, versusSetup, waitingData, type LobbyAttachment, type OpponentView, type RoomSetup,
  type Seat,
} from "./pairing";

/** Matchmaker(DO 셸)가 주입하는 것 */
export interface LobbyDeps {
  /** ctx.getWebSockets() */
  sockets(): WebSocket[];
  /** 원장 서비스 (마이그레이션 실패면 null → STORAGE_UNAVAILABLE) */
  services(): { guests: GuestService; progress: ProgressService } | null;
  /** GameRoom `setup` RPC (API-010) */
  setupRoom(roomId: string, setup: RoomSetup): Promise<{ ok: boolean }>;
}

/** 방 배정 대상 1명 (API-010 `matched` 수신자) */
interface Member { ws: WebSocket; slot: Slot; ticket: string }
interface Joined { ws: WebSocket; att: LobbyAttachment }

/** 서버 무작위 [0,1) — crypto.getRandomValues (초대 코드·봇 위인) */
function serverRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export class LobbyFlow {
  private readonly limiters = new Map<WebSocket, SocketRateLimiter>();
  private readonly timers = new Map<WebSocket, Array<ReturnType<typeof setTimeout>>>();
  private readonly closed = new WeakSet<WebSocket>();
  /** 방 배정 진행 중(대기열·코드 조회에서 제외 — 이중 짝짓기 방지) */
  private readonly busy = new WeakSet<WebSocket>();
  /** 이미 두 명이 들어간 초대 코드 → 만료 시각 (UC-004 E2 INVITE_FULL, 메모리만) */
  private readonly usedInvites = new Map<string, number>();

  constructor(private readonly deps: LobbyDeps) {}

  /** API-005 수락 직후 — 첨부 없음(join 전), net.joinTimeoutMs 안에 `join` 없으면 AUTH_TIMEOUT (DCL-005) */
  accept(ws: WebSocket): void {
    ws.serializeAttachment(null);
    this.addTimer(ws, setTimeout(() => {
      if (!this.closed.has(ws) && !this.busy.has(ws) && !this.att(ws)) this.fail(ws, "AUTH_TIMEOUT");
    }, rules.net.joinTimeoutMs));
  }

  /** API-007·API-008 분기 — 봉투·크기(BAD_MESSAGE) → 전체 속도 제한(지속 초과 RATE_LIMITED) → 종류별 처리 */
  async message(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const now = Date.now();
    const parsed = parseEnvelope(raw, rules);
    if (!parsed.ok || (parsed.value.type !== LOBBY_IN.join && parsed.value.type !== LOBBY_IN.cancel)) {
      return this.fail(ws, "BAD_MESSAGE");
    }
    let limiter = this.limiters.get(ws);
    if (!limiter) this.limiters.set(ws, (limiter = new SocketRateLimiter(rules, now)));
    const rate = limiter.check(null, now);
    if (!rate.allowed) {
      log.event("rate_limited", { gid: this.att(ws)?.guestId, code: "RATE_LIMITED" });
      if (rate.fatal) this.fail(ws, "RATE_LIMITED");
      return;
    }
    if (parsed.value.type === LOBBY_IN.join) await this.onJoin(ws, parsed.value.data, now);
    else this.onCancel(ws);
  }

  /** FR-020·UC-003 E1: 첨부·타이머·속도 제한기 정리 — 대기열·초대 코드가 함께 사라진다 (UC-004 E3) */
  cleanup(ws: WebSocket): void {
    this.closed.add(ws);
    for (const t of this.timers.get(ws) ?? []) clearTimeout(t);
    this.timers.delete(ws);
    this.limiters.delete(ws);
    try {
      ws.serializeAttachment(null);
    } catch {
      // 닫힌 소켓의 첨부는 이미 사라짐
    }
  }

  /** API-007 `join` — 검증 → 토큰(원장) → 중복 대기(ALREADY_QUEUED) → 모드별 처리. 예기치 못한 오류 = MATCH_SETUP_FAILED */
  private async onJoin(ws: WebSocket, data: Record<string, unknown>, now: number): Promise<void> {
    try {
      const v = validateJoin(data, rules);
      if (!v.ok) return this.fail(ws, v.code);
      if (this.att(ws) || this.busy.has(ws)) return this.fail(ws, "ALREADY_QUEUED");
      const svc = this.deps.services();
      if (!svc) return this.fail(ws, "STORAGE_UNAVAILABLE");
      const auth = await svc.guests.verifyToken(v.value.token);
      if (!auth.ok) return this.fail(ws, auth.code);
      if (this.closed.has(ws)) return;
      const p = auth.profile;
      if (this.joined().some((j) => j.att.guestId === p.guestId)) return this.fail(ws, "ALREADY_QUEUED");
      const att: LobbyAttachment = { guestId: p.guestId, nickname: p.nickname, rating: p.rating, heroId: v.value.heroId,
        mode: v.value.mode, inviteCode: null, inviteRoomId: null, inviteExpiresAt: null, queuedAt: now };
      const me = { ws, att };
      if (v.value.mode === "random") return await this.joinRandom(me);
      if (v.value.mode === "invite") {
        return v.value.roomCode ? await this.joinInvite(me, v.value.roomCode, now) : this.hostInvite(me, now);
      }
      if (v.value.mode === "bot") return await this.startSolo(me, "bot", v.value.botLevel as BotLevel);
      return await this.startSolo(me, "practice", null);
    } catch {
      log.event("storage_fail", { code: "MATCH_SETUP_FAILED" });
      this.fail(ws, "MATCH_SETUP_FAILED");
    }
  }

  /** API-008 `cancel` — join 전·방 배정 중이면 무시, 아니면 대기열 제거·코드 무효화 후 Close 1000 cancelled */
  private onCancel(ws: WebSocket): void {
    try {
      if (!this.att(ws) || this.busy.has(ws)) return;
      this.closeWith(ws, CLOSE_NORMAL, CLOSE_REASON.cancelled);
    } catch {
      this.cleanup(ws);
    }
  }

  /** FR-018 랜덤 매칭: 대기자가 있으면 Elo 근접 짝(먼저 기다린 쪽 = 슬롯 1), 없으면 대기 (API-009) */
  private async joinRandom(me: Joined): Promise<void> {
    const partner = pickOpponent(me.att, this.joined().filter((j) => j.att.mode === "random"));
    if (!partner) return this.wait(me);
    await this.startVersus("random", crypto.randomUUID(), partner, me);
  }

  /** FR-019 방장: 코드 발급(D-19) + 방 ID 예약, invite.ttlMs 뒤 INVITE_EXPIRED (Close 4408) */
  private hostInvite(me: Joined, now: number): void {
    const taken = new Set<string>(this.usedInvites.keys());
    for (const j of this.joined()) if (j.att.inviteCode) taken.add(j.att.inviteCode);
    me.att.inviteCode = issueInviteCode(serverRandom, rules, taken);
    me.att.inviteRoomId = crypto.randomUUID();
    me.att.inviteExpiresAt = now + rules.invite.ttlMs;
    this.addTimer(me.ws, setTimeout(() => {
      if (!this.closed.has(me.ws) && !this.busy.has(me.ws)) this.fail(me.ws, "INVITE_EXPIRED");
    }, rules.invite.ttlMs));
    this.wait(me);
  }

  /** FR-019 코드 입장: 없는·만료 → INVITE_NOT_FOUND (UC-004 E1), 이미 찬 방 → INVITE_FULL (E2) */
  private async joinInvite(me: Joined, code: string, now: number): Promise<void> {
    for (const [c, until] of this.usedInvites) if (until <= now) this.usedInvites.delete(c);
    const host = this.joined().find((j) => j.att.inviteCode === code);
    if (!host) return this.fail(me.ws, this.usedInvites.has(code) ? "INVITE_FULL" : "INVITE_NOT_FOUND");
    if (inviteExpired(host.att, now)) {
      this.fail(host.ws, "INVITE_EXPIRED");
      return this.fail(me.ws, "INVITE_NOT_FOUND");
    }
    this.usedInvites.set(code, host.att.inviteExpiresAt as number);
    await this.startVersus("invite", host.att.inviteRoomId as string, host, me);
  }

  /** 대기 시작 — 첨부 저장(휴면 복원 가능, data-ark §8.1) + API-009 `waiting` */
  private wait(me: Joined): void {
    me.ws.serializeAttachment(me.att);
    this.send(me.ws, LOBBY_OUT.waiting, waitingData(me.att));
  }

  /** 사람 대 사람 방 배정 (a = 슬롯 1, b = 슬롯 2) */
  private async startVersus(mode: "random" | "invite", roomId: string, a: Joined, b: Joined): Promise<void> {
    const seats: Seat[] = [];
    await this.launch(roomId, mode, async ([ha, hb]) => {
      seats.push(await this.seat(a.att), await this.seat(b.att));
      return versusSetup(roomId, mode, seats[0], seats[1], [ha, hb], Date.now());
    }, [{ ws: a.ws, slot: 1, ticket: generateTicket() }, { ws: b.ws, slot: 2, ticket: generateTicket() }],
    (m) => humanView(seats[m.slot === 1 ? 1 : 0]));
  }

  /** FR-021 봇 방(봇 위인 무작위) / FR-023 연습 방 — 즉시 배정 */
  private async startSolo(me: Joined, mode: "bot" | "practice", level: BotLevel | null): Promise<void> {
    const roomId = crypto.randomUUID();
    const hero = randomBotHero(serverRandom);
    await this.launch(roomId, mode, async ([h]) => {
      const seat = await this.seat(me.att);
      return mode === "bot" ? botSetup(roomId, seat, level as BotLevel, hero, h, Date.now())
        : practiceSetup(roomId, seat, h, Date.now());
    }, [{ ws: me.ws, slot: 1, ticket: generateTicket() }],
    () => (mode === "bot" ? botView(hero, level as BotLevel) : null));
  }

  /**
   * GameRoom `setup` RPC(티켓은 SHA-256만) 완료 후 각자에게 API-010 `matched` → Close 1000 matched.
   * 실패 시 모두 `error MATCH_SETUP_FAILED` + 1011, 대기열 복귀 없음 (API-010).
   */
  private async launch(roomId: string, mode: MatchModeAll, build: (hashes: string[]) => Promise<RoomSetup>,
    members: Member[], opponentOf: (m: Member) => OpponentView | null): Promise<void> {
    for (const m of members) this.busy.add(m.ws);
    try {
      const setup = await build(await Promise.all(members.map((m) => sha256Hex(m.ticket))));
      const result = await this.deps.setupRoom(roomId, setup);
      if (!result.ok) throw new Error("setup");
    } catch {
      log.event("storage_fail", { code: "MATCH_SETUP_FAILED" });
      for (const m of members) this.fail(m.ws, "MATCH_SETUP_FAILED");
      return;
    }
    for (const m of members) {
      if (this.closed.has(m.ws)) continue;
      this.send(m.ws, LOBBY_OUT.matched, matchedData(PROTOCOL_VERSION, roomId, m.ticket, m.slot, mode, opponentOf(m)));
      this.closeWith(m.ws, CLOSE_NORMAL, CLOSE_REASON.matched);
    }
  }

  /** 방 설정용 좌석 — TBL-004 진행 기록(없으면 0판) */
  private async seat(att: LobbyAttachment): Promise<Seat> {
    const svc = this.deps.services();
    if (!svc) throw new Error("ledger unavailable");
    const progress = await svc.progress.getProgress(att.guestId);
    return { guestId: att.guestId, nickname: att.nickname, rating: att.rating, heroId: att.heroId,
      roundsPlayed: progress?.roundsPlayed ?? 0, consecutiveRoundLosses: progress?.consecutiveRoundLosses ?? 0 };
  }

  /** 열린·대기 중 소켓과 첨부 (architecture §9.7) */
  private joined(): Joined[] {
    const list: Joined[] = [];
    for (const ws of this.deps.sockets()) {
      if (this.closed.has(ws) || this.busy.has(ws) || ws.readyState !== WebSocket.READY_STATE_OPEN) continue;
      const att = this.att(ws);
      if (att) list.push({ ws, att });
    }
    return list;
  }

  private att(ws: WebSocket): LobbyAttachment | null {
    try {
      return (ws.deserializeAttachment() as LobbyAttachment | null) ?? null;
    } catch {
      return null;
    }
  }

  private send(ws: WebSocket, type: string, data: unknown): void {
    try {
      ws.send(envelope(type, data));
    } catch {
      this.cleanup(ws);
    }
  }

  /** API-031 `error` 후 지정 Close 코드 (api-gate §4.3) */
  private fail(ws: WebSocket, code: WsErrorCode): void {
    if (this.closed.has(ws)) return;
    if (code === "UNAUTHORIZED" || code === "AUTH_TIMEOUT") log.event("auth_fail", { code });
    try {
      ws.send(errorEnvelope(code));
    } catch {
      // 보낼 수 없으면 닫기만
    }
    this.closeWith(ws, WS_ERRORS[code].close, code);
  }

  private closeWith(ws: WebSocket, code: number, reason: string): void {
    this.cleanup(ws);
    try {
      ws.close(code, reason);
    } catch {
      // 이미 닫힘
    }
  }

  private addTimer(ws: WebSocket, t: ReturnType<typeof setTimeout>): void {
    const list = this.timers.get(ws) ?? [];
    list.push(t);
    this.timers.set(ws, list);
  }
}
