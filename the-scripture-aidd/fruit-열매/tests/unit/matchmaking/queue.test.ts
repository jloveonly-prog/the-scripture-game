// TASK-034-3 · FR-018 · FR-020 · FR-021 · REQ-017 — 근접 매칭·1인 대기·중복 대기·명단·matched 본문
import { describe, expect, it } from 'vitest';
import { isQueued, pickOpponent, removeFromQueue } from '../../../worker/src/matchmaking/queue';
import { buildRoomInit, buildRoster, matchedPayload, pickBotHero } from '../../../worker/src/matchmaking/room-factory';
import type { Participant } from '../../../worker/src/matchmaking/room-factory';

const waiting = [
  { guestId: 'a', rating: 1300, queuedAt: 1 },
  { guestId: 'b', rating: 1080, queuedAt: 2 },
  { guestId: 'c', rating: 920, queuedAt: 3 },
];

describe('pickOpponent (FR-018)', () => {
  it('레이팅 차이가 가장 작은 상대', () => {
    expect(pickOpponent(waiting, { guestId: 'n', rating: 1250 })?.guestId).toBe('a');
    expect(pickOpponent(waiting, { guestId: 'n', rating: 950 })?.guestId).toBe('c');
  });

  it('차이 동률이면 먼저 기다린 사람', () => {
    expect(pickOpponent(waiting, { guestId: 'n', rating: 1000 })?.guestId).toBe('b');
  });

  it('대기자 1명이면 차이와 무관하게 짝 (UC-003 3a), 없으면 null', () => {
    expect(pickOpponent([{ guestId: 'x', rating: 3000, queuedAt: 1 }], { guestId: 'n', rating: 0 })?.guestId).toBe('x');
    expect(pickOpponent([], { guestId: 'n', rating: 1000 })).toBeNull();
  });

  it('자기 자신과는 짝짓지 않는다', () => {
    expect(pickOpponent([{ guestId: 'n', rating: 1000, queuedAt: 1 }], { guestId: 'n', rating: 1000 })).toBeNull();
  });
});

describe('대기열 정리 (FR-020)', () => {
  it('중복 대기 판정·제거', () => {
    expect(isQueued(waiting, 'b')).toBe(true);
    expect(isQueued(removeFromQueue(waiting, 'b'), 'b')).toBe(false);
    expect(removeFromQueue(waiting, 'b')).toHaveLength(2);
  });
});

describe('room-factory (R-13 명단, API-153)', () => {
  const p = (guestId: string, heroId: Participant['heroId']): Participant =>
    ({ guestId, nickname: `n-${guestId}`, heroId, rating: 1000, roundsPlayed: 4, lossStreak: 3 });

  it('사람 대 사람 명단과 슬롯별 matched', () => {
    const init = buildRoomInit('r1', 'random', buildRoster([p('a', 'david'), p('b', 'paul')]), null, 5);
    expect(init.roster.map((r) => [r.slot, r.guestId, r.isBot])).toEqual([[1, 'a', false], [2, 'b', false]]);
    expect(matchedPayload(init, 2)).toEqual({ roomId: 'r1', mode: 'random', slot: 2,
      opponent: { nickname: 'n-a', heroId: 'david', isBot: false, botLevel: null } });
  });

  it('봇: 사람 슬롯 1 + 봇 슬롯 2(위인 무작위), 연습: 상대 null', () => {
    const bot = buildRoomInit('r2', 'bot', buildRoster([p('a', 'david')], { heroId: pickBotHero(() => 0.99), botLevel: 'normal' }), 'normal', 5);
    expect(bot.roster[1]).toMatchObject({ slot: 2, guestId: null, nickname: null, heroId: 'paul', isBot: true, botLevel: 'normal', rating: null });
    expect(matchedPayload(bot, 1).opponent).toEqual({ nickname: null, heroId: 'paul', isBot: true, botLevel: 'normal' });
    expect(pickBotHero(() => 0)).toBe('david');
    const practice = buildRoomInit('r3', 'practice', buildRoster([p('a', 'peter')]), null, 5);
    expect(matchedPayload(practice, 1)).toMatchObject({ slot: 1, opponent: null });
  });
});
