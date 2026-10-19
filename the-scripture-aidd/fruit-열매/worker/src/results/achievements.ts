// TASK-031-1 · FR-065 · REQ-013 · TBL-109 — 업적 후보 판정 ("골리앗 사냥꾼 — 다윗으로 한 경기 테트리스 5회")
// 조건은 content/achievements.json `condition`에서만 읽는다. 1회 달성 보장은 저장소 PK(guest_id, achievement_id)가 맡는다.
import { achievements } from '../content';
import type { HeroId, SlotStats } from '../store/store';

// FR-065 한 경기의 업적 후보 ID 목록 (사람 플레이어 1명 기준 — 봇·연습은 호출하지 않는다)
export function judgeAchievements(heroId: HeroId, stats: Pick<SlotStats, 'tetrises'>): string[] {
  const earned: string[] = [];
  for (const def of achievements) {
    const condition = def.condition as { heroId?: unknown; tetrisInMatch?: unknown };
    if (condition.heroId !== heroId) continue;
    if (typeof condition.tetrisInMatch !== 'number' || stats.tetrises < condition.tetrisInMatch) continue;
    earned.push(def.id);
  }
  return earned;
}
