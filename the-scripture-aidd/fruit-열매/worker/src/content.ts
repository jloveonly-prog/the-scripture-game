// TASK-006 · FR-074 · FR-038 · FR-043 · C-003 · C-010 · D-15 · D-32 · ARCH-018
// 단일 책임: content/*.json 9종을 wrangler 번들로 import 하여 타입을 붙이고 ID 색인을 만든다 (서버 측 단일 원천).
import heroesJson from '../../content/heroes.json';
import angelsJson from '../../content/angels.json';
import spiritsJson from '../../content/spirits.json';
import armorJson from '../../content/armor.json';
import countersJson from '../../content/counters.json';
import versesJson from '../../content/verses.json';
import quizJson from '../../content/quiz.json';
import balanceJson from '../../content/balance.json';
import achievementsJson from '../../content/achievements.json';

/** 효과 지시 객체 (TBL-101·102·104 action — api-gate API-255 effect.action과 같은 형식) */
export interface ActionDef { type: string; [key: string]: unknown }

export interface HeroDef {
  id: string; nameKo: string; nameEn: string;
  skill: { id: string; nameKo: string; descKo: string; cost: number; cooldownMs: number; action: ActionDef };
  passive: ActionDef | null;
  verseRef: string;
  emblem: { motif: string; palette: string[] };
}
export interface AngelDef {
  id: string; nameKo: string; nameEn: string; cost: number; cooldownMs: number;
  action: ActionDef; art: { motif: string }; verseRef: string;
}
export interface SpiritDef {
  id: string; nameKo: string; nameKjv: string; grade: number | 'boss'; category: string;
  effect: { kinds: string[]; durationMs: number; params: Record<string, unknown> };
  verseRef: string; art: { motif: string };
}
export interface ArmorDef { id: string; nameKo: string; cellCode: string; action: ActionDef; verseRef: string }
export interface CounterDef { spiritId: string; angels: string[]; armor: string[] }
export interface VerseDef { ref: string; kjv: string; ko: string }
export interface QuizDef {
  id: string; type: 'person' | 'event' | 'fill_blank'; difficulty: 1 | 2 | 3; question: string;
  choices: [string, string, string, string]; answer: number; verseRef: string; explanation: string;
}
export interface AchievementDef { id: string; nameKo: string; condition: Record<string, unknown>; verseRef: string }
/** TBL-108 balance.json — 섹션 구조는 data-ark §8.8, 키 목록은 devguide §7.2 */
export type BalanceDef = typeof balanceJson;

function indexById<T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export const heroes = heroesJson as unknown as readonly HeroDef[];
export const angels = angelsJson as unknown as readonly AngelDef[];
export const spirits = spiritsJson as unknown as readonly SpiritDef[];
export const armor = armorJson as unknown as readonly ArmorDef[];
export const counters = countersJson as unknown as readonly CounterDef[];
export const verses = versesJson as unknown as readonly VerseDef[];
export const quiz = quizJson as unknown as readonly QuizDef[];
export const balance: BalanceDef = balanceJson;
export const achievements = achievementsJson as unknown as readonly AchievementDef[];

export const heroesById = indexById(heroes);
export const angelsById = indexById(angels);
export const spiritsById = indexById(spirits);
export const armorById = indexById(armor);
export const quizById = indexById(quiz);
export const achievementsById = indexById(achievements);
export const countersBySpiritId: ReadonlyMap<string, CounterDef> = new Map(counters.map((c) => [c.spiritId, c]));
export const versesByRef: ReadonlyMap<string, VerseDef> = new Map(verses.map((v) => [v.ref, v]));

/** 구절 조회 (없으면 null — 콘텐츠 무결성은 scripts/check-content.mjs가 보장, FR-076) */
export function getVerse(ref: string): VerseDef | null {
  return versesByRef.get(ref) ?? null;
}

/** skillId(`hero_*`·`angel_*`)로 위인 스킬 또는 천사 정의를 찾는다 (api-gate §2.6) */
export function findSkill(skillId: string): { kind: 'hero'; hero: HeroDef } | { kind: 'angel'; angel: AngelDef } | null {
  if (skillId.startsWith('hero_')) {
    const hero = heroesById.get(skillId.slice('hero_'.length));
    return hero ? { kind: 'hero', hero } : null;
  }
  if (skillId.startsWith('angel_')) {
    const angel = angelsById.get(skillId.slice('angel_'.length));
    return angel ? { kind: 'angel', angel } : null;
  }
  return null;
}
