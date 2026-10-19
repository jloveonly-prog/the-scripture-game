// TASK-030-1 · FR-067 · FR-068 · FR-069 · FR-071 · FR-072 · D-04 · D-20 · TBL-001~007 — 로컬 모드 Store 구현 (Matchmaker DO 내장 SQLite)
// 경기 기록은 transactionSync 1트랜잭션(data-ark §7.3 5단계와 같은 의미론). DB 오류는 StoreError로만 내보낸다 (스택·SQL 미노출 — 봉인 제1계명).
// 같은 파일의 DoSqliteInviteRepo는 TBL-005(초대 코드) SQL 접근 — 저장 모드와 무관하게 항상 DO SQLite (architecture §4.2).
import { LIMITS } from '../../../client/js/net/protocol.js';
import { balance } from '../content';
import { StoreError } from './store';
import type {
  BotLevel, EndReason, HeroId, LeaderboardRow, MatchListItem, MatchMode, PersonalRecord, PlayerSnapshot, Profile,
  RecordMatchInput, RecordMatchResult, RecordPracticeInput, Store,
} from './store';
import type { SqlStorageLike } from './do-sqlite-schema';

type Row = Record<string, unknown>;

function logStoreError(op: string): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), event: 'store-error', op })); // 오류 문구·SQL 미포함
}

/** 동기 SQL 블록을 StoreError로 감싼다 (devguide §3.6 저장소 규칙) */
function guard<T>(op: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof StoreError) throw err;
    logStoreError(op);
    throw new StoreError('STORE_UNAVAILABLE');
  }
}

const toProfile = (r: Row): Profile => ({
  id: String(r.id), nickname: String(r.nickname), rating: Number(r.rating),
  createdAt: String(r.created_at), lastSeenAt: String(r.last_seen_at),
});

const parseRecord = (value: unknown): PersonalRecord | null =>
  typeof value === 'string' && value.length > 0 ? (JSON.parse(value) as PersonalRecord) : null;

const placeholders = (n: number): string => Array.from({ length: n }, () => '?').join(',');

export class DoSqliteStore implements Store {
  private leaderboardCache: LeaderboardRow[] | null = null; // architecture §4.3 — 로컬 모드 랭킹 메모리 캐시

  constructor(private readonly storage: SqlStorageLike, private readonly now: () => Date = () => new Date()) {}

  private rows(query: string, ...bindings: unknown[]): Row[] {
    return this.storage.sql.exec(query, ...bindings).toArray();
  }

