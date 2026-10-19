// TASK-030-4 · FR-072 · FR-075 · REQ-017 — DoSqliteStore 계약 검사 (닉네임 충돌·멱등 기록·정렬·순위·업적 1회) — node:sqlite로 ctx.storage 대역
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { applySchema } from '../../../worker/src/store/do-sqlite-schema';
import type { SqlStorageLike } from '../../../worker/src/store/do-sqlite-schema';
import { DoSqliteInviteRepo, DoSqliteStore } from '../../../worker/src/store/do-sqlite-store';
import { StoreError } from '../../../worker/src/store/store';
import type { MatchStats, RecordMatchInput, SlotStats } from '../../../worker/src/store/store';

/** ctx.storage 대역: sql.exec(1문장) + transactionSync(BEGIN/COMMIT/ROLLBACK) */
function memoryStorage(): SqlStorageLike {
  const db = new DatabaseSync(':memory:');
  return {
    sql: {
      exec(query: string, ...bindings: unknown[]) {
        const rows = db.prepare(query).all(...(bindings as never[])) as Record<string, unknown>[];
        return { toArray: () => rows };
      },
    },
    transactionSync<T>(closure: () => T): T {
      db.exec('BEGIN');
      try {
        const out = closure();
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = (n: number): string => String(n).padStart(64, '0');
const slot = (over: Partial<SlotStats> = {}): SlotStats => ({
  maxCombo: 3, linesCleared: 10, tetrises: 1, attackSent: 5, attackPerMin: 4.2, quizCorrect: 1, quizAnswered: 2,
  skillsUsed: 0, angelsUsed: 0, armorUsed: 0, jesusEvent: false, ...over,
});
const stats = (): MatchStats => ({ p1: slot(), p2: slot(), rounds: [{ round: 1, winnerSlot: 1, durationMs: 1000 }], quizCount: 1, verseRef: 'John 16:33' });
const record = { maxCombo: 3, attackPerMin: 4.2, quizAccuracy: 0.5, mode: 'random' as const };

function h2hInput(roomN: number, r1: number, r2: number, over: Partial<RecordMatchInput> = {}): RecordMatchInput {
  return {
    matchId: uuid(1000 + roomN), roomId: uuid(2000 + roomN), mode: 'random', player1Id: uuid(1), player2Id: uuid(2), botLevel: null,
    hero1: 'david', hero2: 'paul', winnerSlot: 1, rounds1: 2, rounds2: 1, endReason: 'topout', durationMs: 120000, stats: stats(),
    rating: { expectedRating1: r1, expectedRating2: r2, newRating1: r1 + 16, newRating2: r2 - 16 },
    progress: [
      { guestId: uuid(1), roundsDelta: 3, lossStreak: 0, record },
      { guestId: uuid(2), roundsDelta: 3, lossStreak: 2, record },
    ],
    achievements: [], ...over,
  };
}

describe('DoSqliteStore', () => {
  let storage: SqlStorageLike;
  let store: DoSqliteStore;
  let tick: number;

  beforeEach(async () => {
    storage = memoryStorage();
    expect(applySchema(storage)).toBe(1);
    tick = Date.parse('2026-10-20T00:00:00.000Z');
    store = new DoSqliteStore(storage, () => new Date((tick += 1000)));
    await store.createProfile({ id: uuid(1), nickname: 'David', nicknameKey: 'david', tokenHash: hash(1) });
    await store.createProfile({ id: uuid(2), nickname: '바울의옥문', nicknameKey: '바울의옥문', tokenHash: hash(2) });
  });

  it('스키마 재적용은 멱등 (TBL-007 버전 1)', () => {
    expect(applySchema(storage)).toBe(1);
  });

  it('프로필 생성·토큰 해시 조회·진행 기록 0 동시 생성', async () => {
    const p = await store.getProfileByTokenHash(hash(1));
    expect(p).toMatchObject({ id: uuid(1), nickname: 'David', rating: 1000 });
    expect(await store.getProfileByTokenHash(hash(9))).toBeNull();
    const [snap] = await store.getPlayers([uuid(1)]);
    expect(snap.progress).toEqual({ guestId: uuid(1), roundsPlayed: 0, lossStreak: 0, lastRecord: null });
  });

  it('대소문자 무시 닉네임 중복은 NICKNAME_TAKEN, 실패 시 진행 기록도 남지 않는다', async () => {
    await expect(store.createProfile({ id: uuid(3), nickname: 'DAVID', nicknameKey: 'david', tokenHash: hash(3) }))
      .rejects.toMatchObject({ code: 'NICKNAME_TAKEN' });
    expect(await store.getPlayers([uuid(3)])).toEqual([]);
  });

  it('사람 대 사람 경기 1트랜잭션 기록 + 같은 roomId 재시도 멱등', async () => {
    const first = await store.recordMatch(h2hInput(1, 1000, 1000));
    expect(first).toMatchObject({ ratingDelta1: 16, ratingDelta2: -16, previousRecords: { [uuid(1)]: null, [uuid(2)]: null } });
    const again = await store.recordMatch(h2hInput(1, 1016, 984));
    expect(again).toMatchObject({ ratingDelta1: 16, ratingDelta2: -16, newAchievements: [] });
    const players = await store.getPlayers([uuid(1), uuid(2)]);
    expect(players.find((p) => p.profile.id === uuid(1))?.profile.rating).toBe(1016);
    expect(players.find((p) => p.profile.id === uuid(2))?.progress).toMatchObject({ roundsPlayed: 3, lossStreak: 2, lastRecord: record });
    expect((await store.listMatches(uuid(1), 1, 20)).totalCount).toBe(1);
  });

  it('계산에 쓴 레이팅이 현재와 다르면 RATING_CHANGED, 아무것도 기록하지 않는다', async () => {
    await expect(store.recordMatch(h2hInput(2, 1100, 1000))).rejects.toBeInstanceOf(StoreError);
    await expect(store.recordMatch(h2hInput(2, 1100, 1000))).rejects.toMatchObject({ code: 'RATING_CHANGED' });
    expect((await store.listMatches(uuid(1), 1, 20)).totalCount).toBe(0);
  });

  it('업적은 1회만 새로 달성된다 (PK guest_id·achievement_id)', async () => {
    const ach = [{ guestId: uuid(1), achievementId: 'goliath_hunter' }];
    const a = await store.recordMatch(h2hInput(3, 1000, 1000, { achievements: ach }));
    expect(a.newAchievements).toEqual(ach);
    const b = await store.recordMatch(h2hInput(4, 1016, 984, { achievements: ach }));
    expect(b.newAchievements).toEqual([]);
    expect(b.previousRecords[uuid(1)]).toEqual(record);
  });

  it('전적은 내 관점·최신순·페이지, 봇 경기 상대는 isBot', async () => {
    await store.recordMatch(h2hInput(5, 1000, 1000));
    await store.recordMatch({
      ...h2hInput(6, 0, 0), mode: 'bot', player2Id: null, botLevel: 'hard', rating: null, winnerSlot: 2, rounds1: 0, rounds2: 2,
      progress: [{ guestId: uuid(1), roundsDelta: 2, lossStreak: 2, record }],
    });
    const mine = await store.listMatches(uuid(1), 1, 1);
    expect(mine.totalCount).toBe(2);
    expect(mine.items[0]).toMatchObject({ mode: 'bot', result: 'loss', rounds: [0, 2], ratingDelta: null,
      opponent: { nickname: null, isBot: true, botLevel: 'hard' } });
    const page2 = await store.listMatches(uuid(1), 2, 1);
    expect(page2.items[0]).toMatchObject({ mode: 'random', result: 'win', ratingDelta: 16, opponent: { nickname: '바울의옥문', isBot: false } });
    const theirs = await store.listMatches(uuid(2), 1, 20);
    expect(theirs.items[0]).toMatchObject({ result: 'loss', rounds: [1, 2], myHero: 'paul', opponentHero: 'david', ratingDelta: -16 });
  });

  it('랭킹: 레이팅 내림차순·동률은 먼저 가입한 순, 경기 기록 후 캐시 무효화, 내 순위', async () => {
    let top = await store.getLeaderboard();
    expect(top.map((r) => r.guestId)).toEqual([uuid(1), uuid(2)]);
    await store.recordMatch({ ...h2hInput(7, 1000, 1000), winnerSlot: 2, rounds1: 1, rounds2: 2,
      rating: { expectedRating1: 1000, expectedRating2: 1000, newRating1: 984, newRating2: 1016 } });
    top = await store.getLeaderboard();
    expect(top[0]).toMatchObject({ rank: 1, guestId: uuid(2), rating: 1016 });
    expect(await store.getRank(uuid(1))).toEqual({ rank: 2, nickname: 'David', rating: 984 });
    expect(await store.getRank(uuid(9))).toBeNull();
  });

  it('연습 기록은 진행 라운드·직전 기록만 갱신하고 직전 기록을 돌려준다', async () => {
    const practice = { ...record, mode: 'practice' as const, playTimeMs: 5000 };
    expect(await store.recordPractice({ guestId: uuid(1), roundsDelta: 1, record: practice })).toEqual({ previousRecord: null });
    expect(await store.recordPractice({ guestId: uuid(1), roundsDelta: 1, record: practice })).toEqual({ previousRecord: practice });
    const [snap] = await store.getPlayers([uuid(1)]);
    expect(snap.progress).toMatchObject({ roundsPlayed: 2, lossStreak: 0 });
    await expect(store.recordPractice({ guestId: uuid(9), roundsDelta: 1, record: practice })).rejects.toMatchObject({ code: 'STORE_UNAVAILABLE' });
  });

  it('초대 코드 저장: 코드 충돌은 false, 만료·closed 행 정리', () => {
    const repo = new DoSqliteInviteRepo(storage);
    const now = Date.parse('2026-10-20T00:00:00.000Z');
    expect(repo.insert({ code: 'K7PX4Q', roomId: uuid(50), hostId: uuid(1), createdAt: now, expiresAt: now + 600000 })).toBe(true);
    expect(repo.insert({ code: 'K7PX4Q', roomId: uuid(51), hostId: uuid(2), createdAt: now, expiresAt: now + 600000 })).toBe(false);
    expect(repo.find('K7PX4Q')).toMatchObject({ roomId: uuid(50), status: 'open', expiresAt: now + 600000 });
    expect(repo.listExpiredOpen(now + 600000).map((r) => r.code)).toEqual(['K7PX4Q']);
    repo.purge(now + 600000);
    expect(repo.find('K7PX4Q')).toBeNull();
    expect(repo.nextExpiry()).toBeNull();
  });
});
