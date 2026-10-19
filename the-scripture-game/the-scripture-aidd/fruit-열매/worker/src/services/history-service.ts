// history-service.ts — 경기 기록 검증·저장 위임·전적 페이지 조립만
// TASK-020-2 | REQ-014 REQ-015 FR-009 FR-063 FR-065~FR-070 | ARCH-014 | API-003 API-030 | TBL-001~TBL-005 TBL-018
// `elo`·`ledger`
// data-ark §6.2 경기 기록은 GameRoom → Matchmaker RPC `recordMatch`만, 원자 기록 1회(storage.recordMatch), 참가자 2행·봇 1행 이하,
// verse_ref 존재 검증. Elo는 사람 대 사람만(OQ #5). 실패는 예외 대신 saved=false (UC-015 E2).
import { heroesById, versesByRef, type Rules } from "../content";
import { log } from "../log";
import {
  StorageError, type AchievementGrant, type AchievementId, type BotLevel, type EndReason, type HeroId,
  type MatchHistoryRow,
  type MatchMode, type MatchPlayerInput, type ProgressRow, type ProgressUpdate, type Slot, type StorageAdapter,
} from "../storage/adapter";
import { updateRatings } from "./elo";
import type { GuestService } from "./guest-service";
import { earnedAchievements, growthFrom, personalRecord, progressAfterMatch, type Growth } from "./progress-service";
import type { RankingService } from "./ranking-service";

/** TBL-003 슬롯 통계 */
export interface SlotStats {
  maxCombo: number;
  linesCleared: number;
  attackSent: number;
  tetrisCount: number;
  piecesPlaced: number;
  quizCorrect: number;
  quizAnswered: number;
}

/** GameRoom(room/results.ts)이 보내는 경기 결과 — RPC recordMatch 입력 */
export interface MatchReport {
  matchId: string;
  mode: MatchMode;
  botLevel: BotLevel | null;
  winnerSlot: Slot;
  endReason: EndReason;
  roundsPlayed: number;
  durationMs: number;
  verseRef: string;
  players: ReadonlyArray<{
    slot: Slot;
    guestId: string | null;
    isBot: boolean;
    heroId: HeroId;
    roundsWon: number;
    /** 라운드 순서대로 이 슬롯의 승패 (FR-067 연속 패배) */
    roundResults: ReadonlyArray<"win" | "loss">;
    stats: SlotStats;
  }>;
}

/** 슬롯별 기록 결과 → API-030 `you` 원천 */
export interface SlotOutcome {
  slot: Slot;
  rating: { before: number; after: number } | null;
  growth: Growth | null;
  achievements: AchievementId[];
}

export interface RecordOutcome {
  saved: boolean;
  slots: SlotOutcome[];
}

export type HistoryPage =
  | {
    ok: true;
    data: Array<MatchHistoryRow & { result: "win" | "loss" }>;
    meta: { size: number; nextBefore: string | null };
  }
  | { ok: false; code: "INVALID_QUERY" | "STORAGE_UNAVAILABLE" };

/** ISO-8601 UTC 밀리초 (api-gate §2 시간 표기) */
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** data-ark §6.2 서비스 검증: 2행(슬롯 1·2), 봇 ≤ 1행, mode=bot ⇔ 봇 1행 + 난이도, 사람 행 guestId, 위인·구절 존재 */
export function validateReport(report: MatchReport): string | null {
  const p = report.players;
  if (p.length !== 2 || p[0].slot === p[1].slot || !p.every((x) => x.slot === 1 || x.slot === 2)) return "players";
  const bots = p.filter((x) => x.isBot).length;
  if (bots > 1 || (report.mode === "bot") !== (bots === 1)
    || (report.mode === "bot") !== (report.botLevel !== null)) return "bot";
  if (p.some((x) => (x.isBot ? x.guestId !== null : !x.guestId))) return "guest";
  if (p.some((x) => !heroesById.has(x.heroId))) return "hero";
  if (!versesByRef.has(report.verseRef)) return "verse";
  if (report.winnerSlot !== 1 && report.winnerSlot !== 2) return "winner";
  return null;
}

