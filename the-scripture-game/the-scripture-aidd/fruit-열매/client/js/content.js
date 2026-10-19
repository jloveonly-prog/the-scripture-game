// content.js — content JSON 7종 import + id 색인(Map) 제공만 — 클라이언트 단일 import 지점
// TASK-009 | REQ-016 FR-013 FR-038 FR-074 C-010 | TBL-011~TBL-016 TBL-018 | ARCH-016 | D-15 (빌드 시 번들 — 오프라인 표시 NFR-005)
// quiz.json은 import하지 않는다: 정답(answer)은 서버만 사용하고 문제는 서버 `quiz` 메시지로 받는다
// (TBL-017, API-026, FR-032 서버 권한 — 번들에 정답이 실리면 클라이언트가 정답을 알 수 있다).
// 다른 클라이언트 파일은 content/*.json을 직접 import하지 않는다 (devguide §3.5-5). 수치는 rules에서만 읽는다.
import heroesJson from "../../content/heroes.json";
import angelsJson from "../../content/angels.json";
import spiritsJson from "../../content/spirits.json";
import armorJson from "../../content/armor.json";
import countersJson from "../../content/counters.json";
import versesJson from "../../content/verses.json";
import rulesJson from "../../content/rules.json";

/**
 * 배열을 id 키 Map으로 색인한다.
 * @template T
 * @param {readonly T[]} list
 * @param {(item: T) => string} key
 * @returns {ReadonlyMap<string, T>}
 */
function indexBy(list, key) {
  const map = new Map();
  for (const item of list) map.set(key(item), item);
  return map;
}

/** TBL-011 위인 4명 (FR-013 캐릭터 선택 화면 순서 그대로) */
export const heroes = Object.freeze(heroesJson);
/** TBL-012 천사 5종 */
export const angels = Object.freeze(angelsJson);
/** TBL-013 악한 영 14종 — 가림 수치(params)는 그대로 쓴다 (D3-09 공정성) */
export const spirits = Object.freeze(spiritsJson);
/** TBL-014 전신갑주 6종 */
export const armor = Object.freeze(armorJson);
/** TBL-015 상성표 (FR-038) */
export const counters = Object.freeze(countersJson);
/** TBL-016 KJV 구절 {ref, kjv, ko, ref_ko} (C-003) */
export const verses = Object.freeze(versesJson);
/** TBL-018 규칙 수치 — 화면 표시 수치(비용·쿨다운 등)의 단일 원천 */
export const rules = Object.freeze(rulesJson);

export const heroesById = indexBy(heroes, (h) => h.id);
export const angelsById = indexBy(angels, (a) => a.id);
export const spiritsById = indexBy(spirits, (s) => s.id);
export const armorById = indexBy(armor, (a) => a.id);
export const countersBySpiritId = indexBy(counters, (c) => c.spirit_id);
export const versesByRef = indexBy(verses, (v) => v.ref);
