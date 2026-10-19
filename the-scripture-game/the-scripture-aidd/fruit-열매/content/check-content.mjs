// check-content.mjs — 콘텐츠 무결성 검사(verse_ref 존재·3필드·quiz 분포·counters 14종·rules 키 일치)·실패 시 exit 1만
// TASK-009 | REQ-017 FR-038 FR-043 FR-074 FR-076 C-003 C-010 | TBL-011~TBL-018 | data-ark §6.2 콘텐츠 무결성 | ARCH-016
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// CODE-003·006·007·010·011·012 (data-ark §4)
const HERO_IDS = ["david", "solomon", "peter", "paul"];
const ANGEL_IDS = ["michael", "gabriel", "cherubim", "seraphim", "ministering_spirits"];
const SPIRIT_IDS = [
  "unclean_spirit", "deaf_dumb_spirit", "legion", "lying_spirit", "divination_spirit", "beelzebub", "prince_of_the_air",
  "prince_of_persia", "abaddon", "jezebel", "wickedness", "babylon", "satan_angel_of_light", "dragon",
];
const ARMOR_IDS = [
  "belt_of_truth", "breastplate_of_righteousness", "gospel_shoes", "shield_of_faith", "helmet_of_salvation",
  "sword_of_the_spirit",
];
const CATEGORIES = ["vision", "sense", "deception", "control", "speed", "seal", "board"];
const ARMOR_ACTIONS = ["nullify", "reduce_next", "block_next", "reflect"];
const QUIZ_TYPES = ["person", "event", "verse_blank"];
// FR-043 / TBL-017 분량 규칙
const QUIZ_MIN = 60;
const QUIZ_MIN_PER_GROUP = 15;
// task-wall §2.1 필수 31구절 (TBL-016 "필수 수록")
const REQUIRED_VERSES = [
  "1 Samuel 17:49", "1 Kings 3:9", "Matthew 16:18", "Acts 16:26", "Jude 1:9", "Luke 1:19", "Genesis 3:24", "Isaiah 6:6",
  "Hebrews 1:14", "Mark 1:23", "Mark 9:25", "Mark 5:9", "1 Kings 22:22", "Acts 16:16", "Matthew 12:24", "Ephesians 2:2",
  "Daniel 10:13", "Revelation 9:11", "Revelation 2:20", "Zechariah 5:8", "Revelation 17:5", "2 Corinthians 11:14",
  "Revelation 12:9", "Ephesians 6:14", "Ephesians 6:15", "Ephesians 6:16", "Ephesians 6:17", "John 16:33", "John 1:5",
  "2 Timothy 4:7", "Ephesians 6:12",
];
// TBL-018 표의 모든 키 경로
const RULE_KEYS = [
  "board.width", "board.height", "board.dangerRows", "board.preview", "board.previewSolomon", "board.previewGabriel",
  "net.stateHz", "net.joinTimeoutMs", "net.readyTimeoutMs",
  "engine.lockDelayMs", "engine.dasMs", "engine.arrMs", "engine.softDropMultiplier",
  "gravity.startMs", "gravity.at120sMs", "gravity.accelAfterMs", "gravity.accelEveryMs", "gravity.accelFactor",
  "gravity.minMs",
  "scoring.lines", "scoring.tspin", "scoring.b2bMultiplier", "scoring.comboPer", "scoring.softDropPerCell",
  "scoring.hardDropPerCell",
  "attack.lines", "attack.tspinBonus", "attack.comboBonus", "attack.b2bBonus", "attack.jerichoBonus",
  "spiritTier.byLines", "spiritTier.tetrisPool", "spiritTier.tierUpTspin", "spiritTier.tierUpComboFrom",
  "spiritTier.b2bTetrisTiers", "spiritTier.bossConsecutiveB2BTetris",
  "gauge.max", "gauge.perLine", "gauge.tetrisBonus", "gauge.tspinBonus", "gauge.quizReward", "gauge.manna",
  "heroSkills.sling_stone", "heroSkills.understanding_heart", "heroSkills.upon_this_rock",
  "heroSkills.prison_doors_opened",
  "angels.michael", "angels.gabriel", "angels.cherubim", "angels.seraphim", "angels.ministering_spirits",
  "armor.spawnChancePerPiece", "armor.breastplateReduce",
  "specials.wordIntervalMin", "specials.wordIntervalMax", "specials.jericho", "specials.manna", "specials.unlockRounds",
  "specials.priority",
  "effects.maxDurationMs", "effects.maxConcurrent", "effects.reapplyCooldownMs", "effects.sealMs", "garbage.delayMs",
  "quiz.timeLimitMs", "quiz.wrongLockMs", "quiz.autoIntervalMs", "quiz.resumeDelayMs", "quiz.gaugeRewardChance",
  "match.roundsToWin", "match.countdownMs", "match.nextRoundDelayMs",
  "grace.lossStreakRounds", "grace.garbageReduce", "grace.gaugeMultiplier", "jesus.perMatch",
  "jesus.garbageRemoveRatio",
  "elo.base", "elo.k", "invite.length", "invite.alphabet", "invite.ttlMs", "nickname.min", "nickname.max",
  "nickname.pattern",
  "bot.easy", "bot.normal", "bot.hard",
  // 착지 평가 가중치 — 솔로몬·가브리엘 힌트·봇 공용 (data-ark TBL-018 추가 2026-10-19 — RTM §5 DCL-004)
  "placement.weights.aggregateHeight", "placement.weights.lines", "placement.weights.holes",
  "placement.weights.bumpiness",
  // rateLimit 하위 키 전부 (data-ark TBL-018 재각 2026-10-19 — RTM §5 DCL-002)
  "rateLimit.state", "rateLimit.clear", "rateLimit.skill", "rateLimit.armor", "rateLimit.answer", "rateLimit.reaction",
  "rateLimit.total", "rateLimit.maxMessageBytes", "rateLimit.totalViolationMs", "rateLimit.guestCreate",
  "rateLimit.maxRestBodyBytes",
  "progressCheck.maxPiecesPerSecond", "reactions",
  // 원장 서비스 수치 + 가속 시작 시점 (data-ark TBL-018 추가 2026-10-19 — RTM §5 DCL-003)
  "ledger.tokenCacheSize", "ledger.leaderboardCacheMs", "ledger.leaderboardTop", "ledger.historyPageDefault",
  "ledger.historyPageMax",
  "achievements.goliath_hunter", "verseCard", "victoryVerse",
];
// C-010: KJV 본문에 근거 없는 존재 (req.md §3.4 주석)
const FORBIDDEN_NAMES = [/lilith/i, /릴리스/, /리릴/];

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const getPath = (obj, path) => path.split(".").reduce((o, k) =>
  (o !== null && typeof o === "object" ? o[k] : undefined), obj);
