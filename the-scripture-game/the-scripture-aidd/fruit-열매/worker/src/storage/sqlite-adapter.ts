// sqlite-adapter.ts — ctx.storage.sql 쿼리·transactionSync 원자 기록 구현만 (SQL은 이 파일과 migrations.ts에만)
// TASK-003 | REQ-014 REQ-015 REQ-016 FR-012 FR-067~FR-072 | TBL-001~TBL-006 | data-ark §5·§6.2 | ARCH-014 | D-05
import type {
  AchievementGrant, BotLevel, CreateGuestResult, EndReason, HeroId, LeaderboardRow, MatchHistoryQuery, MatchHistoryRow,
  MatchMode, MatchRecordInput, MatchRecordResult, NewGuest, PracticeRecordInput, PracticeRecordResult, ProfileRow,
  ProgressRow, ProgressUpdate, Slot, StorageAdapter,
} from "./adapter";
import { StorageError } from "./adapter";
import type { DurableStorageLike, SqlValue } from "./migrations";

type Row = Record<string, SqlValue>;

// data-ark §1 시간 표기: ISO-8601 UTC 밀리초
const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const PROFILE_COLUMNS = "id, nickname, rating, created_at, updated_at";

function toProfile(row: Row): ProfileRow {
  return {
    guestId: String(row.id),
    nickname: String(row.nickname),
    rating: Number(row.rating),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toNullableNumber(value: SqlValue): number | null {
  return value === null ? null : Number(value);
}

/** SQLite 오류가 닉네임 UNIQUE NOCASE 위반인지 (data-ark §5 "UNIQUE 위반을 NICKNAME_TAKEN으로 변환") */
function isNicknameUniqueViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed: profiles\.nickname/i.test(message);
}

/** DO 내장 SQLite 구현 — Matchmaker(전역 1개) 안에서만 생성된다 (architecture §6 원장 위치 결정) */
export class SqliteStorageAdapter implements StorageAdapter {
  readonly kind = "sqlite" as const;
  private readonly storage: DurableStorageLike;

  constructor(storage: DurableStorageLike) {
    this.storage = storage;
  }

  /** 동기 SQL 실행을 Promise 인터페이스로 감싸고 실패를 StorageError로 바꾼다 */
  private run<T>(operation: string, work: () => T): Promise<T> {
    try {
      return Promise.resolve(work());
    } catch (err) {
      return Promise.reject(err instanceof StorageError ? err : new StorageError(operation, err));
    }
  }

  // FR-012 닉네임 사전 조회 (COLLATE NOCASE 인덱스)
  nicknameExists(nickname: string): Promise<boolean> {
    return this.run("nicknameExists", () => {
      const rows = this.storage.sql.exec("SELECT 1 AS found FROM profiles WHERE nickname = ? COLLATE NOCASE LIMIT 1", nickname);
      return rows.toArray().length > 0;
    });
  }

  // FR-012 프로필(레이팅 1000) + 진행 기록을 한 트랜잭션에서 (API-001, TBL-001·TBL-004)
  createGuest(guest: NewGuest): Promise<CreateGuestResult> {
    return this.run("createGuest", (): CreateGuestResult => {
      try {
        const profile = this.storage.transactionSync(() => {
          const row = this.storage.sql
            .exec(
              `INSERT INTO profiles (id, nickname, token_hash) VALUES (?, ?, ?) RETURNING ${PROFILE_COLUMNS}`,
              guest.guestId,
              guest.nickname,
              guest.tokenHash,
            )
            .one();
          this.storage.sql.exec("INSERT INTO player_progress (guest_id) VALUES (?)", guest.guestId);
          return toProfile(row);
        });
        return { ok: true, profile };
      } catch (err) {
        if (isNicknameUniqueViolation(err)) return { ok: false, code: "NICKNAME_TAKEN" };
        throw err;
      }
    });
  }

  // NFR-003 토큰 해시 조회 (idx_profiles_token_hash)
  findProfileByTokenHash(tokenHash: string): Promise<ProfileRow | null> {
    return this.run("findProfileByTokenHash", () => {
      const rows = this.storage.sql.exec(`SELECT ${PROFILE_COLUMNS} FROM profiles WHERE token_hash = ?`, tokenHash).toArray();
      return rows.length === 0 ? null : toProfile(rows[0]);
    });
  }

  // FR-047·FR-062 진행 기록 1건 (PK)
  getProgress(guestId: string): Promise<ProgressRow | null> {
    return this.run("getProgress", () => {
      const rows = this.storage.sql.exec("SELECT * FROM player_progress WHERE guest_id = ?", guestId).toArray();
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        guestId: String(row.guest_id),
        roundsPlayed: Number(row.rounds_played),
        consecutiveRoundLosses: Number(row.consecutive_round_losses),
        lastMaxCombo: toNullableNumber(row.last_max_combo),
        lastAttackPerMin: toNullableNumber(row.last_attack_per_min),
        lastQuizRate: toNullableNumber(row.last_quiz_rate),
        updatedAt: String(row.updated_at),
      };
    });
  }

  // FR-067 진행 기록 UPSERT (서비스가 계산한 절대값)
  private writeProgress(update: ProgressUpdate): void {
    this.storage.sql.exec(
      `INSERT INTO player_progress
         (guest_id, rounds_played, consecutive_round_losses, last_max_combo, last_attack_per_min, last_quiz_rate, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ${NOW_SQL})
       ON CONFLICT (guest_id) DO UPDATE SET
         rounds_played = excluded.rounds_played,
         consecutive_round_losses = excluded.consecutive_round_losses,
         last_max_combo = excluded.last_max_combo,
         last_attack_per_min = excluded.last_attack_per_min,
         last_quiz_rate = excluded.last_quiz_rate,
         updated_at = excluded.updated_at`,
      update.guestId,
      update.roundsPlayed,
      update.consecutiveRoundLosses,
      update.lastMaxCombo,
      update.lastAttackPerMin,
      update.lastQuizRate,
    );
  }

  // FR-065 업적 — 이미 있으면 무시(ON CONFLICT DO NOTHING), 새로 들어간 행만 반환
  private writeAchievements(grants: readonly AchievementGrant[]): AchievementGrant[] {
    const inserted: AchievementGrant[] = [];
    for (const grant of grants) {
      const rows = this.storage.sql
        .exec(
          `INSERT INTO achievements (guest_id, achievement_id) VALUES (?, ?)
           ON CONFLICT (guest_id, achievement_id) DO NOTHING RETURNING achievement_id`,
          grant.guestId,
          grant.achievementId,
        )
        .toArray();
      if (rows.length > 0) inserted.push({ guestId: grant.guestId, achievementId: grant.achievementId });
    }
    return inserted;
  }

  // FR-068 경기 기록 원자성 — transactionSync 1회 (data-ark §6.2)
  recordMatch(input: MatchRecordInput): Promise<MatchRecordResult> {
    return this.run("recordMatch", () =>
      this.storage.transactionSync((): MatchRecordResult => {
        const match = this.storage.sql
          .exec(
            `INSERT INTO matches (id, mode, bot_level, winner_slot, end_reason, rounds_played, duration_ms, verse_ref)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING created_at`,
            input.matchId, input.mode, input.botLevel, input.winnerSlot, input.endReason, input.roundsPlayed,
            input.durationMs, input.verseRef,
          )
          .one();
        for (const p of input.players) {
          this.storage.sql.exec(
            `INSERT INTO match_players (match_id, slot, guest_id, is_bot, hero_id, rounds_won, rating_before, rating_after,
               max_combo, lines_cleared, attack_sent, tetris_count, pieces_placed, quiz_correct, quiz_answered)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            input.matchId, p.slot, p.guestId, p.isBot ? 1 : 0, p.heroId, p.roundsWon, p.ratingBefore, p.ratingAfter,
            p.maxCombo, p.linesCleared, p.attackSent, p.tetrisCount, p.piecesPlaced, p.quizCorrect, p.quizAnswered,
          );
          // FR-070 사람 대 사람일 때만 레이팅 갱신 (rating_after가 있는 사람 행)
          if (p.guestId !== null && p.ratingAfter !== null) {
            this.storage.sql.exec(
              `UPDATE profiles SET rating = ?, updated_at = ${NOW_SQL} WHERE id = ?`,
              p.ratingAfter,
              p.guestId,
            );
          }
        }
        for (const update of input.progress) this.writeProgress(update);
        const newAchievements = this.writeAchievements(input.achievements);
        return { createdAt: String(match.created_at), newAchievements };
      }),
    );
  }

  // FR-067 연습 세션: 진행 기록 + 업적만 (matches 행 없음 — architecture §9.5)
  recordPractice(input: PracticeRecordInput): Promise<PracticeRecordResult> {
    return this.run("recordPractice", () =>
      this.storage.transactionSync((): PracticeRecordResult => {
        this.writeProgress(input.progress);
        return { newAchievements: this.writeAchievements(input.achievements) };
      }),
    );
  }

  // FR-069 전적 키셋 페이지 — idx_match_players_guest_id + idx_matches_created_at (data-ark §5)
  listMatches(guestId: string, query: MatchHistoryQuery): Promise<MatchHistoryRow[]> {
    return this.run("listMatches", () => {
      const rows = this.storage.sql
        .exec(
          `SELECT m.id, m.mode, m.bot_level, m.winner_slot, m.end_reason, m.duration_ms, m.created_at,
                  me.slot AS me_slot, me.hero_id AS me_hero_id, me.rounds_won AS me_rounds_won,
                  me.rating_before AS me_rating_before, me.rating_after AS me_rating_after,
                  op.is_bot AS op_is_bot, op.hero_id AS op_hero_id, op.rounds_won AS op_rounds_won,
                  opp.nickname AS op_nickname
             FROM match_players me
             JOIN matches m ON m.id = me.match_id
             JOIN match_players op ON op.match_id = me.match_id AND op.slot <> me.slot
             LEFT JOIN profiles opp ON opp.id = op.guest_id
            WHERE me.guest_id = ? AND (? IS NULL OR m.created_at < ?)
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT ?`,
          guestId,
          query.before,
          query.before,
          query.limit,
        )
        .toArray();
      return rows.map(
        (r): MatchHistoryRow => ({
          matchId: String(r.id),
          mode: String(r.mode) as MatchMode,
          botLevel: r.bot_level === null ? null : (String(r.bot_level) as BotLevel),
          winnerSlot: Number(r.winner_slot) as Slot,
          endReason: String(r.end_reason) as EndReason,
          durationMs: Number(r.duration_ms),
          playedAt: String(r.created_at),
          me: {
            slot: Number(r.me_slot) as Slot,
            heroId: String(r.me_hero_id) as HeroId,
            roundsWon: Number(r.me_rounds_won),
            ratingBefore: toNullableNumber(r.me_rating_before),
            ratingAfter: toNullableNumber(r.me_rating_after),
          },
          opponent: {
            nickname: r.op_nickname === null ? null : String(r.op_nickname),
            isBot: Number(r.op_is_bot) === 1,
            heroId: String(r.op_hero_id) as HeroId,
            roundsWon: Number(r.op_rounds_won),
          },
        }),
      );
    });
  }

  // FR-071 상위 N — TBL-006 뷰, 동점은 먼저 입장한 순 (data-ark TBL-006 정의)
  getLeaderboardTop(limit: number): Promise<LeaderboardRow[]> {
    return this.run("getLeaderboardTop", () =>
      this.storage.sql
        .exec(
          `SELECT l.guest_id, l.nickname, l.rating, l.rank
             FROM leaderboard l JOIN profiles p ON p.id = l.guest_id
            ORDER BY l.rank ASC, p.created_at ASC
            LIMIT ?`,
          limit,
        )
        .toArray()
        .map((r) => ({
          guestId: String(r.guest_id),
          nickname: String(r.nickname),
          rating: Number(r.rating),
          rank: Number(r.rank),
        })),
    );
  }

  // FR-071 내 순위 — COUNT(rating > 내 rating) + 1 = 뷰 RANK (data-ark §5)
  getRank(guestId: string): Promise<LeaderboardRow | null> {
    return this.run("getRank", () => {
      const rows = this.storage.sql
        .exec(
          `SELECT p.id, p.nickname, p.rating,
                  (SELECT COUNT(*) FROM profiles q WHERE q.rating > p.rating) + 1 AS rank
             FROM profiles p WHERE p.id = ?`,
          guestId,
        )
        .toArray();
      if (rows.length === 0) return null;
      const r = rows[0];
      return { guestId: String(r.id), nickname: String(r.nickname), rating: Number(r.rating), rank: Number(r.rank) };
    });
  }
}
