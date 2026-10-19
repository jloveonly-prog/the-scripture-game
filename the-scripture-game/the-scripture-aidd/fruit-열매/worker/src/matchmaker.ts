// matchmaker.ts — Matchmaker DO 셸만 — 생성자 마이그레이션·로비 소켓 수명주기·메시지 분기·RPC 메서드(서비스 위임), 핸들러마다 try/catch
// TASK-032 | REQ-002 REQ-004 REQ-005 REQ-006 REQ-014 REQ-015 FR-008 FR-012 FR-018~FR-021 FR-023 FR-068 | ARCH-010
// ARCH-014
// API-001~API-005 API-007~API-010 API-031 | data-ark §7·§8.1 | D-04 (원장 호스트) | architecture §9.7 (Hibernation)
// 로비 흐름(join·cancel·짝짓기·방 배정)은 lobby/lobby-flow.ts (task-wall §3.3 #10-1 — D-02 300줄 분할).
import { DurableObject } from "cloudflare:workers";
import { rules } from "./content";
import type { Env } from "./env";
import type { GameRoom } from "./game-room";
import { LobbyFlow } from "./lobby/lobby-flow";
import { log } from "./log";
import { error } from "./routes/respond";
import { GuestService, type CreateGuestOutcome, type VerifyOutcome } from "./services/guest-service";
import { HistoryService, type HistoryPage, type MatchReport, type RecordOutcome } from "./services/history-service";
import { ProgressService, type PracticeOutcome, type PracticeReport } from "./services/progress-service";
import { RankingService, type LeaderboardView } from "./services/ranking-service";
import { runMigrations, type DurableStorageLike } from "./storage/migrations";
import { selectStorage } from "./storage/select-storage";

/** D-04 원장 접근 = 전역 Matchmaker 1개 RPC (`idFromName("global")`) */
export function ledgerStub(env: Env): DurableObjectStub<Matchmaker> {
  const ns = env.MATCHMAKER as unknown as DurableObjectNamespace<Matchmaker>;
  return ns.get(ns.idFromName("global"));
}

type AuthResult = { ok: true; guestId: string } | { ok: false; code: "UNAUTHORIZED" | "STORAGE_UNAVAILABLE" };
type Failure = { ok: false; code: "STORAGE_UNAVAILABLE" | "INTERNAL_ERROR" };
type VerifyFailure = Extract<VerifyOutcome, { ok: false }>;
const UNAVAILABLE = { ok: false, code: "STORAGE_UNAVAILABLE" } as const;
const INTERNAL = { ok: false, code: "INTERNAL_ERROR" } as const;

interface Services { guests: GuestService; history: HistoryService; ranking: RankingService; progress: ProgressService }

