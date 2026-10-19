// ledger-fk.test.ts — 원장 DDL 적용 후 FK·CHECK 위반 INSERT 거부 확인 단위 테스트만 (data-ark §6.2)
// TASK-003 | REQ-014 REQ-015 REQ-016 REQ-017 FR-012 FR-067 FR-068 NFR-008 | TBL-001~TBL-006 | data-ark §6.1·§6.2·§7 (DCL-001)
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MIGRATION_STEPS, readSchemaVersion, runMigrations } from "../src/storage/migrations";
import { SqliteStorageAdapter } from "../src/storage/sqlite-adapter";
import type { MatchRecordInput, MatchPlayerInput } from "../src/storage/adapter";
import { FakeDurableStorage } from "./helpers/sql-storage-fake";

const GUEST_A = "6f1c2a9e-3b7d-4c51-9e2a-0d8f4b6a1c37";
const GUEST_B = "0c9e4b2a-7d13-4e8f-a6b5-3f2d1c0e9a87";
const UNKNOWN = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const MATCH_ID = "b2d7c1e0-8a41-4f6b-9c3e-5a7d2f1e0b94";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

let storage: FakeDurableStorage;

function exec(query: string, ...bindings: (string | number | null)[]): void {
  storage.sql.exec(query, ...bindings);
}

function insertProfile(id: string, nickname: string, hash: string): void {
  exec("INSERT INTO profiles (id, nickname, token_hash) VALUES (?, ?, ?)", id, nickname, hash);
}

function insertMatch(id = MATCH_ID, mode = "random", botLevel: string | null = null): void {
  exec(
    "INSERT INTO matches (id, mode, bot_level, winner_slot, end_reason, rounds_played, duration_ms, verse_ref) VALUES (?, ?, ?, 1, 'topout', 3, 1000, 'John 16:33')",
    id,
    mode,
    botLevel,
  );
}

function player(slot: 1 | 2, guestId: string | null, overrides: Partial<MatchPlayerInput> = {}): MatchPlayerInput {
  return {
    slot,
    guestId,
    isBot: guestId === null,
    heroId: "david",
    roundsWon: slot === 1 ? 2 : 1,
    ratingBefore: guestId === null ? null : 1000,
    ratingAfter: guestId === null ? null : slot === 1 ? 1016 : 984,
    maxCombo: 3,
    linesCleared: 40,
    attackSent: 12,
    tetrisCount: 5,
    piecesPlaced: 120,
    quizCorrect: 1,
    quizAnswered: 2,
    ...overrides,
  };
}

function matchInput(overrides: Partial<MatchRecordInput> = {}): MatchRecordInput {
  return {
    matchId: MATCH_ID,
    mode: "random",
    botLevel: null,
    winnerSlot: 1,
    endReason: "topout",
    roundsPlayed: 3,
    durationMs: 312480,
    verseRef: "1 Samuel 17:49",
    players: [player(1, GUEST_A), player(2, GUEST_B)],
    progress: [],
    achievements: [{ guestId: GUEST_A, achievementId: "goliath_hunter" }],
    ...overrides,
  };
}

function count(table: string): number {
  return Number(storage.sql.exec(`SELECT COUNT(*) AS c FROM ${table}`).one().c);
}

beforeEach(() => {
  storage = new FakeDurableStorage();
  runMigrations(storage);
});

afterEach(() => {
  storage.close();
});

describe("마이그레이션 (data-ark §7 — DCL-001 schema_meta)", () => {
  it("단계 1까지 적용하고 schema_meta에 번호를 기록한다", () => {
    expect(readSchemaVersion(storage.sql)).toBe(MIGRATION_STEPS[MIGRATION_STEPS.length - 1].version);
    const tables = storage.sql
      .exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name")
      .toArray()
      .map((r) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining(["achievements", "leaderboard", "match_players", "matches", "player_progress", "profiles", "schema_meta"]),
    );
  });

  it("두 번 실행해도 같은 단계에 머물고 실패하지 않는다 (멱등)", () => {
    expect(runMigrations(storage)).toBe(1);
    expect(count("schema_meta")).toBe(1);
  });

  it("단계 실행 중 실패하면 그 단계의 DDL과 번호 기록이 함께 롤백된다", () => {
    const broken = [...MIGRATION_STEPS, { version: 2, statements: ["CREATE TABLE extra_probe (x TEXT)", "NOT VALID SQL"] }];
    expect(() => runMigrations(storage, broken)).toThrow(/step 2/);
    expect(readSchemaVersion(storage.sql)).toBe(1);
    expect(storage.sql.exec("SELECT name FROM sqlite_master WHERE name = 'extra_probe'").toArray()).toHaveLength(0);
  });
});

