// TASK-031-3 · FR-065 · FR-070 · FR-075 · REQ-017 — Elo 대칭·반올림·하한, 봇 경기 null, RATING_CHANGED 재시도, 저장 실패 saved:false, 업적 1회
import { describe, expect, it, vi } from 'vitest';
import { computeElo, expectedScore } from '../../../worker/src/elo';
import { judgeAchievements } from '../../../worker/src/results/achievements';
import { recordMatchOutcome } from '../../../worker/src/results/record-match';
import type { MatchOutcome } from '../../../worker/src/results/record-match';
import { StoreError } from '../../../worker/src/store/store';
import type { RecordMatchInput, RecordMatchResult, SlotStats, Store } from '../../../worker/src/store/store';

const slot = (over: Partial<SlotStats> = {}): SlotStats => ({
  maxCombo: 4, linesCleared: 20, tetrises: 0, attackSent: 10, attackPerMin: 5.04, quizCorrect: 1, quizAnswered: 3,
  skillsUsed: 1, angelsUsed: 0, armorUsed: 0, jesusEvent: false, ...over,
});

function outcome(over: Partial<MatchOutcome> = {}): MatchOutcome {
  return {
    roomId: '00000000-0000-4000-8000-000000000001', mode: 'random', winnerSlot: 1, score: [2, 1], endReason: 'topout', durationMs: 90000,
    slots: [
      { slot: 1, guestId: 'g1', heroId: 'david', isBot: false, botLevel: null, ratingAtStart: 1000, roundsDelta: 3, lossStreak: 0 },
      { slot: 2, guestId: 'g2', heroId: 'paul', isBot: false, botLevel: null, ratingAtStart: 1000, roundsDelta: 3, lossStreak: 2 },
    ],
    stats: { p1: slot({ tetrises: 5 }), p2: slot(), rounds: [], quizCount: 1, verseRef: 'John 16:33' },
    ...over,
  };
}

function fakeStore(recordMatch: (input: RecordMatchInput) => Promise<RecordMatchResult>, ratings: Record<string, number> = {}): Store {
  return {
    recordMatch: vi.fn(recordMatch),
    getPlayers: vi.fn(async (ids: string[]) => ids.map((id) => ({
      profile: { id, nickname: id, rating: ratings[id] ?? 1000, createdAt: '', lastSeenAt: '' },
      progress: { guestId: id, roundsPlayed: 0, lossStreak: 0, lastRecord: null },
    }))),
  } as unknown as Store;
}

const echo = async (input: RecordMatchInput): Promise<RecordMatchResult> => ({
  ratingDelta1: input.rating ? input.rating.newRating1 - input.rating.expectedRating1 : null,
  ratingDelta2: input.rating ? input.rating.newRating2 - input.rating.expectedRating2 : null,
  newAchievements: input.achievements,
  previousRecords: {},
});

describe('Elo (D-21)', () => {
  it('같은 레이팅: 기대 승률 0.5, 승자 +16 / 패자 −16 (K 32)', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
    expect(computeElo(1000, 1000, 1)).toEqual({ newRating1: 1016, newRating2: 984, delta1: 16, delta2: -16 });
  });

  it('반올림 정수·대칭 (변화량 합 0)', () => {
    const r = computeElo(1200, 1000, 2);
    expect(Number.isInteger(r.delta1)).toBe(true);
    expect(r.delta1 + r.delta2).toBe(0);
    expect(r.delta2).toBe(Math.round(32 * (1 - expectedScore(1000, 1200))));
  });

  it('하한 0', () => {
    const r = computeElo(10, 30, 2); // 패자 10 − 15 → 0에서 멈춘다
    expect(r.newRating1).toBe(0);
    expect(r.delta1).toBe(-10);
  });
});

describe('업적 판정 (FR-065)', () => {
  it('다윗으로 한 경기 테트리스 5회 → goliath_hunter, 다른 위인·4회는 없음', () => {
    expect(judgeAchievements('david', { tetrises: 5 })).toEqual(['goliath_hunter']);
    expect(judgeAchievements('david', { tetrises: 4 })).toEqual([]);
    expect(judgeAchievements('paul', { tetrises: 9 })).toEqual([]);
  });
});

