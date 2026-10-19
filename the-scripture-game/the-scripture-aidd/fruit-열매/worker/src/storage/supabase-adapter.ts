// supabase-adapter.ts — @supabase/supabase-js로 같은 인터페이스 구현만 (rpc('record_match')·rpc('create_guest'))
// TASK-004 | REQ-016 FR-072 NFR-004 C-004 | TBL-001~TBL-006 | data-ark §6.3 | ARCH-014 | D-05
// service role 키는 Worker 환경에서만 이 생성자로 들어온다 — 로그·응답에 쓰지 않는다 (봉인 제1·2계명)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AchievementGrant, AchievementId, BotLevel, CreateGuestResult, EndReason, HeroId, LeaderboardRow, MatchHistoryQuery,
  MatchHistoryRow, MatchMode, MatchRecordInput, MatchRecordResult, NewGuest, PracticeRecordInput, PracticeRecordResult,
  ProfileRow, ProgressRow, ProgressUpdate, Slot, StorageAdapter,
} from "./adapter";
import { StorageError } from "./adapter";

type Json = Record<string, unknown>;
interface DbError {
  code?: string;
  message?: string;
}

const PROFILE_COLUMNS = "id, nickname, rating, created_at, updated_at";

// data-ark §1·D-05: 두 저장소 모두 ISO-8601 UTC 밀리초 문자열로 반환 (timestamptz → toISOString)
function toIso(value: unknown): string {
  return new Date(String(value)).toISOString();
}

function toNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function fail(operation: string, error: DbError): StorageError {
  return new StorageError(operation, new Error(error.code ? `${error.code}` : "supabase error"));
}

