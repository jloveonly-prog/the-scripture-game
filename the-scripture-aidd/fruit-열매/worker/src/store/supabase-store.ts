// TASK-030-2 · FR-072 · NFR-004 · D-05 · TBL-001~004 · TBL-006 — Supabase 모드 Store 구현 (Worker 전용 service role, supabase-js 동적 import)
// 키는 Env로만 받고 어떤 응답·로그에도 싣지 않는다 (봉인 제1·2계명). 경기 기록은 Postgres 함수 record_match 1회 = 1트랜잭션 (data-ark §7.3).
import type { SupabaseClient } from '@supabase/supabase-js';
import { LIMITS } from '../../../client/js/net/protocol.js';
import { StoreError } from './store';
import type {
  BotLevel, EndReason, HeroId, LeaderboardRow, MatchListItem, MatchMode, PersonalRecord, PlayerSnapshot, Profile,
  RecordMatchInput, RecordMatchResult, RecordPracticeInput, Store,
} from './store';

type Row = Record<string, unknown>;
interface PgError { code?: string; message?: string; details?: string | null }

/** Postgres unique_violation (SQLSTATE 23505) */
const PG_UNIQUE_VIOLATION = '23505';

function fail(op: string): never {
  console.log(JSON.stringify({ at: new Date().toISOString(), event: 'store-error', op, mode: 'supabase' })); // 키·SQL·오류 본문 미포함
  throw new StoreError('STORE_UNAVAILABLE');
}

const iso = (v: unknown): string => new Date(String(v)).toISOString();

const toProfile = (r: Row): Profile => ({
  id: String(r.id), nickname: String(r.nickname), rating: Number(r.rating), createdAt: iso(r.created_at), lastSeenAt: iso(r.last_seen_at),
});

const asRecord = (v: unknown): PersonalRecord | null => (v && typeof v === 'object' ? (v as PersonalRecord) : null);
const one = (v: unknown): Row | null => (Array.isArray(v) ? ((v[0] as Row) ?? null) : ((v as Row) ?? null));

export class SupabaseStore implements Store {
  private client: Promise<SupabaseClient> | null = null;

  constructor(private readonly url: string, private readonly serviceRoleKey: string) {}