export class HistoryService {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly rules: Rules,
    private readonly ranking: RankingService,
    private readonly guests: GuestService,
  ) {}

  /** FR-068 경기 1건 기록 (UC-015 6단계, UC-016 4단계): Elo(사람 대 사람) + 진행 기록 + 업적을 한 트랜잭션으로 */
  async recordMatch(report: MatchReport): Promise<RecordOutcome> {
    const invalid = validateReport(report);
    const failed = (): RecordOutcome => ({
      saved: false, slots: report.players.map((x) => ({ slot: x.slot, rating: null, growth: null, achievements: [] })),
    });
    if (invalid) {
      log.event("storage_fail", { code: "INTERNAL_ERROR" });
      return failed();
    }
    try {
      const humans = report.players.filter((x) => !x.isBot);
      const prev = new Map<string, ProgressRow | null>();
      for (const h of humans) prev.set(h.guestId!, await this.storage.getProgress(h.guestId!));
      const ratings = report.mode === "bot" ? null : await this.eloFor(report);
      const progress: ProgressUpdate[] = [];
      const grants: AchievementGrant[] = [];
      const outcomes: SlotOutcome[] = [];
      for (const x of report.players) {
        const record = personalRecord(x.stats, report.durationMs);
        const rating = ratings ? ratings.get(x.slot) ?? null : null;
        if (!x.isBot) {
          const before = prev.get(x.guestId!) ?? null;
          progress.push(progressAfterMatch(x.guestId!, before, x.roundResults, record));
          for (const id of earnedAchievements(x.heroId, x.stats.tetrisCount,
            this.rules)) grants.push({ guestId: x.guestId!, achievementId: id });
          outcomes.push({ slot: x.slot, rating, growth: growthFrom(before, record), achievements: [] });
        } else outcomes.push({ slot: x.slot, rating: null, growth: null, achievements: [] });
      }
      const toInput = (x: MatchReport["players"][number]): MatchPlayerInput => ({
        slot: x.slot, guestId: x.guestId, isBot: x.isBot, heroId: x.heroId, roundsWon: x.roundsWon,
        ratingBefore: ratings?.get(x.slot)?.before ?? null, ratingAfter: ratings?.get(x.slot)?.after ?? null,
        ...x.stats,
      });
      // validateReport가 정확히 2행을 보장한다 (data-ark §6.2)
      const players: [MatchPlayerInput, MatchPlayerInput] = [toInput(report.players[0]), toInput(report.players[1])];
      const result = await this.storage.recordMatch({
        matchId: report.matchId, mode: report.mode, botLevel: report.botLevel, winnerSlot: report.winnerSlot,
        endReason: report.endReason, roundsPlayed: report.roundsPlayed, durationMs: report.durationMs,
        verseRef: report.verseRef,
        players, progress, achievements: grants,
      });
      for (const o of outcomes) {
        const guestId = report.players.find((x) => x.slot === o.slot)?.guestId;
        o.achievements = result.newAchievements.filter((a) => a.guestId === guestId).map((a) => a.achievementId);
        if (guestId && o.rating) this.guests.updateCachedRating(guestId, o.rating.after);
      }
      if (ratings) this.ranking.invalidate();
      return { saved: true, slots: outcomes };
    } catch (err) {
      log.event("storage_fail", { code: err instanceof StorageError ? err.code : "INTERNAL_ERROR" });
      return failed();
    }
  }

  /** FR-070 사람 대 사람 Elo (K = rules.elo.k) — 현재 레이팅은 원장(getRank)에서 */
  private async eloFor(report: MatchReport): Promise<Map<Slot, { before: number; after: number }>> {
    const [a, b] = report.players;
    const ra = await this.storage.getRank(a.guestId!);
    const rb = await this.storage.getRank(b.guestId!);
    if (!ra || !rb) throw new StorageError("rating lookup");
    const next = updateRatings(ra.rating, rb.rating, report.winnerSlot === a.slot ? 1 : 0, this.rules.elo.k);
    return new Map([
      [a.slot, { before: ra.rating, after: next.a }],
      [b.slot, { before: rb.rating, after: next.b }],
    ]);
  }

  /** API-003 내 전적 최신순 키셋 페이지 (limit 기본 historyPageDefault, 1~historyPageMax, before ISO-8601) */
  async listMatches(guestId: string, query: { limit?: unknown; before?: unknown }): Promise<HistoryPage> {
    const l = this.rules.ledger;
    const limit = query.limit === undefined || query.limit === null ? l.historyPageDefault : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > l.historyPageMax) return { ok: false, code: "INVALID_QUERY" };
    const before = query.before === undefined || query.before === null ? null : query.before;
    if (before !== null && (typeof before !== "string" || !ISO_PATTERN.test(before)
      || Number.isNaN(Date.parse(before)))) {
      return { ok: false, code: "INVALID_QUERY" };
    }
    try {
      const rows = await this.storage.listMatches(guestId, { limit, before });
      const data = rows.map((r) => ({ ...r, result: (r.winnerSlot === r.me.slot ? "win" : "loss") as "win" | "loss" }));
      return { ok: true, data, meta: { size: data.length, nextBefore: data.length === limit
        ? data[data.length - 1].playedAt : null } };
    } catch (err) {
      log.event("storage_fail", { gid: guestId, code: "STORAGE_UNAVAILABLE" });
      if (err instanceof StorageError) return { ok: false, code: "STORAGE_UNAVAILABLE" };
      throw err;
    }
  }
}