describe("외래 키 위반 INSERT 거부 (data-ark §6.2)", () => {
  it("없는 경기의 참가자 행을 거부한다 (match_players.match_id → matches.id)", () => {
    insertProfile(GUEST_A, "다윗의물맷돌", HASH_A);
    expect(() =>
      exec("INSERT INTO match_players (match_id, slot, guest_id, is_bot, hero_id) VALUES (?, 1, ?, 0, 'david')", UNKNOWN, GUEST_A),
    ).toThrow(/FOREIGN KEY/);
  });

  it("없는 게스트의 참가자 행을 거부한다 (match_players.guest_id → profiles.id)", () => {
    insertMatch();
    expect(() =>
      exec("INSERT INTO match_players (match_id, slot, guest_id, is_bot, hero_id) VALUES (?, 1, ?, 0, 'david')", MATCH_ID, UNKNOWN),
    ).toThrow(/FOREIGN KEY/);
  });

  it("없는 게스트의 진행 기록·업적을 거부한다", () => {
    expect(() => exec("INSERT INTO player_progress (guest_id) VALUES (?)", UNKNOWN)).toThrow(/FOREIGN KEY/);
    expect(() => exec("INSERT INTO achievements (guest_id, achievement_id) VALUES (?, 'goliath_hunter')", UNKNOWN)).toThrow(
      /FOREIGN KEY/,
    );
  });
});

describe("CHECK·UNIQUE 위반 INSERT 거부 (data-ark §6.1)", () => {
  it("닉네임 길이·앞뒤 공백·ID 길이·해시 길이를 거부한다 (TBL-001)", () => {
    expect(() => insertProfile(GUEST_A, "a", HASH_A)).toThrow(/CHECK/);
    expect(() => insertProfile(GUEST_A, "열세글자가넘는아주긴닉네임", HASH_A)).toThrow(/CHECK/);
    expect(() => insertProfile(GUEST_A, " 공백닉 ", HASH_A)).toThrow(/CHECK/);
    expect(() => insertProfile("short-id", "다윗", HASH_A)).toThrow(/CHECK/);
    expect(() => insertProfile(GUEST_A, "다윗", "abc")).toThrow(/CHECK/);
  });

  it("닉네임은 대소문자 무시 유일, 토큰 해시는 유일 (idx_profiles_nickname, idx_profiles_token_hash)", () => {
    insertProfile(GUEST_A, "David", HASH_A);
    expect(() => insertProfile(GUEST_B, "dAVID", HASH_B)).toThrow(/UNIQUE/);
    expect(() => insertProfile(GUEST_B, "Paul", HASH_A)).toThrow(/UNIQUE/);
  });

  it("경기 모드·봇 난이도 짝, 승자 슬롯, 라운드 수를 검사한다 (TBL-002)", () => {
    expect(() => insertMatch(MATCH_ID, "bot", null)).toThrow(/CHECK/);
    expect(() => insertMatch(MATCH_ID, "random", "easy")).toThrow(/CHECK/);
    expect(() => insertMatch(MATCH_ID, "practice", null)).toThrow(/CHECK/);
    expect(() =>
      exec(
        "INSERT INTO matches (id, mode, winner_slot, end_reason, rounds_played, duration_ms, verse_ref) VALUES (?, 'random', 3, 'topout', 4, 0, ' ')",
        MATCH_ID,
      ),
    ).toThrow(/CHECK/);
  });

  it("참가자 행의 위인·봇 짝·레이팅 짝·퀴즈 정답 수를 검사한다 (TBL-003)", () => {
    insertProfile(GUEST_A, "다윗의물맷돌", HASH_A);
    insertMatch();
    const sql = "INSERT INTO match_players (match_id, slot, guest_id, is_bot, hero_id, rating_before, rating_after, quiz_correct, quiz_answered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    expect(() => exec(sql, MATCH_ID, 1, GUEST_A, 0, "moses", null, null, 0, 0)).toThrow(/CHECK/);
    expect(() => exec(sql, MATCH_ID, 1, GUEST_A, 1, "david", null, null, 0, 0)).toThrow(/CHECK/);
    expect(() => exec(sql, MATCH_ID, 1, null, 0, "david", null, null, 0, 0)).toThrow(/CHECK/);
    expect(() => exec(sql, MATCH_ID, 1, GUEST_A, 0, "david", 1000, null, 0, 0)).toThrow(/CHECK/);
    expect(() => exec(sql, MATCH_ID, 1, GUEST_A, 0, "david", null, null, 3, 2)).toThrow(/CHECK/);
    expect(() => exec(sql, MATCH_ID, 3, GUEST_A, 0, "david", null, null, 0, 0)).toThrow(/CHECK/);
  });

  it("진행 기록 정답률 범위·업적 열거를 검사한다 (TBL-004·TBL-005)", () => {
    insertProfile(GUEST_A, "다윗의물맷돌", HASH_A);
    expect(() => exec("INSERT INTO player_progress (guest_id, last_quiz_rate) VALUES (?, 1.5)", GUEST_A)).toThrow(/CHECK/);
    expect(() => exec("INSERT INTO achievements (guest_id, achievement_id) VALUES (?, 'unknown')", GUEST_A)).toThrow(/CHECK/);
  });
});

