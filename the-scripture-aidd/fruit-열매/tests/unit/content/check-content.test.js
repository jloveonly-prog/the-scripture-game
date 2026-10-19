// TASK-070 · REQ-011 · REQ-017 · FR-043 · FR-074 · FR-076 · C-003 · C-010 — 콘텐츠 검사 스크립트와 말씀 콘텐츠 자체를 검사한다.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CONTENT_FILES, QUIZ_DIFFICULTIES, QUIZ_TYPES, REQUIRED_REFS, checkContent, checkContentData,
} from '../../../scripts/check-content.mjs';

const CONTENT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../content');
const load = () => Object.fromEntries(
  CONTENT_FILES.map((f) => [f, JSON.parse(readFileSync(join(CONTENT_DIR, `${f}.json`), 'utf8'))]),
);
/** 원본을 복제해 변형한 뒤 검사 결과의 오류 문자열 전체를 돌려준다 */
const errorsAfter = (mutate) => {
  const data = load();
  mutate(data);
  const result = checkContentData(data);
  expect(result.ok).toBe(false);
  return result.errors.join('\n');
};

describe('실제 content/ 디렉터리 (FR-076)', () => {
  it('checkContent가 오류 없이 통과한다', () => {
    expect(checkContent(CONTENT_DIR)).toEqual({ ok: true, errors: [] });
  });

  it('필수 구절 30개가 모두 있고 ref가 유일하다 (devguide §7.2)', () => {
    const refs = load().verses.map((v) => v.ref);
    expect(REQUIRED_REFS).toHaveLength(30);
    for (const ref of REQUIRED_REFS) expect(refs).toContain(ref);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('퀴즈 ≥ 60문항, 유형×난이도 9칸마다 5문항 이상, 정답 위치가 0~3에 고르게 분포한다', () => {
    const { quiz } = load();
    expect(quiz.length).toBeGreaterThanOrEqual(60);
    for (const type of QUIZ_TYPES) for (const d of QUIZ_DIFFICULTIES) {
      expect(quiz.filter((q) => q.type === type && q.difficulty === d).length).toBeGreaterThanOrEqual(5);
    }
    for (const pos of [0, 1, 2, 3]) expect(quiz.filter((q) => q.answer === pos).length).toBeGreaterThanOrEqual(10);
  });

  it('fill_blank 정답을 빈칸에 넣으면 해설 구절의 KJV 원문 그대로가 된다', () => {
    const { quiz, verses } = load();
    const byRef = new Map(verses.map((v) => [v.ref, v.kjv]));
    for (const q of quiz.filter((x) => x.type === 'fill_blank')) {
      const quoted = q.question.match(/"(.+)"/)?.[1];
      expect(quoted, q.id).toBeTruthy();
      expect(byRef.get(q.verseRef), q.id).toContain(quoted.replace('____', q.choices[q.answer]));
    }
  });
});

describe('검사 규칙이 위반을 잡아낸다 (data-ark §8.9)', () => {
  it('없는 verseRef (KJV 출처)', () => {
    expect(errorsAfter((d) => { d.heroes[0].verseRef = 'Genesis 99:1'; })).toMatch(/heroes\.david: verseRef/);
    expect(errorsAfter((d) => { d.quiz[0].verseRef = 'Genesis 99:1'; })).toMatch(/quiz\.q001: verseRef/);
  });

  it('필수 구절 누락·ref 중복·형식 위반', () => {
    expect(errorsAfter((d) => { d.verses = d.verses.filter((v) => v.ref !== 'John 1:5'); })).toMatch(/필수 구절 "John 1:5"/);
    expect(errorsAfter((d) => { d.verses.push({ ...d.verses[0] }); })).toMatch(/ref 중복/);
    expect(errorsAfter((d) => { d.verses[0].ref = '1Samuel 17:49'; })).toMatch(/ref 형식 위반/);
  });

  it('빈 문자열·퀴즈 수 부족·정답 범위·선택지 중복·빈칸 누락', () => {
    expect(errorsAfter((d) => { d.verses[0].ko = ''; })).toMatch(/빈 문자열/);
    expect(errorsAfter((d) => { d.quiz = d.quiz.slice(0, 59); })).toMatch(/59문항/);
    expect(errorsAfter((d) => { d.quiz[0].answer = 4; })).toMatch(/answer는 0~3/);
    expect(errorsAfter((d) => { d.quiz[0].choices[1] = d.quiz[0].choices[0]; })).toMatch(/choices 중복/);
    expect(errorsAfter((d) => { d.quiz[48].question = '빈칸 없음'; })).toMatch(/빈칸 ____ 없음/);
  });

  it('퀴즈 ID 중복·유형별 15문항 미만', () => {
    expect(errorsAfter((d) => { d.quiz[1].id = 'q001'; })).toMatch(/id 중복/);
    expect(errorsAfter((d) => { d.quiz.forEach((q) => { if (q.type === 'event') q.type = 'person'; }); })).toMatch(/유형 event 0문항/);
  });

  it('KJV 밖 존재(lilith)·상성표 대응 0개·수량 위반', () => {
    expect(errorsAfter((d) => { d.spirits[0].id = 'lilith'; })).toMatch(/KJV 밖 존재 금지/);
    expect(errorsAfter((d) => { d.counters[0].armor = []; })).toMatch(/대응 수단 0개/);
    expect(errorsAfter((d) => { d.angels.pop(); })).toMatch(/angels: id 목록이 정본과 다름/);
  });

  it('시간형 효과 6000ms 초과·확률 범위 밖', () => {
    expect(errorsAfter((d) => { d.spirits[0].effect.durationMs = 7000; })).toMatch(/unclean_spirit: durationMs 7000/);
    expect(errorsAfter((d) => { d.balance.specials.armor.chance = 1.5; })).toMatch(/확률 1\.5/);
  });

  it('파일이 없으면 읽기 실패로 보고한다', () => {
    const result = checkContent(join(CONTENT_DIR, '__missing__'));
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/읽기·파싱 실패/);
  });
});
