// migrations.ts — §6.1 DDL 문자열 + 단계 실행기만 (A-03 실측 결과: user_version 대신 schema_meta 단일 행 표 — RTM §5 DCL-001)
// TASK-002 | REQ-014 REQ-015 REQ-016 FR-067 FR-068 FR-070 FR-072 NFR-008 | TBL-001~TBL-006 | data-ark §6.1·§6.1 부록·§7 | ARCH-014

/** DO SqlStorage가 받는 바인딩 값 (`ctx.storage.sql.exec(query, ...bindings)`) */
export type SqlValue = string | number | null;

/** DO `SqlStorageCursor` 부분 집합 — 이 프로젝트가 쓰는 두 메서드만 (task-wall A-04) */
export interface SqlCursorLike<T> {
  toArray(): T[];
  one(): T;
}

/** DO `ctx.storage.sql` 부분 집합 */
export interface SqlStorageLike {
  exec<T extends Record<string, SqlValue> = Record<string, SqlValue>>(
    query: string,
    ...bindings: SqlValue[]
  ): SqlCursorLike<T>;
}

/** DO `ctx.storage` 부분 집합 — SQL + 동기 트랜잭션 (data-ark §6.2 "경기 기록 원자성") */
export interface DurableStorageLike {
  sql: SqlStorageLike;
  transactionSync<T>(closure: () => T): T;
}

/** 마이그레이션 단계 1개 — 번호는 1부터 증가, 기존 단계는 수정하지 않는다 (data-ark §7) */
export interface MigrationStep {
  version: number;
  statements: readonly string[];
}