describe("SQLite 어댑터 무결성 경계 (data-ark §5·§6.2)", () => {
  it("닉네임 UNIQUE 위반을 NICKNAME_TAKEN 값으로 바꾸고 진행 기록을 함께 만든다", async () => {
    const adapter = new SqliteStorageAdapter(storage);
    const first = await adapter.createGuest({ guestId: GUEST_A, nickname: "Solomon", tokenHash: HASH_A });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.profile.rating).toBe(1000);
    expect(await adapter.getProgress(GUEST_A)).toMatchObject({ roundsPlayed: 0, consecutiveRoundLosses: 0, lastQuizRate: null });
    expect(await adapter.createGuest({ guestId: GUEST_B, nickname: "solomon", tokenHash: HASH_B })).toEqual({
      ok: false,
      code: "NICKNAME_TAKEN",
    });
    expect(count("profiles")).toBe(1);
    expect(count("player_progress")).toBe(1);
  });

  it("경기 기록 중 하나라도 위반하면 경기·참가자·레이팅·업적이 전부 롤백된다 (transactionSync)", async () => {
    const adapter = new SqliteStorageAdapter(storage);
    await adapter.createGuest({ guestId: GUEST_A, nickname: "다윗", tokenHash: HASH_A });
    const broken = matchInput({ players: [player(1, GUEST_A), player(2, UNKNOWN)] });
    await expect(adapter.recordMatch(broken)).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    expect(count("matches")).toBe(0);
    expect(count("match_players")).toBe(0);
    expect(count("achievements")).toBe(0);
    expect((await adapter.findProfileByTokenHash(HASH_A))?.rating).toBe(1000);
  });

  it("정상 경기 기록은 한 번에 저장되고 같은 업적은 다시 새 업적으로 세지 않는다", async () => {
    const adapter = new SqliteStorageAdapter(storage);
    await adapter.createGuest({ guestId: GUEST_A, nickname: "다윗", tokenHash: HASH_A });
    await adapter.createGuest({ guestId: GUEST_B, nickname: "바울", tokenHash: HASH_B });
    const result = await adapter.recordMatch(matchInput());
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(result.newAchievements).toEqual([{ guestId: GUEST_A, achievementId: "goliath_hunter" }]);
    expect((await adapter.getRank(GUEST_A))?.rank).toBe(1);
    const again = await adapter.recordPractice({
      progress: { guestId: GUEST_A, roundsPlayed: 4, consecutiveRoundLosses: 0, lastMaxCombo: 3, lastAttackPerMin: 2.5, lastQuizRate: 0.5 },
      achievements: [{ guestId: GUEST_A, achievementId: "goliath_hunter" }],
    });
    expect(again.newAchievements).toEqual([]);
    const history = await adapter.listMatches(GUEST_B, { limit: 20, before: null });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ me: { slot: 2, ratingAfter: 984 }, opponent: { nickname: "다윗", isBot: false } });
  });
});