describe('recordMatchOutcome (devguide §7.5)', () => {
  it('사람 대 사람: Elo 반영, 진행 기록·업적 후보 전달, 슬롯별 결과', async () => {
    const store = fakeStore(echo);
    const res = await recordMatchOutcome(store, outcome());
    expect(res.saved).toBe(true);
    expect(res.slots[1]).toMatchObject({ ratingDelta: 16, rating: 1016, achievements: ['goliath_hunter'], growth: null });
    expect(res.slots[2]).toMatchObject({ ratingDelta: -16, rating: 984, achievements: [] });
    const input = (store.recordMatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as RecordMatchInput;
    expect(input.progress).toEqual([
      expect.objectContaining({ guestId: 'g1', roundsDelta: 3, lossStreak: 0 }),
      expect.objectContaining({ guestId: 'g2', roundsDelta: 3, lossStreak: 2 }),
    ]);
  });

  it('봇 경기: 레이팅 null (OQ #5), player2Id null, 봇 슬롯 업적 없음', async () => {
    const store = fakeStore(echo);
    const res = await recordMatchOutcome(store, outcome({
      mode: 'bot',
      slots: [
        { slot: 1, guestId: 'g1', heroId: 'david', isBot: false, botLevel: null, ratingAtStart: 1000, roundsDelta: 2, lossStreak: 0 },
        { slot: 2, guestId: null, heroId: 'david', isBot: true, botLevel: 'easy', ratingAtStart: null, roundsDelta: 2, lossStreak: 0 },
      ],
      stats: { p1: slot({ tetrises: 5 }), p2: slot({ tetrises: 7 }), rounds: [], quizCount: 0, verseRef: 'John 1:5' },
    }));
    const input = (store.recordMatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as RecordMatchInput;
    expect(input).toMatchObject({ rating: null, player2Id: null, botLevel: 'easy' });
    expect(input.achievements).toEqual([{ guestId: 'g1', achievementId: 'goliath_hunter' }]);
    expect(res.slots[1]).toMatchObject({ ratingDelta: null, rating: null });
    expect(res.slots[2]).toMatchObject({ ratingDelta: null, rating: null, growth: null, achievements: [] });
  });

  it('RATING_CHANGED → 최신 레이팅으로 재계산해 재시도', async () => {
    let calls = 0;
    const store = fakeStore(async (input) => {
      calls += 1;
      if (calls === 1) throw new StoreError('RATING_CHANGED');
      return echo(input);
    }, { g1: 1100, g2: 1000 });
    const res = await recordMatchOutcome(store, outcome());
    expect(res.saved).toBe(true);
    const second = (store.recordMatch as ReturnType<typeof vi.fn>).mock.calls[1][0] as RecordMatchInput;
    expect(second.rating).toMatchObject({ expectedRating1: 1100, expectedRating2: 1000 });
    expect(res.slots[1].rating).toBe(1100 + computeElo(1100, 1000, 1).delta1);
  });

  it('재시도 3회 후에도 충돌·저장 오류 → 던지지 않고 saved:false + 계산된 기록', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const store = fakeStore(async () => { throw new StoreError('RATING_CHANGED'); });
    const res = await recordMatchOutcome(store, outcome());
    expect(store.recordMatch).toHaveBeenCalledTimes(4);
    expect(res.saved).toBe(false);
    expect(res.slots[1]).toMatchObject({ ratingDelta: null, rating: null, achievements: [], record: { maxCombo: 4, attackPerMin: 5, quizAccuracy: 0.33 } });
    const broken = await recordMatchOutcome(fakeStore(async () => { throw new StoreError('STORE_UNAVAILABLE'); }), outcome());
    expect(broken.saved).toBe(false);
  });

  it('저장소가 이미 달성한 업적은 다시 알리지 않는다 (업적 1회)', async () => {
    const store = fakeStore(async (input) => ({ ...(await echo(input)), newAchievements: [] }));
    const res = await recordMatchOutcome(store, outcome());
    expect(res.slots[1].achievements).toEqual([]);
  });
});
