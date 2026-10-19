// TASK-031-2 · FR-009 · FR-065 · FR-066 · FR-067 · FR-068 · FR-070 · D-20 · D-21 · UC-015 E2 — 경기·연습 결과 기록 오케스트레이션
// 개인 기록·성장·Elo·업적을 계산해 Store에 1트랜잭션으로 넘긴다. 저장 실패해도 던지지 않고 saved:false + 계산된 기록을 돌려준다 (devguide §7.5).
import { computeElo } from '../elo';
import { judgeAchievements } from './achievements';
import { buildPersonalRecord, computeGrowth } from './personal-record';
import { StoreError } from '../store/store';
import type {
  BotLevel, EndReason, HeroId, MatchMode, MatchStats, PersonalRecord, ProgressUpdate, RecordMatchInput, RecordMatchResult,
  SlotStats, Store,
} from '../store/store';

export interface SlotOutcome {
  slot: 1 | 2; guestId: string | null; heroId: HeroId; isBot: boolean; botLevel: BotLevel | null;
  ratingAtStart: number | null; roundsDelta: number; lossStreak: number;
}
export interface MatchOutcome {
  roomId: string; mode: MatchMode; slots: [SlotOutcome, SlotOutcome]; winnerSlot: 1 | 2;
  score: [number, number]; endReason: EndReason; durationMs: number; stats: MatchStats;
}
export interface SlotResult {
  ratingDelta: number | null; rating: number | null; record: PersonalRecord;
  growth: { maxCombo: number; attackPerMin: number; quizAccuracy: number } | null; achievements: string[];
}

/** data-ark §7.3 1단계: RATING_CHANGED 시 최신 레이팅으로 재계산해 최대 3회 재시도 (task-wall TASK-031-2) */
const MAX_RATING_RETRIES = 3;

function logEvent(event: string, roomId: string, guestId?: string | null): void {
  // devguide §3.7 — 게스트 ID 앞 8자만, 토큰·닉네임 미포함 (봉인 제1·8계명)
  console.log(JSON.stringify({ at: new Date().toISOString(), event, guest: guestId ? guestId.slice(0, 8) : undefined, roomId }));
}

const isHuman = (s: SlotOutcome): s is SlotOutcome & { guestId: string } => !s.isBot && typeof s.guestId === 'string';

/** 사람 대 사람 경기의 Elo 입력 (봇 경기·레이팅 정보 없음 → null — OQ #5) */
function ratingPlan(outcome: MatchOutcome, r1: number | null, r2: number | null): RecordMatchInput['rating'] {
  const [s1, s2] = outcome.slots;
  if (outcome.mode === 'bot' || !isHuman(s1) || !isHuman(s2) || r1 === null || r2 === null) return null;
  const elo = computeElo(r1, r2, outcome.winnerSlot);
  return { expectedRating1: r1, expectedRating2: r2, newRating1: elo.newRating1, newRating2: elo.newRating2 };
}

