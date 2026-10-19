// TASK-022 · FR-063 · FR-007 · architecture §11 #14 — 경기 대표 구절(말씀 카드) 선정.
// 단일 책임: 예수님 이벤트 → John 16:33 / 아니면 경기에서 가장 많이 발동된 천사·위인 스킬·갑주의 근거 구절 / 없으면 내 위인 구절.
import { angelsById, armorById, heroesById } from '../content';
import { JESUS_VERSE_REF } from './jesus-event';

/** FR-007 승자 화면 구절 (api-gate API-262 victoryVerseRef) */
export const VICTORY_VERSE_REF = '2 Timothy 4:7';

/** usage 키 (`hero:<heroId>` · `angel:<angelId>` · `armor:<armorId>`) → 근거 구절 */
function verseForUsageKey(key: string): string | null {
  const [kind, id] = key.split(':');
  if (kind === 'hero') return heroesById.get(id)?.verseRef ?? null;
  if (kind === 'angel') return angelsById.get(id)?.verseRef ?? null;
  if (kind === 'armor') return armorById.get(id)?.verseRef ?? null;
  return null;
}

export const usageKey = (kind: 'hero' | 'angel' | 'armor', id: string): string => `${kind}:${id}`;

// FR-063 대표 구절 선정 (동률이면 먼저 발동된 항목 — usage 삽입 순서)
export function selectRepresentativeVerse(input: { jesusEvent: boolean; usage: Record<string, number>; heroId: string }): string {
  if (input.jesusEvent) return JESUS_VERSE_REF;
  let best: { ref: string; count: number } | null = null;
  for (const [key, count] of Object.entries(input.usage)) {
    const ref = verseForUsageKey(key);
    if (ref !== null && count > 0 && (best === null || count > best.count)) best = { ref, count };
  }
  return best?.ref ?? heroesById.get(input.heroId)?.verseRef ?? VICTORY_VERSE_REF;
}
