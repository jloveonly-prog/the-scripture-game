// TASK-070 · REQ-011 · REQ-017 · FR-043 · FR-074 · FR-076 · C-003 · C-010 — `npm run check:content`
// 단일 책임: content/*.json 9종의 스키마(data-ark TBL-101~109)·참조 무결성(§8.9)·필수 구절(devguide §7.2)을 검사한다.
// 사용: checkContent(contentDir) → { ok, errors } · 직접 실행 시 결과 출력, 실패하면 종료 코드 1.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  ACHIEVEMENT_IDS, ANGEL_IDS, ARMOR_CELL_CODES, ARMOR_IDS, EFFECT_CATEGORIES, HERO_IDS, SPIRIT_IDS,
} from '../client/js/net/protocol.js';

export const CONTENT_FILES = ['heroes', 'angels', 'spirits', 'armor', 'counters', 'verses', 'quiz', 'balance', 'achievements'];

/** devguide §7.2 — verses.json 필수 ref 30개 (위인 4·천사 5·악한 영 14·갑주 4절·예수님 이벤트 2·승리 1) */
export const REQUIRED_REFS = [
  '1 Samuel 17:49', '1 Kings 3:9', 'Matthew 16:18', 'Acts 16:26', 'Jude 1:9', 'Luke 1:19', 'Genesis 3:24', 'Isaiah 6:6-7',
  'Hebrews 1:14', 'Mark 1:23', 'Mark 9:25', 'Mark 5:9', '1 Kings 22:22', 'Acts 16:16', 'Matthew 12:24', 'Ephesians 2:2',
  'Daniel 10:13', 'Revelation 9:11', 'Revelation 2:20', 'Zechariah 5:7-8', 'Revelation 17:5', '2 Corinthians 11:14',
  'Revelation 12:9', 'Ephesians 6:14', 'Ephesians 6:15', 'Ephesians 6:16', 'Ephesians 6:17', 'John 16:33', 'John 1:5',
  '2 Timothy 4:7',
];

export const REF_PATTERN = /^(?:[1-3] )?[A-Z][A-Za-z]+(?: [A-Za-z]+)* \d+:\d+(?:-\d+)?$/;
export const QUIZ_ID_PATTERN = /^q\d{3}$/;
export const QUIZ_TYPES = ['person', 'event', 'fill_blank'];
export const QUIZ_DIFFICULTIES = [1, 2, 3];
export const QUIZ_MIN_TOTAL = 60;
export const QUIZ_MIN_PER_GROUP = 15;
const HANGUL = /[가-힣]/;
const PROBABILITY_KEY = /(chance|rate|accuracy)$/i;

/** 문자열 길이 검사 (min~max자, 코드포인트 기준) */
function checkText(errors, where, value, min, max) {
  if (typeof value !== 'string') { errors.push(`${where}: 문자열이 아님`); return false; }
  const len = [...value].length;
  if (len < min || len > max) { errors.push(`${where}: 길이 ${len} (허용 ${min}~${max})`); return false; }
  return true;
}

/** 모든 파일 어디에도 빈 문자열이 없어야 한다 (data-ark §8 서식 규칙) */
function checkNoEmptyStrings(errors, file, node, path = file) {
  if (typeof node === 'string') {
    if (node.trim() === '') errors.push(`${path}: 빈 문자열`);
  } else if (Array.isArray(node)) {
    node.forEach((item, i) => checkNoEmptyStrings(errors, file, item, `${path}[${i}]`));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) checkNoEmptyStrings(errors, file, value, `${path}.${key}`);
  }
}

