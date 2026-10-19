// content.ts — content JSON 8종 import + 타입 + id 색인 제공만 — 서버 단일 import 지점
// TASK-009 | REQ-016 FR-038 FR-074 C-010 | TBL-011~TBL-018 | ARCH-016 | D-15 (빌드 시 번들 — 런타임 네트워크 조회 0)
// 다른 서버 파일은 content/*.json을 직접 import하지 않는다 (devguide §3.5-5). 수치는 rules에서만 읽는다.
import heroesJson from "../../content/heroes.json";
import angelsJson from "../../content/angels.json";
import spiritsJson from "../../content/spirits.json";
import armorJson from "../../content/armor.json";
import countersJson from "../../content/counters.json";
import versesJson from "../../content/verses.json";
import quizJson from "../../content/quiz.json";
import rulesJson from "../../content/rules.json";

/** CODE-007 방해 분류 */
export type SpiritCategory = "vision" | "sense" | "deception" | "control" | "speed" | "seal" | "board";

/** TBL-011 위인 */
export interface Hero {
  id: "david" | "solomon" | "peter" | "paul";
  name_ko: string;
  name_en: string;
  skill_id: string;
  skill_name_ko: string;
  skill_effect_ko: string;
  passive_ko: string | null;
  verse_ref: string;
  emblem: string;
}

/** TBL-012 천사 */
export interface Angel {
  id: "michael" | "gabriel" | "cherubim" | "seraphim" | "ministering_spirits";
  name_ko: string;
  name_en: string;
  effect_ko: string;
  verse_ref: string;
  visual: string;
}

/** TBL-013 악한 영 — 서버 소환 결정(attack.ts)과 클라이언트 연출이 같은 표를 읽는다 (FR-074) */
export interface Spirit {
  id: string;
  name_ko: string;
  name_en: string;
  tier: number;
  effect: string;
  category: SpiritCategory;
  duration_ms: number;
  params: Record<string, number | string>;
  verse_ref: string;
}

/** TBL-014 전신갑주 */
export interface Armor {
  id: string;
  name_ko: string;
  name_en: string;
  effect_ko: string;
  action: "nullify" | "reduce_next" | "block_next" | "reflect";
  nullifies: SpiritCategory[] | null;
  verse_ref: string;
}

/** TBL-015 상성표 1행 */
export interface CounterRow {
  spirit_id: string;
  counters: { kind: "angel" | "armor"; id: string }[];
}

/** TBL-016 KJV 구절 */
export interface Verse {
  ref: string;
  kjv: string;
  ko: string;
  ref_ko: string;
}

/** TBL-017 말씀 대결 문항 — answer는 서버만 사용 (API-026 `quiz`에 넣지 않는다) */
export interface QuizItem {
  id: string;
  type: "person" | "event" | "verse_blank";
  difficulty: 1 | 2 | 3;
  question_ko: string;
  choices: string[];
  answer: number;
  verse_ref: string;
}

/** TBL-018 규칙 수치 — JSON 구조 그대로의 타입 */
export type Rules = typeof rulesJson;

export const heroes = heroesJson as readonly Hero[];
export const angels = angelsJson as readonly Angel[];
export const spirits = spiritsJson as unknown as readonly Spirit[];
export const armor = armorJson as readonly Armor[];
export const counters = countersJson as readonly CounterRow[];
export const verses = versesJson as readonly Verse[];
export const quiz = quizJson as readonly QuizItem[];
export const rules: Rules = rulesJson;

function indexBy<T>(list: readonly T[], key: (item: T) => string): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const item of list) map.set(key(item), item);
  return map;
}

/** id 색인 (CODE-003·011·010, spirits id, verses ref, quiz id) */
export const heroesById = indexBy(heroes, (h) => h.id);
export const angelsById = indexBy(angels, (a) => a.id);
export const spiritsById = indexBy(spirits, (s) => s.id);
export const armorById = indexBy(armor, (a) => a.id);
export const countersBySpiritId = indexBy(counters, (c) => c.spirit_id);
export const versesByRef = indexBy(verses, (v) => v.ref);
export const quizById = indexBy(quiz, (q) => q.id);
