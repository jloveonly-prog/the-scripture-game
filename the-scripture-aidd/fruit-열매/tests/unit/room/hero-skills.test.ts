// TASK-021-6 · FR-075 · FR-014~017 · FR-034 — 위인 스킬 4종 발동 검증·효과 지시 검사.
import { describe, expect, it } from 'vitest';
import { performHeroSkill, resolveHeroSkill } from '../../../worker/src/room/hero-skills.ts';
import { createRoomState, type PlayerState } from '../../../worker/src/room/room-state.ts';
import type { HeroId } from '../../../worker/src/store/store.ts';

function player(heroId: HeroId, faith = 100): PlayerState {
  const room = createRoomState({
    roomId: 'r', mode: 'random', botLevel: null, createdAt: 0,
    roster: [{ slot: 1, guestId: 'g1', nickname: 'a', heroId, isBot: false, botLevel: null, rating: 1000, roundsPlayed: 0, lossStreak: 0 }],
  });
  room.players[0].faith.faith = faith;
  return room.players[0];
}

describe('위인 스킬 (FR-014~017, FR-034)', () => {
  it('내 위인 스킬만 인정 (INVALID_SKILL)', () => {
    expect(resolveHeroSkill('david', 'hero_david')?.id).toBe('david');
    expect(resolveHeroSkill('david', 'hero_paul')).toBeNull();
    expect(performHeroSkill(player('david'), 'hero_paul', 2, 0)).toEqual({ ok: false, code: 'INVALID_SKILL' });
  });

  it('다윗 물맷돌: 상대 보드 대상, 게이지 50 차감·쿨다운 20초', () => {
    const p = player('david', 60);
    const r = performHeroSkill(p, 'hero_david', 2, 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.effect).toMatchObject({ kind: 'hero', id: 'hero_david', bySlot: 1, targetSlot: 2, action: { type: 'destroyTopBlocks', count: 3 }, verseRef: '1 Samuel 17:49' });
    expect(p.faith.faith).toBe(10);
    expect(performHeroSkill(p, 'hero_david', 2, 5000)).toEqual({ ok: false, code: 'COOLDOWN', retryAfterMs: 16000 });
  });

  it('게이지 부족 → FAITH_INSUFFICIENT (상태 불변)', () => {
    const p = player('paul', 59);
    expect(performHeroSkill(p, 'hero_paul', 2, 0)).toEqual({ ok: false, code: 'FAITH_INSUFFICIENT' });
    expect(p.faith.faith).toBe(59);
    expect(p.faith.cooldownUntil).toEqual({});
  });

  it('솔로몬 힌트 10초는 내 보드, 바울은 맨 아래 쓰레기 3줄 삭제 지시', () => {
    const s = performHeroSkill(player('solomon'), 'hero_solomon', 2, 0);
    expect(s.ok && s.effect).toMatchObject({ targetSlot: 1, durationMs: 10000, action: { type: 'landingHint' } });
    const p = performHeroSkill(player('paul'), 'hero_paul', 2, 0);
    expect(p.ok && p.effect).toMatchObject({ targetSlot: 1, action: { type: 'removeBottomGarbage', rows: 3 } });
  });

  it('베드로: 서버가 10초간 받는 쓰레기를 0으로 (garbageImmuneUntil)', () => {
    const p = player('peter');
    const r = performHeroSkill(p, 'hero_peter', 2, 2000);
    expect(r.ok).toBe(true);
    expect(p.garbageImmuneUntil).toBe(12000);
  });

  it('연습처럼 상대가 없으면 다윗도 내 보드 대상', () => {
    const r = performHeroSkill(player('david'), 'hero_david', null, 0);
    expect(r.ok && r.effect.targetSlot).toBe(1);
  });
});