/** 배열 여부·수량·ID 유일성·정본 ID 목록(순서 포함) 일치 */
function checkIdList(errors, file, items, canonical, idKey = 'id') {
  if (!Array.isArray(items)) { errors.push(`${file}: 배열이 아님`); return false; }
  const ids = items.map((item) => item?.[idKey]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${file}: ${idKey} 중복 "${id}"`);
    seen.add(id);
  }
  if (canonical && ids.join(',') !== canonical.join(',')) {
    errors.push(`${file}: ${idKey} 목록이 정본과 다름 — 정본 [${canonical.join(', ')}], 실제 [${ids.join(', ')}]`);
  }
  return true;
}

function checkVerseRef(errors, where, ref, refs) {
  if (typeof ref !== 'string' || !refs.has(ref)) errors.push(`${where}: verseRef "${ref}"가 verses.json에 없음 (KJV 출처)`);
}

function checkAction(errors, where, action) {
  if (!action || typeof action !== 'object' || typeof action.type !== 'string') errors.push(`${where}: action.type 없음`);
}

function checkVerses(errors, verses) {
  if (!Array.isArray(verses)) { errors.push('verses: 배열이 아님'); return new Set(); }
  const refs = new Set();
  verses.forEach((v, i) => {
    const where = `verses[${i}] ${v?.ref ?? ''}`.trim();
    if (typeof v?.ref !== 'string' || !REF_PATTERN.test(v.ref)) errors.push(`${where}: ref 형식 위반`);
    else if (refs.has(v.ref)) errors.push(`${where}: ref 중복`);
    else refs.add(v.ref);
    if (checkText(errors, `${where}.kjv`, v?.kjv, 1, 600) && HANGUL.test(v.kjv)) errors.push(`${where}.kjv: KJV 원문에 한글이 섞임`);
    if (checkText(errors, `${where}.ko`, v?.ko, 1, 600) && !HANGUL.test(v.ko)) errors.push(`${where}.ko: 한국어 번역이 아님`);
  });
  for (const ref of REQUIRED_REFS) if (!refs.has(ref)) errors.push(`verses: 필수 구절 "${ref}" 없음 (devguide §7.2)`);
  return refs;
}

function checkCharacters(errors, data, refs) {
  const { heroes, angels, spirits, armor, achievements } = data;
  if (checkIdList(errors, 'heroes', heroes, HERO_IDS)) heroes.forEach((h) => {
    const w = `heroes.${h.id}`;
    checkText(errors, `${w}.nameKo`, h.nameKo, 1, 20); checkText(errors, `${w}.nameEn`, h.nameEn, 1, 20);
    if (h.skill?.id !== `hero_${h.id}`) errors.push(`${w}.skill.id: "hero_${h.id}" 이어야 함`);
    checkText(errors, `${w}.skill.nameKo`, h.skill?.nameKo, 1, 20); checkText(errors, `${w}.skill.descKo`, h.skill?.descKo, 1, 80);
    if (!Number.isInteger(h.skill?.cost) || !Number.isInteger(h.skill?.cooldownMs)) errors.push(`${w}.skill: cost·cooldownMs 정수 아님`);
    checkAction(errors, `${w}.skill`, h.skill?.action);
    if (h.passive !== null) checkAction(errors, `${w}.passive`, h.passive);
    if (typeof h.emblem?.motif !== 'string' || !Array.isArray(h.emblem?.palette)) errors.push(`${w}.emblem: motif·palette 없음`);
    checkVerseRef(errors, w, h.verseRef, refs);
  });
  if (checkIdList(errors, 'angels', angels, ANGEL_IDS)) angels.forEach((a) => {
    const w = `angels.${a.id}`;
    checkText(errors, `${w}.nameKo`, a.nameKo, 1, 20); checkText(errors, `${w}.nameEn`, a.nameEn, 1, 20);
    if (!Number.isInteger(a.cost) || !Number.isInteger(a.cooldownMs)) errors.push(`${w}: cost·cooldownMs 정수 아님`);
    checkAction(errors, w, a.action);
    if (typeof a.art?.motif !== 'string') errors.push(`${w}.art.motif 없음`);
    checkVerseRef(errors, w, a.verseRef, refs);
  });
  if (checkIdList(errors, 'spirits', spirits, SPIRIT_IDS)) {
    for (const s of spirits) if (!SPIRIT_IDS.includes(s.id)) errors.push(`spirits.${s.id}: KJV 밖 존재 금지 (C-010, CODE-005)`);
    if (spirits.filter((s) => s.grade === 'boss').length !== 1) errors.push('spirits: 보스(grade "boss")는 정확히 1종');
    spirits.forEach((s) => {
      const w = `spirits.${s.id}`;
      checkText(errors, `${w}.nameKo`, s.nameKo, 1, 30); checkText(errors, `${w}.nameKjv`, s.nameKjv, 1, 30);
      if (s.grade !== 'boss' && !(Number.isInteger(s.grade) && s.grade >= 1 && s.grade <= 5)) errors.push(`${w}.grade: 1~5 또는 "boss"`);
      if (!EFFECT_CATEGORIES.includes(s.category)) errors.push(`${w}.category: "${s.category}" 정의 밖 (CODE-007)`);
      if (!Array.isArray(s.effect?.kinds) || s.effect.kinds.length === 0 || !Number.isInteger(s.effect?.durationMs)) errors.push(`${w}.effect 형식 위반`);
      if (typeof s.art?.motif !== 'string') errors.push(`${w}.art.motif 없음`);
      checkVerseRef(errors, w, s.verseRef, refs);
    });
  }
  if (checkIdList(errors, 'armor', armor, ARMOR_IDS)) {
    if (armor.map((a) => a.cellCode).join(',') !== ARMOR_CELL_CODES.join(',')) errors.push('armor: cellCode가 d~i 순서가 아님 (CODE-009)');
    armor.forEach((a) => {
      checkText(errors, `armor.${a.id}.nameKo`, a.nameKo, 1, 20);
      checkAction(errors, `armor.${a.id}`, a.action);
      checkVerseRef(errors, `armor.${a.id}`, a.verseRef, refs);
    });
  }
  if (checkIdList(errors, 'achievements', achievements, ACHIEVEMENT_IDS)) achievements.forEach((a) => {
    checkText(errors, `achievements.${a.id}.nameKo`, a.nameKo, 1, 20);
    if (!a.condition || typeof a.condition !== 'object') errors.push(`achievements.${a.id}.condition 없음`);
    checkVerseRef(errors, `achievements.${a.id}`, a.verseRef, refs);
  });
}

function checkCounters(errors, { counters }) {
  if (!checkIdList(errors, 'counters', counters, SPIRIT_IDS, 'spiritId')) return;
  for (const row of counters) {
    const w = `counters.${row.spiritId}`;
    if (!Array.isArray(row.angels) || !Array.isArray(row.armor)) { errors.push(`${w}: angels·armor 배열 아님`); continue; }
    if (row.angels.length + row.armor.length < 1) errors.push(`${w}: 대응 수단 0개 (FR-038)`);
    for (const id of row.angels) if (!ANGEL_IDS.includes(id)) errors.push(`${w}: 천사 "${id}" 없음`);
    for (const id of row.armor) if (!ARMOR_IDS.includes(id)) errors.push(`${w}: 갑주 "${id}" 없음`);
  }
}

function checkQuiz(errors, { quiz }, refs) {
  if (!checkIdList(errors, 'quiz', quiz, null)) return;
  if (quiz.length < QUIZ_MIN_TOTAL) errors.push(`quiz: ${quiz.length}문항 (최소 ${QUIZ_MIN_TOTAL}, FR-043)`);
  const questions = new Set();
  quiz.forEach((q, i) => {
    const w = `quiz.${q?.id ?? i}`;
    if (typeof q?.id !== 'string' || !QUIZ_ID_PATTERN.test(q.id)) errors.push(`${w}: id 형식 위반 (^q\\d{3}$)`);
    if (!QUIZ_TYPES.includes(q?.type)) errors.push(`${w}: type "${q?.type}" 정의 밖`);
    if (!QUIZ_DIFFICULTIES.includes(q?.difficulty)) errors.push(`${w}: difficulty는 1·2·3`);
    if (checkText(errors, `${w}.question`, q?.question, 1, 160)) {
      if (questions.has(q.question)) errors.push(`${w}: 같은 문제 중복`);
      questions.add(q.question);
      if (q.type === 'fill_blank' && !q.question.includes('____')) errors.push(`${w}: fill_blank 문제에 빈칸 ____ 없음`);
    }
    if (!Array.isArray(q?.choices) || q.choices.length !== 4) errors.push(`${w}: choices는 정확히 4개`);
    else {
      q.choices.forEach((c, ci) => checkText(errors, `${w}.choices[${ci}]`, c, 1, 60));
      if (new Set(q.choices).size !== 4) errors.push(`${w}: choices 중복`);
    }
    if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer > 3) errors.push(`${w}: answer는 0~3 정수`);
    checkVerseRef(errors, w, q?.verseRef, refs);
    checkText(errors, `${w}.explanation`, q?.explanation, 1, 200);
  });
  for (const type of QUIZ_TYPES) {
    const n = quiz.filter((q) => q?.type === type).length;
    if (n < QUIZ_MIN_PER_GROUP) errors.push(`quiz: 유형 ${type} ${n}문항 (최소 ${QUIZ_MIN_PER_GROUP})`);
  }
  for (const d of QUIZ_DIFFICULTIES) {
    const n = quiz.filter((q) => q?.difficulty === d).length;
    if (n < QUIZ_MIN_PER_GROUP) errors.push(`quiz: 난이도 ${d} ${n}문항 (최소 ${QUIZ_MIN_PER_GROUP})`);
  }
}

/** 시간형 효과 ≤ maxTimedMs(봉인 예외), 확률 값 0~1 (data-ark §8.9 밸런스) */
function checkBalance(errors, { balance, spirits }) {
  const limit = balance?.interference?.maxTimedMs;
  const exempt = balance?.interference?.timedLimitExempt ?? [];
  if (!Number.isInteger(limit)) errors.push('balance.interference.maxTimedMs 없음');
  else if (Array.isArray(spirits)) for (const s of spirits) {
    if (!exempt.includes(s.id) && s.effect?.durationMs > limit) errors.push(`spirits.${s.id}: durationMs ${s.effect.durationMs} > ${limit}`);
  }
  const visit = (node, path) => {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      const p = `${path}.${key}`;
      if (typeof value === 'number' && PROBABILITY_KEY.test(key) && (value < 0 || value > 1)) errors.push(`${p}: 확률 ${value}가 0~1 밖`);
      else visit(value, p);
    }
  };
  visit(balance, 'balance');
  const jericho = balance?.specials?.jericho ?? {};
  for (const key of ['base', 'perCombo', 'max']) {
    if (typeof jericho[key] !== 'number' || jericho[key] < 0 || jericho[key] > 1) errors.push(`balance.specials.jericho.${key}: 확률 0~1 아님`);
  }
}

/** 이미 읽은 콘텐츠 객체 묶음을 검사한다 (테스트용 순수 함수). */
export function checkContentData(data) {
  const errors = [];
  for (const file of CONTENT_FILES) {
    if (data[file] === undefined) errors.push(`${file}.json: 없음`);
    else checkNoEmptyStrings(errors, file, data[file]);
  }
  if (errors.length > 0 && CONTENT_FILES.some((f) => data[f] === undefined)) return { ok: false, errors };
  const refs = checkVerses(errors, data.verses);
  checkCharacters(errors, data, refs);
  checkCounters(errors, data);
  checkQuiz(errors, data, refs);
  checkBalance(errors, data);
  return { ok: errors.length === 0, errors };
}

/** contentDir의 JSON 9종을 읽어 검사한다 (devguide §7.13 계약). */
export function checkContent(contentDir) {
  const data = {};
  const errors = [];
  for (const file of CONTENT_FILES) {
    try {
      data[file] = JSON.parse(readFileSync(join(contentDir, `${file}.json`), 'utf8'));
    } catch (err) {
      errors.push(`${file}.json: 읽기·파싱 실패 — ${err.message}`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return checkContentData(data);
}

const SELF = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  const contentDir = resolve(process.argv[2] ?? join(dirname(SELF), '..', 'content'));
  const { ok, errors } = checkContent(contentDir);
  if (ok) {
    console.log(`check:content ✅ 통과 — ${contentDir}`);
  } else {
    console.error(`check:content ❌ ${errors.length}건 실패`);
    for (const e of errors) console.error(` - ${e}`);
    process.exitCode = 1;
  }
}
