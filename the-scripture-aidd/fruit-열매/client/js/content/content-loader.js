// TASK-006 · FR-074 · FR-013 · C-003 · C-010 · ARCH-018
// 단일 책임: 클라이언트 번들용 콘텐츠 import·ID 색인 (Vite가 빌드 타임에 포함 — 네트워크 요청 없음, NFR-005).
// quiz.json은 가져오지 않는다 — 정답(answer)은 quizResult 전까지 클라이언트에 오면 안 된다 (api-gate R-11, 봉인 제7계명).
// 문항 문장·보기는 서버의 quizStart(API-257)로만 받는다.
import heroes from '../../../content/heroes.json';
import angels from '../../../content/angels.json';
import spirits from '../../../content/spirits.json';
import armor from '../../../content/armor.json';
import counters from '../../../content/counters.json';
import verses from '../../../content/verses.json';
import balance from '../../../content/balance.json';
import achievements from '../../../content/achievements.json';

const byId = (items) => new Map(items.map((item) => [item.id, item]));

export const content = Object.freeze({
  heroes,
  angels,
  spirits,
  armor,
  counters,
  verses,
  balance,
  achievements,
});

export const heroesById = byId(heroes);
export const angelsById = byId(angels);
export const spiritsById = byId(spirits);
export const armorById = byId(armor);
export const achievementsById = byId(achievements);
export const countersBySpiritId = new Map(counters.map((c) => [c.spiritId, c]));
export const versesByRef = new Map(verses.map((v) => [v.ref, v]));
/** 셀 코드(d~i) → 갑주 정의 (CODE-009) */
export const armorByCellCode = new Map(armor.map((a) => [a.cellCode, a]));

/** 구절 `{ ref, kjv, ko }` 조회 — 없으면 null (화면은 null이면 구절 영역을 그리지 않는다) */
export function getVerse(ref) {
  return versesByRef.get(ref) ?? null;
}