  /** 키가 있을 때만 supabase-js를 불러온다 (devguide §1.2 — 로컬 모드 번들 경로에서 외부 요청 0건) */
  private db(): Promise<SupabaseClient> {
    if (!this.client) {
      this.client = import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(this.url, this.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }));
      this.client.catch(() => { this.client = null; });
    }
    return this.client;
  }

  private async run<T>(op: string, fn: (db: SupabaseClient) => Promise<T>): Promise<T> {
    try {
      return await fn(await this.db());
    } catch (err) {
      if (err instanceof StoreError) throw err;
      return fail(op);
    }
  }

  // FR-012 · API-001 프로필 + 진행 기록 생성 (진행 기록 실패 시 프로필 삭제로 보상)
  async createProfile(input: { id: string; nickname: string; nicknameKey: string; tokenHash: string }): Promise<Profile> {
    return this.run('createProfile', async (db) => {
      const { data, error } = await db.from('profiles')
        .insert({ id: input.id, nickname: input.nickname, nickname_key: input.nicknameKey, token_hash: input.tokenHash })
        .select('id, nickname, rating, created_at, last_seen_at').single();
      if (error) {
        const e = error as PgError;
        if (e.code === PG_UNIQUE_VIOLATION && /nickname_key/.test(`${e.message ?? ''} ${e.details ?? ''}`)) throw new StoreError('NICKNAME_TAKEN');
        return fail('createProfile');
      }
      const progress = await db.from('player_progress').insert({ guest_id: input.id });
      if (progress.error) {
        await db.from('profiles').delete().eq('id', input.id);
        return fail('createProfile.progress');
      }
      return toProfile(data as Row);
    });
  }

  // FR-012 토큰 해시 조회
  async getProfileByTokenHash(tokenHash: string): Promise<Profile | null> {
    return this.run('getProfileByTokenHash', async (db) => {
      const { data, error } = await db.from('profiles').select('id, nickname, rating, created_at, last_seen_at')
        .eq('token_hash', tokenHash).maybeSingle();
      if (error) return fail('getProfileByTokenHash');
      return data ? toProfile(data as Row) : null;
    });
  }

  // API-002 last_seen_at 갱신
  async touchProfile(guestId: string): Promise<void> {
    await this.run('touchProfile', async (db) => {
      const { error } = await db.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', guestId);
      if (error) fail('touchProfile');
    });
  }

  // FR-018 · FR-047 · FR-062 매칭·라운드 시작 입력
  async getPlayers(guestIds: string[]): Promise<PlayerSnapshot[]> {
    const ids = [...new Set(guestIds)];
    if (ids.length === 0) return [];
    return this.run('getPlayers', async (db) => {
      const { data, error } = await db.from('profiles')
        .select('id, nickname, rating, created_at, last_seen_at, player_progress(rounds_played, loss_streak, last_record)').in('id', ids);
      if (error) return fail('getPlayers');
      return (data as Row[]).flatMap((r) => {
        const g = one(r.player_progress);
        if (!g) return [];
        return [{
          profile: toProfile(r),
          progress: { guestId: String(r.id), roundsPlayed: Number(g.rounds_played), lossStreak: Number(g.loss_streak), lastRecord: asRecord(g.last_record) },
        }];
      });
    });
  }

  // FR-065 · FR-067 · FR-068 · FR-070 · D-20 경기 기록 — record_match(p jsonb) 1회 (RATING_CHANGED 예외는 그대로 코드로)
  async recordMatch(input: RecordMatchInput): Promise<RecordMatchResult> {
    return this.run('recordMatch', async (db) => {
      const { data, error } = await db.rpc('record_match', { p: input });
      if (error) {
        if (/RATING_CHANGED/.test((error as PgError).message ?? '')) throw new StoreError('RATING_CHANGED');
        return fail('recordMatch');
      }
      const r = (data ?? {}) as Row;
      const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
      return {
        ratingDelta1: num(r.ratingDelta1),
        ratingDelta2: num(r.ratingDelta2),
        newAchievements: (r.newAchievements as RecordMatchResult['newAchievements']) ?? [],
        previousRecords: (r.previousRecords as RecordMatchResult['previousRecords']) ?? {},
      };
    });
  }

  // FR-023 · FR-067 연습 종료 — 진행 라운드·직전 기록 갱신
  async recordPractice(input: RecordPracticeInput): Promise<{ previousRecord: PersonalRecord | null }> {
    return this.run('recordPractice', async (db) => {
      const prev = await db.from('player_progress').select('rounds_played, last_record').eq('guest_id', input.guestId).maybeSingle();
      if (prev.error || !prev.data) return fail('recordPractice');
      const row = prev.data as Row;
      const { error } = await db.from('player_progress').update({
        rounds_played: Number(row.rounds_played) + input.roundsDelta, last_record: input.record, updated_at: new Date().toISOString(),
      }).eq('guest_id', input.guestId);
      if (error) return fail('recordPractice');
      return { previousRecord: asRecord(row.last_record) };
    });
  }

  // FR-069 · API-003 내 전적 최신순 페이지
  async listMatches(guestId: string, page: number, size: number): Promise<{ items: MatchListItem[]; totalCount: number }> {
    return this.run('listMatches', async (db) => {
      const from = (page - 1) * size;
      const { data, error, count } = await db.from('matches')
        .select('*, p1:profiles!matches_player1_id_fkey(nickname), p2:profiles!matches_player2_id_fkey(nickname)', { count: 'exact' })
        .or(`player1_id.eq.${guestId},player2_id.eq.${guestId}`)
        .order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(from, from + size - 1);
      if (error) return fail('listMatches');
      return { items: (data as Row[]).map((r) => toItem(r, guestId)), totalCount: count ?? 0 };
    });
  }

  // FR-071 · API-004 상위 100 (leaderboard 뷰 — 매 요청 조회, architecture §4.3)
  async getLeaderboard(): Promise<LeaderboardRow[]> {
    return this.run('getLeaderboard', async (db) => {
      const { data, error } = await db.from('leaderboard').select('rank, guest_id, nickname, rating').limit(LIMITS.RANKING_TOP);
      if (error) return fail('getLeaderboard');
      return (data as Row[]).map((r) => ({ rank: Number(r.rank), guestId: String(r.guest_id), nickname: String(r.nickname), rating: Number(r.rating) }));
    });
  }

  // FR-071 · API-004 내 순위 (100위 밖 포함)
  async getRank(guestId: string): Promise<{ rank: number; nickname: string; rating: number } | null> {
    return this.run('getRank', async (db) => {
      const me = await db.from('profiles').select('nickname, rating, created_at').eq('id', guestId).maybeSingle();
      if (me.error) return fail('getRank');
      if (!me.data) return null;
      const r = me.data as Row;
      const rating = Number(r.rating);
      const { count, error } = await db.from('profiles').select('id', { count: 'exact', head: true })
        .or(`rating.gt.${rating},and(rating.eq.${rating},created_at.lt."${String(r.created_at)}")`);
      if (error) return fail('getRank');
      return { rank: 1 + (count ?? 0), nickname: String(r.nickname), rating };
    });
  }
}

/** matches 1행(+닉네임 임베드) → 내 관점의 API-003 항목 */
function toItem(r: Row, guestId: string): MatchListItem {
  const mySlot = r.player1_id === guestId ? 1 : 2;
  const isBot = r.player2_id === null || r.player2_id === undefined;
  const opp = one(mySlot === 1 ? r.p2 : r.p1);
  const rounds: [number, number] = mySlot === 1 ? [Number(r.rounds1), Number(r.rounds2)] : [Number(r.rounds2), Number(r.rounds1)];
  const delta = mySlot === 1 ? r.rating_delta1 : r.rating_delta2;
  return {
    matchId: String(r.id),
    mode: String(r.mode) as MatchMode,
    opponent: isBot ? { nickname: null, isBot: true, botLevel: (r.bot_level as BotLevel | null) ?? null }
      : { nickname: opp ? String(opp.nickname) : null, isBot: false, botLevel: null },
    myHero: String(mySlot === 1 ? r.hero1 : r.hero2) as HeroId,
    opponentHero: String(mySlot === 1 ? r.hero2 : r.hero1) as HeroId,
    result: Number(r.winner_slot) === mySlot ? 'win' : 'loss',
    endReason: String(r.end_reason) as EndReason,
    rounds,
    durationMs: Number(r.duration_ms),
    ratingDelta: delta === null || delta === undefined ? null : Number(delta),
    createdAt: iso(r.created_at),
  };
}
