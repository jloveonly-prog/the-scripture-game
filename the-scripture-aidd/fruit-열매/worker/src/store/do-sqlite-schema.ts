// TASK-030-1 · FR-067 · FR-068 · FR-069 · FR-071 · FR-072 · TBL-001~007 · data-ark §7.1 — DO SQLite 버전별 DDL과 스키마 버전 적용
// 문장은 data-ark §7.1 "버전 1 DDL" 그대로이며, `sql.exec` 1회 = 1문장으로 나눠 둔다 (DO·테스트 대역 공통).

/** DO SQLite 접근에 필요한 최소 표면 — `ctx.storage`(DurableObjectStorage)가 구조적으로 만족한다 */
export interface SqlCursorLike { toArray(): Record<string, unknown>[] }
export interface SqlLike { exec(query: string, ...bindings: unknown[]): SqlCursorLike }
export interface SqlStorageLike { sql: SqlLike; transactionSync<T>(closure: () => T): T }

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";

/** TBL-007 버전 → 적용할 문장 목록 (오름차순) */
export const MIGRATIONS: ReadonlyArray<{ version: number; statements: readonly string[] }> = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS profiles (
  id            TEXT PRIMARY KEY CHECK (length(id) = 36),
  nickname      TEXT NOT NULL CHECK (length(trim(nickname)) BETWEEN 2 AND 12 AND nickname = trim(nickname)),
  nickname_key  TEXT NOT NULL CHECK (length(trim(nickname_key)) > 0 AND nickname_key = lower(nickname)),
  token_hash    TEXT NOT NULL CHECK (length(token_hash) = 64),
  rating        INTEGER NOT NULL DEFAULT 1000 CHECK (rating BETWEEN 0 AND 5000),
  created_at    TEXT NOT NULL DEFAULT ${NOW},
  last_seen_at  TEXT NOT NULL DEFAULT ${NOW}
)`,
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname_key ON profiles (nickname_key)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_token_hash   ON profiles (token_hash)',
      'CREATE INDEX        IF NOT EXISTS idx_profiles_rating       ON profiles (rating DESC, created_at ASC)',
      `CREATE TABLE IF NOT EXISTS matches (
  id             TEXT PRIMARY KEY CHECK (length(id) = 36),
  room_id        TEXT NOT NULL CHECK (length(room_id) = 36),
  mode           TEXT NOT NULL CHECK (mode IN ('random','invite','bot')),
  player1_id     TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  player2_id     TEXT REFERENCES profiles(id) ON DELETE RESTRICT,
  bot_level      TEXT CHECK (bot_level IN ('easy','normal','hard')),
  hero1          TEXT NOT NULL CHECK (hero1 IN ('david','solomon','peter','paul')),
  hero2          TEXT NOT NULL CHECK (hero2 IN ('david','solomon','peter','paul')),
  winner_slot    INTEGER NOT NULL CHECK (winner_slot IN (1,2)),
  rounds1        INTEGER NOT NULL DEFAULT 0 CHECK (rounds1 BETWEEN 0 AND 2),
  rounds2        INTEGER NOT NULL DEFAULT 0 CHECK (rounds2 BETWEEN 0 AND 2),
  end_reason     TEXT NOT NULL CHECK (end_reason IN ('topout','disconnect')),
  duration_ms    INTEGER NOT NULL CHECK (duration_ms BETWEEN 0 AND 86400000),
  stats          TEXT NOT NULL CHECK (json_valid(stats)),
  rating_delta1  INTEGER,
  rating_delta2  INTEGER,
  created_at     TEXT NOT NULL DEFAULT ${NOW},
  CHECK ((mode = 'bot' AND player2_id IS NULL AND bot_level IS NOT NULL
          AND rating_delta1 IS NULL AND rating_delta2 IS NULL)
      OR (mode <> 'bot' AND player2_id IS NOT NULL AND bot_level IS NULL AND player2_id <> player1_id)),
  CHECK (end_reason = 'disconnect' OR (winner_slot = 1 AND rounds1 = 2) OR (winner_slot = 2 AND rounds2 = 2))
)`,
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_room_id ON matches (room_id)',
      'CREATE INDEX IF NOT EXISTS idx_matches_player1_id_created_at ON matches (player1_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_matches_player2_id_created_at ON matches (player2_id, created_at DESC)',
      `CREATE TABLE IF NOT EXISTS player_progress (
  guest_id       TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  rounds_played  INTEGER NOT NULL DEFAULT 0 CHECK (rounds_played >= 0),
  loss_streak    INTEGER NOT NULL DEFAULT 0 CHECK (loss_streak >= 0),
  last_record    TEXT CHECK (last_record IS NULL OR json_valid(last_record)),
  updated_at     TEXT NOT NULL DEFAULT ${NOW},
  CHECK (loss_streak <= rounds_played)
)`,
      `CREATE TABLE IF NOT EXISTS player_achievements (
  guest_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  TEXT NOT NULL CHECK (achievement_id IN ('goliath_hunter')),
  match_id        TEXT REFERENCES matches(id) ON DELETE SET NULL,
  achieved_at     TEXT NOT NULL DEFAULT ${NOW},
  PRIMARY KEY (guest_id, achievement_id)
)`,
      `CREATE TABLE IF NOT EXISTS invite_codes (
  code        TEXT PRIMARY KEY CHECK (length(code) = 6 AND code NOT GLOB '*[^A-HJ-NP-Z2-9]*'),
  room_id     TEXT NOT NULL CHECK (length(room_id) = 36),
  host_id     TEXT NOT NULL CHECK (length(host_id) = 36),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','closed')),
  created_at  TEXT NOT NULL DEFAULT ${NOW},
  expires_at  TEXT NOT NULL,
  CHECK (expires_at > created_at)
)`,
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_codes_room_id    ON invite_codes (room_id)',
      'CREATE INDEX        IF NOT EXISTS idx_invite_codes_expires_at ON invite_codes (expires_at)',
      `CREATE VIEW IF NOT EXISTS leaderboard AS
  SELECT ROW_NUMBER() OVER (ORDER BY rating DESC, created_at ASC) AS rank,
         id AS guest_id, nickname, rating
    FROM profiles
   ORDER BY rating DESC, created_at ASC
   LIMIT 100`,
      'INSERT OR IGNORE INTO schema_migrations (version) VALUES (1)',
    ],
  },
];

const SCHEMA_MIGRATIONS_DDL = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY CHECK (version >= 1),
  applied_at  TEXT NOT NULL DEFAULT ${NOW}
)`;

// FR-072 · data-ark §7.1 — TBL-007 최대 버전보다 큰 DDL만 순서대로 1트랜잭션 적용. 적용 후 버전 반환
export function applySchema(storage: SqlStorageLike): number {
  storage.sql.exec(SCHEMA_MIGRATIONS_DDL);
  const row = storage.sql.exec('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations').toArray()[0];
  let current = Number(row?.v ?? 0);
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    storage.transactionSync(() => {
      for (const statement of migration.statements) storage.sql.exec(statement);
    });
    current = migration.version;
  }
  try {
    // data-ark §6.1: 외래키 강제 상태 확인 (저장소 계층이 FK 대상 존재를 트랜잭션 안에서 다시 조회해 2중 보장)
    const fk = storage.sql.exec('PRAGMA foreign_keys').toArray()[0];
    if (fk && Number(Object.values(fk)[0]) !== 1) {
      console.log(JSON.stringify({ at: new Date().toISOString(), event: 'sqlite-foreign-keys-off' }));
    }
  } catch {
    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'sqlite-foreign-keys-unknown' }));
  }
  return current;
}