  // FR-012 · API-001 프로필 + 진행 기록 동시 생성 (닉네임 UNIQUE 위반 → NICKNAME_TAKEN, 경쟁 조건 안전 — data-ark §5)
  async createProfile(input: { id: string; nickname: string; nicknameKey: string; tokenHash: string }): Promise<Profile> {
    const at = this.now().toISOString();
    try {
      this.storage.transactionSync(() => {
        this.rows('INSERT INTO profiles (id, nickname, nickname_key, token_hash, rating, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          input.id, input.nickname, input.nicknameKey, input.tokenHash, balance.elo.initial, at, at);
        this.rows('INSERT INTO player_progress (guest_id, updated_at) VALUES (?, ?)', input.id, at);
      });
    } catch (err) {
      if (err instanceof Error && /UNIQUE/i.test(err.message) && /nickname_key/.test(err.message)) {
        throw new StoreError('NICKNAME_TAKEN');
      }
      logStoreError('createProfile');
      throw new StoreError('STORE_UNAVAILABLE');
    }
    this.leaderboardCache = null; // 새 프로필(1000)이 상위 100에 들 수 있다
    return { id: input.id, nickname: input.nickname, rating: balance.elo.initial, createdAt: at, lastSeenAt: at };
  }

  // FR-012 · API-002~006 토큰 해시 조회 (idx_profiles_token_hash)
  async getProfileByTokenHash(tokenHash: string): Promise<Profile | null> {
    return guard('getProfileByTokenHash', () => {
      const r = this.rows('SELECT id, nickname, rating, created_at, last_seen_at FROM profiles WHERE token_hash = ?', tokenHash)[0];
      return r ? toProfile(r) : null;
    });
  }

  // API-002 last_seen_at 갱신
  async touchProfile(guestId: string): Promise<void> {
    guard('touchProfile', () => this.rows('UPDATE profiles SET last_seen_at = ? WHERE id = ?', this.now().toISOString(), guestId));
  }

  // FR-018 · FR-047 · FR-062 매칭·라운드 시작 입력 (없는 ID는 빠진다)
  async getPlayers(guestIds: string[]): Promise<PlayerSnapshot[]> {
    const ids = [...new Set(guestIds)];
    if (ids.length === 0) return [];
    return guard('getPlayers', () => this.rows(
      `SELECT p.id, p.nickname, p.rating, p.created_at, p.last_seen_at, g.rounds_played, g.loss_streak, g.last_record
         FROM profiles p JOIN player_progress g ON g.guest_id = p.id WHERE p.id IN (${placeholders(ids.length)})`, ...ids,
    ).map((r) => ({
      profile: toProfile(r),
      progress: { guestId: String(r.id), roundsPlayed: Number(r.rounds_played), lossStreak: Number(r.loss_streak), lastRecord: parseRecord(r.last_record) },
    })));
  }

  // FR-065 · FR-067 · FR-068 · FR-070 · D-20 경기 종료 1트랜잭션 (data-ark §7.3 1~5단계, 같은 roomId 재시도 멱등)
  async recordMatch(input: RecordMatchInput): Promise<RecordMatchResult> {
    const at = this.now().toISOString();
    const result = guard('recordMatch', () => this.storage.transactionSync((): RecordMatchResult => {
      const existing = this.rows('SELECT rating_delta1, rating_delta2 FROM matches WHERE room_id = ?', input.roomId)[0];
      if (existing) {
        const d = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
        return { ratingDelta1: d(existing.rating_delta1), ratingDelta2: d(existing.rating_delta2), newAchievements: [], previousRecords: {} };
      }
      const people = [input.player1Id, ...(input.player2Id ? [input.player2Id] : [])];
      const found = this.rows(`SELECT id, rating FROM profiles WHERE id IN (${placeholders(people.length)})`, ...people);
      if (found.length !== people.length) throw new StoreError('STORE_UNAVAILABLE'); // FK 대상 2중 확인 (data-ark §6.1)
      const ratingOf = (id: string): number => Number(found.find((r) => r.id === id)?.rating);
      let ratingDelta1: number | null = null;
      let ratingDelta2: number | null = null;
      if (input.rating && input.player2Id) {
        // 1단계: 계산에 쓴 레이팅과 현재 레이팅 비교 (단일 스레드 DO라 잠금 불필요 — 의미론만 맞춘다)
        if (ratingOf(input.player1Id) !== input.rating.expectedRating1 || ratingOf(input.player2Id) !== input.rating.expectedRating2) {
          throw new StoreError('RATING_CHANGED');
        }
        ratingDelta1 = input.rating.newRating1 - input.rating.expectedRating1;
        ratingDelta2 = input.rating.newRating2 - input.rating.expectedRating2;
      }
      // 2단계: 경기 삽입
      this.rows(
        `INSERT INTO matches (id, room_id, mode, player1_id, player2_id, bot_level, hero1, hero2, winner_slot, rounds1, rounds2,
                              end_reason, duration_ms, stats, rating_delta1, rating_delta2, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.matchId, input.roomId, input.mode, input.player1Id, input.player2Id, input.botLevel, input.hero1, input.hero2,
        input.winnerSlot, input.rounds1, input.rounds2, input.endReason, input.durationMs, JSON.stringify(input.stats),
        ratingDelta1, ratingDelta2, at,
      );
      // 3단계: 레이팅 갱신 (사람 대 사람만)
      if (input.rating && input.player2Id) {
        this.rows('UPDATE profiles SET rating = ? WHERE id = ?', input.rating.newRating1, input.player1Id);
        this.rows('UPDATE profiles SET rating = ? WHERE id = ?', input.rating.newRating2, input.player2Id);
      }
      // 4단계: 진행 기록 (갱신 전 last_record 반환 — 성장 수치용)
      const previousRecords: Record<string, PersonalRecord | null> = {};
      for (const p of input.progress) {
        const prev = this.rows('SELECT last_record FROM player_progress WHERE guest_id = ?', p.guestId)[0];
        if (!prev) throw new StoreError('STORE_UNAVAILABLE');
        previousRecords[p.guestId] = parseRecord(prev.last_record);
        this.rows('UPDATE player_progress SET rounds_played = rounds_played + ?, loss_streak = ?, last_record = ?, updated_at = ? WHERE guest_id = ?',
          p.roundsDelta, p.lossStreak, JSON.stringify(p.record), at, p.guestId);
      }
      // 5단계: 업적 (이미 달성한 업적은 무시, 실제 삽입분만 반환)
      const newAchievements: RecordMatchResult['newAchievements'] = [];
      for (const a of input.achievements) {
        const inserted = this.rows(
          `INSERT INTO player_achievements (guest_id, achievement_id, match_id, achieved_at) VALUES (?, ?, ?, ?)
           ON CONFLICT DO NOTHING RETURNING guest_id`, a.guestId, a.achievementId, input.matchId, at);
        if (inserted.length > 0) newAchievements.push({ guestId: a.guestId, achievementId: a.achievementId });
      }
      return { ratingDelta1, ratingDelta2, newAchievements, previousRecords };
    }));
    this.leaderboardCache = null; // architecture §4.3 — 경기 기록 시 랭킹 캐시 무효화
    return result;
  }

  // FR-023 · FR-067 연습 종료 — 진행 라운드·직전 기록만 (연패 수 미반영 — TBL-003)
  async recordPractice(input: RecordPracticeInput): Promise<{ previousRecord: PersonalRecord | null }> {
    const at = this.now().toISOString();
    return guard('recordPractice', () => this.storage.transactionSync(() => {
      const prev = this.rows('SELECT last_record FROM player_progress WHERE guest_id = ?', input.guestId)[0];
      if (!prev) throw new StoreError('STORE_UNAVAILABLE');
      this.rows('UPDATE player_progress SET rounds_played = rounds_played + ?, last_record = ?, updated_at = ? WHERE guest_id = ?',
        input.roundsDelta, JSON.stringify(input.record), at, input.guestId);
      return { previousRecord: parseRecord(prev.last_record) };
    }));
  }

  // FR-069 · API-003 내 전적 최신순 페이지 (player1·player2 인덱스 UNION ALL — data-ark §5)
  async listMatches(guestId: string, page: number, size: number): Promise<{ items: MatchListItem[]; totalCount: number }> {
    return guard('listMatches', () => {
      const count = this.rows(
        'SELECT (SELECT COUNT(*) FROM matches WHERE player1_id = ?) + (SELECT COUNT(*) FROM matches WHERE player2_id = ?) AS c',
        guestId, guestId)[0];
      const rows = this.rows(
        `SELECT m.*, p1.nickname AS nick1, p2.nickname AS nick2
           FROM (SELECT * FROM matches WHERE player1_id = ? UNION ALL SELECT * FROM matches WHERE player2_id = ?) m
           JOIN profiles p1 ON p1.id = m.player1_id LEFT JOIN profiles p2 ON p2.id = m.player2_id
          ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?`,
        guestId, guestId, size, (page - 1) * size);
      return { items: rows.map((r) => toMatchListItem(r, guestId)), totalCount: Number(count?.c ?? 0) };
    });
  }

  // FR-071 · API-004 상위 100 (TBL-006 뷰, 로컬 모드 메모리 캐시)
  async getLeaderboard(): Promise<LeaderboardRow[]> {
    if (this.leaderboardCache) return this.leaderboardCache;
    const rows = guard('getLeaderboard', () => this.rows('SELECT rank, guest_id, nickname, rating FROM leaderboard').map((r) => ({
      rank: Number(r.rank), guestId: String(r.guest_id), nickname: String(r.nickname), rating: Number(r.rating),
    })));
    this.leaderboardCache = rows.slice(0, LIMITS.RANKING_TOP);
    return this.leaderboardCache;
  }

  // FR-071 · API-004 내 순위 (100위 밖 포함 — TBL-006 "내 순위" 식)
  async getRank(guestId: string): Promise<{ rank: number; nickname: string; rating: number } | null> {
    return guard('getRank', () => {
      const me = this.rows('SELECT nickname, rating, created_at FROM profiles WHERE id = ?', guestId)[0];
      if (!me) return null;
      const ahead = this.rows('SELECT COUNT(*) AS c FROM profiles WHERE rating > ? OR (rating = ? AND created_at < ?)',
        me.rating, me.rating, me.created_at)[0];
      return { rank: 1 + Number(ahead?.c ?? 0), nickname: String(me.nickname), rating: Number(me.rating) };
    });
  }
}

/** matches 1행 → 내 관점의 API-003 항목 */
function toMatchListItem(r: Row, guestId: string): MatchListItem {
  const mySlot = r.player1_id === guestId ? 1 : 2;
  const isBot = r.player2_id === null || r.player2_id === undefined;
  const rounds1 = Number(r.rounds1);
  const rounds2 = Number(r.rounds2);
  const delta = mySlot === 1 ? r.rating_delta1 : r.rating_delta2;
  return {
    matchId: String(r.id),
    mode: String(r.mode) as MatchMode,
    opponent: isBot
      ? { nickname: null, isBot: true, botLevel: (r.bot_level as BotLevel | null) ?? null }
      : { nickname: String(mySlot === 1 ? r.nick2 : r.nick1), isBot: false, botLevel: null },
    myHero: String(mySlot === 1 ? r.hero1 : r.hero2) as HeroId,
    opponentHero: String(mySlot === 1 ? r.hero2 : r.hero1) as HeroId,
    result: Number(r.winner_slot) === mySlot ? 'win' : 'loss',
    endReason: String(r.end_reason) as EndReason,
    rounds: mySlot === 1 ? [rounds1, rounds2] : [rounds2, rounds1],
    durationMs: Number(r.duration_ms),
    ratingDelta: delta === null || delta === undefined ? null : Number(delta),
    createdAt: String(r.created_at),
  };
}

/** TBL-005 1행 (matchmaking/invite-codes.ts의 InviteCodeRepo가 기대하는 모양) */
export interface InviteCodeRow { code: string; roomId: string; hostId: string; status: 'open' | 'full' | 'closed'; expiresAt: number }

const toInvite = (r: Row): InviteCodeRow => ({
  code: String(r.code), roomId: String(r.room_id), hostId: String(r.host_id),
  status: String(r.status) as InviteCodeRow['status'], expiresAt: Date.parse(String(r.expires_at)),
});

// FR-019 · TBL-005 초대 코드 SQL 접근 (시각은 epoch ms 인자 → ISO 저장)
export class DoSqliteInviteRepo {
  constructor(private readonly storage: SqlStorageLike) {}

  private rows(query: string, ...bindings: unknown[]): Row[] {
    return this.storage.sql.exec(query, ...bindings).toArray();
  }

  /** 삽입 — 코드(PK) 충돌이면 false (재발급 대상), 그 밖의 오류는 StoreError */
  insert(row: { code: string; roomId: string; hostId: string; createdAt: number; expiresAt: number }): boolean {
    try {
      this.rows("INSERT INTO invite_codes (code, room_id, host_id, status, created_at, expires_at) VALUES (?, ?, ?, 'open', ?, ?)",
        row.code, row.roomId, row.hostId, new Date(row.createdAt).toISOString(), new Date(row.expiresAt).toISOString());
      return true;
    } catch (err) {
      if (err instanceof Error && /UNIQUE|PRIMARY KEY/i.test(err.message) && /invite_codes\.code/.test(err.message)) return false;
      logStoreError('invite.insert');
      throw new StoreError('STORE_UNAVAILABLE');
    }
  }

  find(code: string): InviteCodeRow | null {
    return guard('invite.find', () => {
      const r = this.rows('SELECT code, room_id, host_id, status, expires_at FROM invite_codes WHERE code = ?', code)[0];
      return r ? toInvite(r) : null;
    });
  }

  setStatus(code: string, status: InviteCodeRow['status']): void {
    guard('invite.setStatus', () => this.rows('UPDATE invite_codes SET status = ? WHERE code = ?', status, code));
  }

  closeByRoom(roomId: string): void {
    guard('invite.closeByRoom', () => this.rows("UPDATE invite_codes SET status = 'closed' WHERE room_id = ?", roomId));
  }

  /** 만료 시각이 지난 열린 코드 (방장에게 expired 통지할 대상) */
  listExpiredOpen(now: number): InviteCodeRow[] {
    return guard('invite.listExpiredOpen', () => this.rows(
      "SELECT code, room_id, host_id, status, expires_at FROM invite_codes WHERE status = 'open' AND expires_at <= ?",
      new Date(now).toISOString()).map(toInvite));
  }

  /** data-ark §5: 만료·closed 행 즉시 삭제 (봉인 제4계명) */
  purge(now: number): void {
    guard('invite.purge', () => this.rows("DELETE FROM invite_codes WHERE expires_at <= ? OR status = 'closed'", new Date(now).toISOString()));
  }

  /** 남은 행 중 가장 이른 만료 시각 (alarm 예약용), 없으면 null */
  nextExpiry(): number | null {
    return guard('invite.nextExpiry', () => {
      const r = this.rows('SELECT MIN(expires_at) AS e FROM invite_codes')[0];
      return r && typeof r.e === 'string' ? Date.parse(r.e) : null;
    });
  }
}