const sameSet = (a, b) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/** content 폴더를 읽어 위반 목록을 돌려준다 (빈 배열 = 통과). */
export function checkContent(dir) {
  const errors = [];
  const load = (name) => {
    try {
      return JSON.parse(readFileSync(join(dir, name), "utf8"));
    } catch (err) {
      errors.push(`${name}: 읽기/파싱 실패 — ${err.message}`);
      return null;
    }
  };
  const c = {
    heroes: load("heroes.json"), angels: load("angels.json"), spirits: load("spirits.json"), armor: load("armor.json"),
    counters: load("counters.json"), verses: load("verses.json"), quiz: load("quiz.json"), rules: load("rules.json"),
  };
  if (errors.length > 0) return errors;
  for (const k of ["heroes", "angels", "spirits", "armor", "counters", "verses", "quiz"]) {
    if (!Array.isArray(c[k])) errors.push(`${k}.json: 최상위가 배열이 아님 (data-ark §1)`);
  }
  if (c.rules === null || Array.isArray(c.rules) || typeof c.rules !== "object") errors.push("rules.json: 최상위가 객체가 아님");
  if (errors.length > 0) return errors;

  // TBL-016 verses — ref·kjv·ko·ref_ko 비어 있지 않음, ref 유일·형식
  const refs = new Set();
  for (const v of c.verses) {
    for (const f of ["ref", "kjv", "ko", "ref_ko"]) if (!nonEmpty(v[f]))
      errors.push(`verses: ${v.ref ?? "?"} ${f} 비어 있음`);
    if (!/^[1-3]? ?[A-Z][a-z]+(?: [a-z]+)* \d+:\d+(?:-\d+)?$/.test(v.ref ?? ""))
      errors.push(`verses: ref 형식 오류 "${v.ref}"`);
    if (refs.has(v.ref)) errors.push(`verses: ref 중복 "${v.ref}"`);
    refs.add(v.ref);
  }
  for (const r of REQUIRED_VERSES) if (!refs.has(r)) errors.push(`verses: 필수 구절 누락 "${r}"`);
  const needRef = (where, ref) => {
    if (!nonEmpty(ref)) errors.push(`${where}: verse_ref 없음 (C-010 모든 캐릭터에 KJV 근거)`);
    else if (!refs.has(ref)) errors.push(`${where}: verse_ref "${ref}"가 verses.json에 없음`);
  };

  // TBL-011~TBL-014 캐릭터 — id 집합·필수 필드·근거 구절
  const checkIds = (name, list, ids) => {
    const got = list.map((x) => x.id);
    if (!sameSet(got, ids)) errors.push(`${name}: id 집합 불일치 — 기대 ${ids.join(",")} / 실제 ${got.join(",")}`);
  };
  checkIds("heroes", c.heroes, HERO_IDS);
  for (const h of c.heroes) {
    for (const f of ["name_ko", "name_en", "skill_id", "skill_name_ko", "skill_effect_ko", "emblem"]) {
      if (!nonEmpty(h[f])) errors.push(`heroes.${h.id}: ${f} 비어 있음`);
    }
    if (!(h.passive_ko === null || nonEmpty(h.passive_ko))) errors.push(`heroes.${h.id}: passive_ko는 문자열 또는 null`);
    needRef(`heroes.${h.id}`, h.verse_ref);
  }
  checkIds("angels", c.angels, ANGEL_IDS);
  for (const a of c.angels) {
    for (const f of ["name_ko", "name_en", "effect_ko", "visual"]) if (!nonEmpty(a[f]))
      errors.push(`angels.${a.id}: ${f} 비어 있음`);
    needRef(`angels.${a.id}`, a.verse_ref);
  }
  checkIds("spirits", c.spirits, SPIRIT_IDS);
  const effects = c.rules.effects ?? {};
  for (const s of c.spirits) {
    for (const f of ["name_ko", "name_en", "effect"]) if (!nonEmpty(s[f])) errors.push(`spirits.${s.id}: ${f} 비어 있음`);
    if (!Number.isInteger(s.tier) || s.tier < 1 || s.tier > 6) errors.push(`spirits.${s.id}: tier 1~6 아님`);
    if (!CATEGORIES.includes(s.category)) errors.push(`spirits.${s.id}: category "${s.category}" 미정의 (CODE-007)`);
    if (s.params === null || typeof s.params !== "object" || Array.isArray(s.params))
      errors.push(`spirits.${s.id}: params 객체 아님`);
    // FR-031 시간형 ≤ effects.maxDurationMs, 봉인 = effects.sealMs, 보드 상태형 = 0 (spec-tablet §9.7 K4)
    const limit = s.category === "seal" ? effects.sealMs : s.category === "board" ? 0 : effects.maxDurationMs;
    if (!Number.isInteger(s.duration_ms) || s.duration_ms < 0 || s.duration_ms > limit) {
      errors.push(`spirits.${s.id}: duration_ms ${s.duration_ms} 상한(${limit}) 위반 (FR-031)`);
    }
    needRef(`spirits.${s.id}`, s.verse_ref);
  }
  checkIds("armor", c.armor, ARMOR_IDS);
  for (const a of c.armor) {
    for (const f of ["name_ko", "name_en", "effect_ko"]) if (!nonEmpty(a[f])) errors.push(`armor.${a.id}: ${f} 비어 있음`);
    if (!ARMOR_ACTIONS.includes(a.action)) errors.push(`armor.${a.id}: action "${a.action}" 미정의`);
    const okNullifies = a.action === "nullify"
      ? Array.isArray(a.nullifies) && a.nullifies.length > 0 && a.nullifies.every((x) => CATEGORIES.includes(x))
      : a.nullifies === null;
    if (!okNullifies) errors.push(`armor.${a.id}: nullifies는 nullify일 때만 분류 목록, 아니면 null`);
    needRef(`armor.${a.id}`, a.verse_ref);
  }

  // TBL-015 counters — 14종 전부, 각 1개 이상, 참조 존재 (FR-038)
  const counterSpirits = c.counters.map((r) => r.spirit_id);
  if (!sameSet(counterSpirits, SPIRIT_IDS)) errors.push("counters: 악한 영 14종을 정확히 한 번씩 덮지 않음 (FR-038)");
  for (const row of c.counters) {
    if (!Array.isArray(row.counters) || row.counters.length === 0) errors.push(`counters.${row.spirit_id}: 대응 수단 0개`);
    for (const k of row.counters ?? []) {
      const pool = k.kind === "angel" ? ANGEL_IDS : k.kind === "armor" ? ARMOR_IDS : null;
      if (pool === null || !pool.includes(k.id)) errors.push(`counters.${row.spirit_id}: 잘못된 대응 ${k.kind}:${k.id}`);
    }
  }

  // TBL-017 quiz — ≥60, 유형·난이도별 ≥15, 보기 4개 중복 없음, answer 0~3, verse_ref 존재
  if (c.quiz.length < QUIZ_MIN) errors.push(`quiz: ${c.quiz.length}문항 < ${QUIZ_MIN} (FR-043)`);
  const ids = new Set();
  const byType = Object.fromEntries(QUIZ_TYPES.map((t) => [t, 0]));
  const byDiff = { 1: 0, 2: 0, 3: 0 };
  for (const q of c.quiz) {
    if (!/^Q\d{3}$/.test(q.id ?? "") || ids.has(q.id)) errors.push(`quiz: id 형식·중복 오류 "${q.id}"`);
    ids.add(q.id);
    if (QUIZ_TYPES.includes(q.type)) byType[q.type] += 1;
    else errors.push(`quiz.${q.id}: type "${q.type}" 미정의 (CODE-012)`);
    if ([1, 2, 3].includes(q.difficulty)) byDiff[q.difficulty] += 1;
    else errors.push(`quiz.${q.id}: difficulty 1~3 아님`);
    if (!nonEmpty(q.question_ko)) errors.push(`quiz.${q.id}: question_ko 비어 있음`);
    if (q.type === "verse_blank" && !String(q.question_ko).includes("_____")) errors.push(`quiz.${q.id}: 빈칸 표기 없음`);
    const choices = Array.isArray(q.choices) ? q.choices : [];
    if (choices.length !== 4 || !choices.every(nonEmpty) || new Set(choices).size !== 4)
      errors.push(`quiz.${q.id}: 보기 4개·중복 없음 위반`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`quiz.${q.id}: answer 0~3 아님`);
    needRef(`quiz.${q.id}`, q.verse_ref);
  }
  for (const [t, n] of Object.entries(byType)) if (n < QUIZ_MIN_PER_GROUP)
    errors.push(`quiz: 유형 ${t} ${n}문항 < ${QUIZ_MIN_PER_GROUP}`);
  for (const [d, n] of Object.entries(byDiff)) if (n < QUIZ_MIN_PER_GROUP)
    errors.push(`quiz: 난이도 ${d} ${n}문항 < ${QUIZ_MIN_PER_GROUP}`);

  // TBL-018 rules — 모든 키 존재, heroes/angels id와 rules 키 일치, 콘텐츠 참조 존재
  for (const key of RULE_KEYS) if (getPath(c.rules, key) === undefined) errors.push(`rules: 키 누락 "${key}"`);
  if (!sameSet(Object.keys(c.rules.heroSkills ?? {}), c.heroes.map((h) => h.skill_id)))
    errors.push("rules.heroSkills 키 ≠ heroes.skill_id");
  if (!sameSet(Object.keys(c.rules.angels ?? {}), c.angels.map((a) => a.id))) errors.push("rules.angels 키 ≠ angels id");
  for (const id of c.rules.spiritTier?.tetrisPool ?? []) if (!SPIRIT_IDS.includes(id))
    errors.push(`rules.spiritTier.tetrisPool: "${id}" 미정의`);
  for (const id of c.rules.angels?.michael?.families ?? []) if (!SPIRIT_IDS.includes(id))
    errors.push(`rules.angels.michael.families: "${id}" 미정의`);
  if (!HERO_IDS.includes(c.rules.achievements?.goliath_hunter?.heroId))
    errors.push("rules.achievements.goliath_hunter.heroId 미정의");
  needRef("rules.victoryVerse", c.rules.victoryVerse);
  needRef("rules.verseCard.jesusEventRef", c.rules.verseCard?.jesusEventRef);

  // C-010 근거 없는 존재 금지
  const all = JSON.stringify(c);
  for (const re of FORBIDDEN_NAMES) if (re.test(all)) errors.push(`C-010: KJV 근거 없는 이름 ${re} 발견`);
  return errors;
}

// 직접 실행(npm run check:content)일 때만 출력·종료 코드
const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === self) {
  try {
    const errors = checkContent(dirname(self));
    if (errors.length > 0) {
      console.error(`[check-content] ❌ ${errors.length}건 위반`);
      for (const e of errors) console.error(`  - ${e}`);
      process.exit(1);
    }
    console.log(
      "[check-content] ✅ 통과 — heroes 4 · angels 5 · spirits 14 · armor 6 · counters 14 · verses·quiz·rules 무결성");
  } catch (err) {
    console.error("[check-content] 검사 중 오류:", err && err.message ? err.message : err);
    process.exit(1);
  }
}