// FR-068 · FR-070 · D-20 경기 종료 기록 — 슬롯별 SlotResult 계산 후 Store.recordMatch 1회(레이팅 충돌 시 재시도)
export async function recordMatchOutcome(
  store: Store,
  outcome: MatchOutcome,
): Promise<{ saved: boolean; slots: { 1: SlotResult; 2: SlotResult } }> {
  const [s1, s2] = outcome.slots;
  const statsBySlot: Record<1 | 2, SlotStats> = { 1: outcome.stats.p1, 2: outcome.stats.p2 };
  const records: Record<1 | 2, PersonalRecord> = {
    1: buildPersonalRecord(statsBySlot[1], outcome.mode),
    2: buildPersonalRecord(statsBySlot[2], outcome.mode),
  };
  const humans = outcome.slots.filter(isHuman);
  const progress: ProgressUpdate[] = humans.map((s) => ({
    guestId: s.guestId, roundsDelta: s.roundsDelta, lossStreak: s.lossStreak, record: records[s.slot],
  }));
  const candidates = humans.flatMap((s) =>
    judgeAchievements(s.heroId, statsBySlot[s.slot]).map((achievementId) => ({ guestId: s.guestId, achievementId })));

  let saved = false;
  let result: RecordMatchResult | null = null;
  let rating: RecordMatchInput['rating'] = null;
  let r1 = s1.ratingAtStart;
  let r2 = s2.ratingAtStart;
  try {
    if (!isHuman(s1)) throw new Error('slot 1 must be a human player'); // TBL-002 player1_id NOT NULL
    for (let attempt = 0; ; attempt += 1) {
      rating = ratingPlan(outcome, r1, r2);
      const input: RecordMatchInput = {
        matchId: crypto.randomUUID(), roomId: outcome.roomId, mode: outcome.mode,
        player1Id: s1.guestId, player2Id: isHuman(s2) ? s2.guestId : null, botLevel: s2.isBot ? s2.botLevel : null,
        hero1: s1.heroId, hero2: s2.heroId, winnerSlot: outcome.winnerSlot,
        rounds1: outcome.score[0], rounds2: outcome.score[1], endReason: outcome.endReason,
        durationMs: outcome.durationMs, stats: outcome.stats, rating, progress, achievements: candidates,
      };
      try {
        result = await store.recordMatch(input);
        saved = true;
        break;
      } catch (err) {
        if (!(err instanceof StoreError) || err.code !== 'RATING_CHANGED' || attempt >= MAX_RATING_RETRIES) throw err;
        const players = await store.getPlayers(humans.map((h) => h.guestId)); // 최신 레이팅으로 재계산 (elo.ts 단일 원천)
        r1 = players.find((p) => p.profile.id === s1.guestId)?.profile.rating ?? r1;
        r2 = players.find((p) => p.profile.id === s2.guestId)?.profile.rating ?? r2;
      }
    }
    logEvent('match-recorded', outcome.roomId, s1.guestId);
  } catch (err) {
    const code = err instanceof StoreError ? err.code : 'INTERNAL_ERROR';
    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'match-record-failed', roomId: outcome.roomId, code }));
  }

  const slotResult = (s: SlotOutcome): SlotResult => {
    const human = isHuman(s);
    const ratingDelta = saved && rating && result ? (s.slot === 1 ? result.ratingDelta1 : result.ratingDelta2) : null;
    const newRating = saved && rating ? (s.slot === 1 ? rating.newRating1 : rating.newRating2) : null;
    const previous = human && saved && result ? result.previousRecords[s.guestId as string] : null;
    const achievements = human && saved && result
      ? result.newAchievements.filter((a) => a.guestId === s.guestId).map((a) => a.achievementId)
      : [];
    return { ratingDelta, rating: newRating, record: records[s.slot], growth: computeGrowth(records[s.slot], previous), achievements };
  };
  return { saved, slots: { 1: slotResult(s1), 2: slotResult(s2) } };
}

// FR-023 · FR-066 · FR-067 연습 종료 기록 — 진행 기록만 갱신(matches 미기록), 직전 기록 대비 성장
export async function recordPracticeOutcome(
  store: Store,
  input: { guestId: string; roundsDelta: number; stats: SlotStats; playTimeMs: number },
): Promise<{ saved: boolean; record: PersonalRecord; growth: SlotResult['growth'] }> {
  const record = buildPersonalRecord(input.stats, 'practice', input.playTimeMs);
  try {
    const { previousRecord } = await store.recordPractice({ guestId: input.guestId, roundsDelta: input.roundsDelta, record });
    logEvent('practice-recorded', '', input.guestId);
    return { saved: true, record, growth: computeGrowth(record, previousRecord) };
  } catch (err) {
    const code = err instanceof StoreError ? err.code : 'INTERNAL_ERROR';
    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'practice-record-failed', guest: input.guestId.slice(0, 8), code }));
    return { saved: false, record, growth: null };
  }
}