/** 마이그레이션 실패 — Matchmaker가 생성자에서 잡아 저장소 불가(STORAGE_UNAVAILABLE)로 다룬다 */
export class MigrationError extends Error {
  readonly step: number;
  constructor(step: number, cause: unknown) {
    super(`ledger migration step ${step} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "MigrationError";
    this.step = step;
  }
}

// data-ark §6.1 부록 (DCL-001): 단계 번호를 담는 단일 행 메타 표 — PRAGMA user_version은 DO에서 SQLITE_AUTH로 거부됨
const SCHEMA_META_DDL = `CREATE TABLE IF NOT EXISTS schema_meta (
  id      INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL CHECK (version >= 0)
)`;

// data-ark §6.1 DDL v1 — 문장 단위 배열 (DO exec는 다중 문장일 때 마지막 결과만 돌려주므로 한 문장씩 실행)
const LEDGER_V1: readonly string[] = [
  // TBL-001 profiles — FR-012 닉네임 2~12자·대소문자 무시 유일, FR-070 레이팅 기본 1000
  `CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT    NOT NULL PRIMARY KEY CHECK (length(id) = 36),
  nickname    TEXT    NOT NULL COLLATE NOCASE
                      CHECK (nickname = trim(nickname) AND length(trim(nickname)) BETWEEN 2 AND 12),
  token_hash  TEXT    NOT NULL CHECK (length(token_hash) = 64),
  rating      INTEGER NOT NULL DEFAULT 1000 CHECK (rating >= 0),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname   ON profiles (nickname COLLATE NOCASE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_token_hash ON profiles (token_hash)`,
  `CREATE INDEX        IF NOT EXISTS idx_profiles_rating     ON profiles (rating DESC, created_at ASC)`,
  // TBL-002 matches — FR-068 경기 결과 (무효 경기는 행 없음)
  `CREATE TABLE IF NOT EXISTS matches (
  id            TEXT    NOT NULL PRIMARY KEY CHECK (length(id) = 36),
  mode          TEXT    NOT NULL CHECK (mode IN ('random','invite','bot')),
  bot_level     TEXT             CHECK (bot_level IS NULL OR bot_level IN ('easy','normal','hard')),
  winner_slot   INTEGER NOT NULL CHECK (winner_slot IN (1,2)),
  end_reason    TEXT    NOT NULL CHECK (end_reason IN ('topout','disconnect')),
  rounds_played INTEGER NOT NULL CHECK (rounds_played BETWEEN 1 AND 3),
  duration_ms   INTEGER NOT NULL CHECK (duration_ms >= 0),
  verse_ref     TEXT    NOT NULL CHECK (length(trim(verse_ref)) > 0),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((mode = 'bot') = (bot_level IS NOT NULL))
)`,
  `CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches (created_at DESC)`,
  // TBL-003 match_players — FR-066 개인 기록, FR-070 레이팅 전후
  `CREATE TABLE IF NOT EXISTS match_players (
  match_id      TEXT    NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  slot          INTEGER NOT NULL CHECK (slot IN (1,2)),
  guest_id      TEXT             REFERENCES profiles (id),
  is_bot        INTEGER NOT NULL DEFAULT 0 CHECK (is_bot IN (0,1)),
  hero_id       TEXT    NOT NULL CHECK (hero_id IN ('david','solomon','peter','paul')),
  rounds_won    INTEGER NOT NULL DEFAULT 0 CHECK (rounds_won BETWEEN 0 AND 2),
  rating_before INTEGER,
  rating_after  INTEGER,
  max_combo     INTEGER NOT NULL DEFAULT 0 CHECK (max_combo >= 0),
  lines_cleared INTEGER NOT NULL DEFAULT 0 CHECK (lines_cleared >= 0),
  attack_sent   INTEGER NOT NULL DEFAULT 0 CHECK (attack_sent >= 0),
  tetris_count  INTEGER NOT NULL DEFAULT 0 CHECK (tetris_count >= 0),
  pieces_placed INTEGER NOT NULL DEFAULT 0 CHECK (pieces_placed >= 0),
  quiz_correct  INTEGER NOT NULL DEFAULT 0 CHECK (quiz_correct >= 0),
  quiz_answered INTEGER NOT NULL DEFAULT 0 CHECK (quiz_answered >= 0),
  PRIMARY KEY (match_id, slot),
  CHECK ((is_bot = 1) = (guest_id IS NULL)),
  CHECK ((rating_before IS NULL) = (rating_after IS NULL)),
  CHECK (quiz_correct <= quiz_answered)
)`,
  `CREATE INDEX IF NOT EXISTS idx_match_players_guest_id ON match_players (guest_id, match_id)`,
  // TBL-004 player_progress — FR-067 서버가 게스트별 진행 기록 저장
  `CREATE TABLE IF NOT EXISTS player_progress (
  guest_id                 TEXT    NOT NULL PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  rounds_played            INTEGER NOT NULL DEFAULT 0 CHECK (rounds_played >= 0),
  consecutive_round_losses INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_round_losses >= 0),
  last_max_combo           INTEGER CHECK (last_max_combo IS NULL OR last_max_combo >= 0),
  last_attack_per_min      REAL    CHECK (last_attack_per_min IS NULL OR last_attack_per_min >= 0),
  last_quiz_rate           REAL    CHECK (last_quiz_rate IS NULL OR last_quiz_rate BETWEEN 0 AND 1),
  updated_at               TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
)`,
  // TBL-005 achievements — FR-065 (이번 실행 정의 업적은 goliath_hunter 1종)
  `CREATE TABLE IF NOT EXISTS achievements (
  guest_id       TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL CHECK (achievement_id IN ('goliath_hunter')),
  achieved_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (guest_id, achievement_id)
)`,
  // TBL-006 leaderboard VIEW — FR-071 순위는 저장하지 않고 계산
  `CREATE VIEW IF NOT EXISTS leaderboard AS
  SELECT id AS guest_id, nickname, rating,
         RANK() OVER (ORDER BY rating DESC) AS rank
  FROM profiles`,
];

/** data-ark §7: 단계 목록 — 새 변경은 끝에 version + 1 단계로만 추가 */
export const MIGRATION_STEPS: readonly MigrationStep[] = [{ version: 1, statements: LEDGER_V1 }];

/** 현재 기록된 스키마 단계 번호 (schema_meta 행이 없으면 0) */
export function readSchemaVersion(sql: SqlStorageLike): number {
  const rows = sql.exec<{ version: number }>("SELECT version FROM schema_meta WHERE id = 1").toArray();
  return rows.length === 0 ? 0 : Number(rows[0].version);
}

/**
 * 원장 마이그레이션 실행 — Matchmaker 생성자의 `ctx.blockConcurrencyWhile()` 안에서 호출한다 (data-ark §7 DCL-001).
 * 단계마다 transactionSync 1회: DDL + 단계 번호 기록이 함께 성공하거나 함께 취소된다.
 * @returns 실행 후 스키마 단계 번호
 */
export function runMigrations(storage: DurableStorageLike, steps: readonly MigrationStep[] = MIGRATION_STEPS): number {
  try {
    storage.sql.exec(SCHEMA_META_DDL);
  } catch (err) {
    throw new MigrationError(0, err);
  }
  let current = readSchemaVersion(storage.sql);
  for (const step of steps) {
    if (step.version <= current) continue;
    try {
      storage.transactionSync(() => {
        for (const statement of step.statements) storage.sql.exec(statement);
        storage.sql.exec(
          "INSERT INTO schema_meta (id, version) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET version = excluded.version",
          step.version,
        );
      });
    } catch (err) {
      throw new MigrationError(step.version, err);
    }
    current = step.version;
  }
  return current;
}