export class Matchmaker extends DurableObject<Env> {
  /** 원장 마이그레이션 실패 시 null → RPC는 STORAGE_UNAVAILABLE (migrations.ts MigrationError 규약) */
  private svc: Services | null = null;
  private readonly lobby: LobbyFlow;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.lobby = new LobbyFlow({
      sockets: () => this.ctx.getWebSockets(),
      services: () => this.svc,
      setupRoom: (roomId, setup) => {
        const ns = this.env.GAME_ROOM as unknown as DurableObjectNamespace<GameRoom>;
        return ns.get(ns.idFromName(roomId)).setup(setup);
      },
    });
    void ctx.blockConcurrencyWhile(async () => {
      try {
        // data-ark §7 (DCL-001): 생성자에서 단계 실행 → FR-072 키가 둘 다 있을 때만 Supabase
        const durable = ctx.storage as unknown as DurableStorageLike;
        runMigrations(durable);
        const storage = selectStorage(env, durable);
        const guests = new GuestService(storage, rules);
        const ranking = new RankingService(storage, rules, () => Date.now());
        this.svc = { guests, ranking, history: new HistoryService(storage, rules, ranking, guests),
          progress: new ProgressService(storage, rules) };
      } catch {
        log.event("storage_fail", { code: "STORAGE_UNAVAILABLE" });
        this.svc = null;
      }
    });
  }

  /** API-005 로비 소켓 수락 (Hibernation — ctx.acceptWebSocket) */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return error("UPGRADE_REQUIRED");
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    this.lobby.accept(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** API-007·API-008 (lobby-flow가 메시지 종류마다 try/catch) */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      await this.lobby.message(ws, message);
    } catch {
      this.lobby.cleanup(ws);
      try {
        ws.close(1011, "MATCH_SETUP_FAILED");
      } catch {
        // 이미 닫힘
      }
    }
  }

  /** FR-020·UC-003 E1: 취소 없이 닫혀도 같은 정리 (유령 매칭 없음) */
  async webSocketClose(ws: WebSocket): Promise<void> {
    this.lobby.cleanup(ws);
    try {
      ws.close();
    } catch {
      // 이미 닫힌 소켓 — 정리만으로 충분
    }
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.lobby.cleanup(ws);
  }

  // ── RPC 파사드 (D-04): 메서드마다 try/catch(guard), 실패는 {ok:false, code} 값 — 예외를 DO 밖으로 던지지 않는다 (devguide §3.3)

  /** 원장 준비 실패(마이그레이션) → missing, 처리 중 예외 → failed */
  private async guard<T>(missing: T, failed: T, run: (svc: Services) => Promise<T>): Promise<T> {
    try {
      return this.svc ? await run(this.svc) : missing;
    } catch {
      log.event("storage_fail", { code: "STORAGE_UNAVAILABLE" });
      return failed;
    }
  }

  /** API-001 게스트 생성 (FR-012) */
  async createGuest(nickname: unknown) {
    return this.guard<CreateGuestOutcome | Failure>(UNAVAILABLE, INTERNAL, (svc) => svc.guests.createGuest(nickname));
  }

  /** API-002 내 프로필 */
  async getMe(token: unknown) {
    return this.guard<Awaited<ReturnType<GuestService["getMe"]>> | Failure>(UNAVAILABLE, INTERNAL,
      (svc) => svc.guests.getMe(token));
  }

  /** API-011 `ready` 토큰 검증 (GameRoom → Matchmaker) — guestId만 돌려준다 */
  async verifyGuest(token: unknown): Promise<AuthResult> {
    return this.guard<AuthResult>(UNAVAILABLE, UNAVAILABLE, async (svc) => {
      const r = await svc.guests.verifyToken(token);
      return r.ok ? { ok: true, guestId: r.profile.guestId } : r;
    });
  }

  /** API-003 내 전적 (limit·before는 문자열 그대로 — 범위 검증은 history-service INVALID_QUERY) */
  async listMatches(token: unknown, query: { limit: string | null; before: string | null }) {
    return this.guard<HistoryPage | VerifyFailure | Failure>(UNAVAILABLE, INTERNAL, async (svc) => {
      const auth = await svc.guests.verifyToken(token);
      if (!auth.ok) return auth;
      return svc.history.listMatches(auth.profile.guestId, {
        limit: query.limit === null ? undefined : Number(query.limit), before: query.before ?? undefined });
    });
  }

  /** API-004 랭킹 상위 + 내 순위 (ranking-service의 StorageError → STORAGE_UNAVAILABLE) */
  async getLeaderboard(token: unknown) {
    type Result = { ok: true; data: LeaderboardView } | VerifyFailure;
    return this.guard<Result>(UNAVAILABLE, UNAVAILABLE, async (svc) => {
      const auth = await svc.guests.verifyToken(token);
      if (!auth.ok) return auth;
      return { ok: true, data: await svc.ranking.getLeaderboard(auth.profile.guestId) };
    });
  }

  /** FR-068 경기 기록 (GameRoom만 호출 — 외부 엔드포인트 없음) */
  async recordMatch(report: MatchReport): Promise<RecordOutcome> {
    const failed: RecordOutcome = { saved: false, slots: [] };
    return this.guard(failed, failed, (svc) => svc.history.recordMatch(report));
  }

  /** FR-067 연습 세션 기록 (architecture §9.5) */
  async recordPractice(report: PracticeReport): Promise<PracticeOutcome> {
    const failed: PracticeOutcome = { saved: false, achievements: [] };
    return this.guard(failed, failed, (svc) => svc.progress.recordPractice(report));
  }
}