function toProfile(row: Json): ProfileRow {
  return {
    guestId: String(row.id),
    nickname: String(row.nickname),
    rating: Number(row.rating),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function progressPayload(update: ProgressUpdate): Json {
  return {
    guest_id: update.guestId,
    rounds_played: update.roundsPlayed,
    consecutive_round_losses: update.consecutiveRoundLosses,
    last_max_combo: update.lastMaxCombo,
    last_attack_per_min: update.lastAttackPerMin,
    last_quiz_rate: update.lastQuizRate,
  };
}

/** LIKE 특수 문자(\ % _) 이스케이프 — 닉네임 허용 문자 `_`가 와일드카드로 해석되지 않게 (FR-012) */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** Supabase Postgres 구현 — SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY가 둘 다 있을 때만 생성 (select-storage.ts) */
export class SupabaseStorageAdapter implements StorageAdapter {
  readonly kind = "supabase" as const;
  private readonly db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    // Worker는 세션을 저장하지 않는다 — 브라우저 인증 기능 끔
    this.db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  /** 네트워크 예외(UC-021 E2 연결 실패)까지 StorageError로 통일 */
  private async run<T>(operation: string, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (err) {
      throw err instanceof StorageError ? err : new StorageError(operation, err);
    }
  }

  // FR-012 닉네임 사전 조회 — idx_profiles_nickname(lower) 대소문자 무시
  nicknameExists(nickname: string): Promise<boolean> {
    return this.run("nicknameExists", async () => {
      const { data, error } = await this.db.from("profiles").select("id").ilike("nickname", escapeLike(nickname)).limit(1);
      if (error) throw fail("nicknameExists", error);
      return (data ?? []).length > 0;
    });
  }

  // FR-012 rpc create_guest — 프로필 + 진행 기록 원자 생성 (data-ark §6.3)
  createGuest(guest: NewGuest): Promise<CreateGuestResult> {
    return this.run("createGuest", async (): Promise<CreateGuestResult> => {
      const { data, error } = await this.db.rpc("create_guest", {
        p_id: guest.guestId,
        p_nickname: guest.nickname,
        p_token_hash: guest.tokenHash,
      });
      if (error) {
        // 23505 unique_violation 중 닉네임 인덱스만 업무 결과로 (data-ark §5)
        if (error.code === "23505" && /idx_profiles_nickname/.test(error.message ?? "")) {
          return { ok: false, code: "NICKNAME_TAKEN" };
        }
        throw fail("createGuest", error);
      }
      return { ok: true, profile: toProfile(data as Json) };
    });
  }

  // NFR-003 토큰 해시 조회 (idx_profiles_token_hash)
  findProfileByTokenHash(tokenHash: string): Promise<ProfileRow | null> {
    return this.run("findProfileByTokenHash", async () => {
      const { data, error } = await this.db.from("profiles").select(PROFILE_COLUMNS).eq("token_hash", tokenHash).maybeSingle();
      if (error) throw fail("findProfileByTokenHash", error);
      return data ? toProfile(data as Json) : null;
    });
  }

  // FR-047·FR-062 진행 기록 1건
  getProgress(guestId: string): Promise<ProgressRow | null> {
    return this.run("getProgress", async () => {
      const { data, error } = await this.db.from("player_progress").select("*").eq("guest_id", guestId).maybeSingle();
      if (error) throw fail("getProgress", error);
      if (!data) return null;
      const row = data as Json;
      return {
        guestId: String(row.guest_id),
        roundsPlayed: Number(row.rounds_played),
        consecutiveRoundLosses: Number(row.consecutive_round_losses),
        lastMaxCombo: toNullableNumber(row.last_max_combo),
        lastAttackPerMin: toNullableNumber(row.last_attack_per_min),
        lastQuizRate: toNullableNumber(row.last_quiz_rate),
        updatedAt: toIso(row.updated_at),
      };
    });
  }

  // FR-068 rpc record_match 1회 = 트랜잭션 1회 (data-ark §6.2)
  recordMatch(input: MatchRecordInput): Promise<MatchRecordResult> {
    return this.run("recordMatch", async () => {
      const payload: Json = {
        match_id: input.matchId,
        mode: input.mode,
        bot_level: input.botLevel,
        winner_slot: input.winnerSlot,
        end_reason: input.endReason,
        rounds_played: input.roundsPlayed,
        duration_ms: input.durationMs,
        verse_ref: input.verseRef,
        players: input.players.map((p) => ({
          slot: p.slot,
          guest_id: p.guestId,
          is_bot: p.isBot,
          hero_id: p.heroId,
          rounds_won: p.roundsWon,
          rating_before: p.ratingBefore,
          rating_after: p.ratingAfter,
          max_combo: p.maxCombo,
          lines_cleared: p.linesCleared,
          attack_sent: p.attackSent,
          tetris_count: p.tetrisCount,
          pieces_placed: p.piecesPlaced,
          quiz_correct: p.quizCorrect,
          quiz_answered: p.quizAnswered,
        })),
        progress: input.progress.map(progressPayload),
        achievements: input.achievements.map((a) => ({ guest_id: a.guestId, achievement_id: a.achievementId })),
      };
      const { data, error } = await this.db.rpc("record_match", { payload });
      if (error) throw fail("recordMatch", error);
      const result = data as { created_at: unknown; new_achievements: { guest_id: string; achievement_id: string }[] };
      return {
        createdAt: toIso(result.created_at),
        newAchievements: (result.new_achievements ?? []).map((a) => ({
          guestId: String(a.guest_id),
          achievementId: a.achievement_id as AchievementId,
        })),
      };
    });
  }

  // FR-067 연습 세션 — 진행 기록 UPSERT 후 업적(중복 무시). data-ark §6.3 정의 함수가 2개뿐이므로 요청 2회로 처리
  recordPractice(input: PracticeRecordInput): Promise<PracticeRecordResult> {
    return this.run("recordPractice", async () => {
      const progress = await this.db
        .from("player_progress")
        .upsert({ ...progressPayload(input.progress), updated_at: new Date().toISOString() }, { onConflict: "guest_id" });
      if (progress.error) throw fail("recordPractice", progress.error);
      if (input.achievements.length === 0) return { newAchievements: [] };
      const rows = input.achievements.map((a) => ({ guest_id: a.guestId, achievement_id: a.achievementId }));
      const { data, error } = await this.db
        .from("achievements")
        .upsert(rows, { onConflict: "guest_id,achievement_id", ignoreDuplicates: true })
        .select("guest_id, achievement_id");
      if (error) throw fail("recordPractice", error);
      const inserted: AchievementGrant[] = ((data ?? []) as Json[]).map((r) => ({
        guestId: String(r.guest_id),
        achievementId: r.achievement_id as AchievementId,
      }));
      return { newAchievements: inserted };
    });
  }

  // FR-069 전적 키셋 페이지 — me(내 행으로 필터)·players(두 행 + 상대 닉네임) 두 번 임베드
  listMatches(guestId: string, query: MatchHistoryQuery): Promise<MatchHistoryRow[]> {
    return this.run("listMatches", async () => {
      let request = this.db
        .from("matches")
        .select(
          "id, mode, bot_level, winner_slot, end_reason, duration_ms, created_at, " +
            "me:match_players!inner(slot, guest_id, hero_id, rounds_won, rating_before, rating_after), " +
            "players:match_players(slot, is_bot, hero_id, rounds_won, profiles(nickname))",
        )
        .eq("me.guest_id", guestId);
      if (query.before !== null) request = request.lt("created_at", query.before);
      const { data, error } = await request
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(query.limit);
      if (error) throw fail("listMatches", error);
      const rows = (data ?? []) as unknown as Json[];
      return rows.map((r): MatchHistoryRow => {
        const me = (r.me as Json[])[0];
        const op = (r.players as Json[]).find((p) => Number(p.slot) !== Number(me.slot)) as Json;
        const opProfile = op.profiles as { nickname?: string } | null;
        return {
          matchId: String(r.id),
          mode: String(r.mode) as MatchMode,
          botLevel: r.bot_level === null ? null : (String(r.bot_level) as BotLevel),
          winnerSlot: Number(r.winner_slot) as Slot,
          endReason: String(r.end_reason) as EndReason,
          durationMs: Number(r.duration_ms),
          playedAt: toIso(r.created_at),
          me: {
            slot: Number(me.slot) as Slot,
            heroId: String(me.hero_id) as HeroId,
            roundsWon: Number(me.rounds_won),
            ratingBefore: toNullableNumber(me.rating_before),
            ratingAfter: toNullableNumber(me.rating_after),
          },
          opponent: {
            nickname: opProfile && opProfile.nickname ? String(opProfile.nickname) : null,
            isBot: op.is_bot === true,
            heroId: String(op.hero_id) as HeroId,
            roundsWon: Number(op.rounds_won),
          },
        };
      });
    });
  }

  // FR-071 상위 N — ORDER BY rating DESC, created_at ASC 후 RANK 계산 (TBL-006 뷰와 같은 값: 상위 목록은 더 높은 레이팅을 모두 포함)
  getLeaderboardTop(limit: number): Promise<LeaderboardRow[]> {
    return this.run("getLeaderboardTop", async () => {
      const { data, error } = await this.db
        .from("profiles")
        .select("id, nickname, rating")
        .order("rating", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) throw fail("getLeaderboardTop", error);
      const rows = (data ?? []) as Json[];
      let rank = 0;
      let previous: number | null = null;
      return rows.map((r, index) => {
        const rating = Number(r.rating);
        if (rating !== previous) {
          rank = index + 1;
          previous = rating;
        }
        return { guestId: String(r.id), nickname: String(r.nickname), rating, rank };
      });
    });
  }

  // FR-071 내 순위 — COUNT(rating > 내 rating) + 1 (data-ark §5)
  getRank(guestId: string): Promise<LeaderboardRow | null> {
    return this.run("getRank", async () => {
      const profile = await this.db.from("profiles").select("id, nickname, rating").eq("id", guestId).maybeSingle();
      if (profile.error) throw fail("getRank", profile.error);
      if (!profile.data) return null;
      const me = profile.data as Json;
      const higher = await this.db.from("profiles").select("id", { count: "exact", head: true }).gt("rating", Number(me.rating));
      if (higher.error) throw fail("getRank", higher.error);
      return { guestId: String(me.id), nickname: String(me.nickname), rating: Number(me.rating), rank: (higher.count ?? 0) + 1 };
    });
  }
}
