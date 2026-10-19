// specials.test.ts — 같은 입력 → 같은 배정, 위조 specials 거부 단위 테스트만 (D-09)
// TASK-016 | REQ-009 REQ-012 FR-032 FR-036 FR-044~FR-047 FR-075 | ARCH-002 ARCH-011 ARCH-018 | D-09 | architecture §9.3
import { describe, expect, it } from "vitest";
import * as engineSpecials from "../../client/js/engine/specials.js";
import { rules } from "../src/content";
import { ARMOR_IDS, verifySpecials, type ClaimedSpecial } from "../src/room/specials";

const SEED = 2873310455;
const ALL = { word: true, jericho: true, manna: true };
const NONE = { word: false, jericho: false, manna: false };
const s = rules.specials;

/** 조각 1..n에서 조건을 만족하는 첫 조각 번호 */
function find(n: number, pred: (i: number) => boolean): number {
  for (let i = 1; i <= n; i += 1) if (pred(i)) return i;
  throw new Error("no piece found");
}
const rolls = (i: number) => engineSpecials.rollsFor(SEED, i);
const isWord = (i: number) => engineSpecials.isWordPiece(SEED, i, s);
const assign = (pieceIndex: number, combo = -1, crisis = false, stage = ALL, versus = true) =>
  engineSpecials.assignSpecial({ seed: SEED, pieceIndex, stage, versus, combo, crisis, specials: s, armor: rules.armor,
    armorIds: ARMOR_IDS });
const verify = (claims: ClaimedSpecial[], pieceCount = 500, stage = ALL, versus = true, before = new Set<number>()) =>
  verifySpecials(claims, SEED, stage, versus, pieceCount, before, rules);

describe("engine/specials.js 결정론 (D-09)", () => {
  it("같은 (시드, 조각, 단계, 콤보, 위기) → 같은 배정", () => {
    for (let i = 1; i <= 300; i += 1) expect(assign(i, 2, true)).toEqual(assign(i, 2, true));
  });

  it("FR-044 말씀 블록 간격 = wordIntervalMin~Max", () => {
    const words: number[] = [];
    for (let i = 1; i <= 400; i += 1) if (isWord(i)) words.push(i);
    expect(words[0]).toBeGreaterThanOrEqual(s.wordIntervalMin);
    expect(words[0]).toBeLessThanOrEqual(s.wordIntervalMax);
    for (let k = 1; k < words.length; k += 1) {
      expect(words[k] - words[k - 1]).toBeGreaterThanOrEqual(s.wordIntervalMin);
      expect(words[k] - words[k - 1]).toBeLessThanOrEqual(s.wordIntervalMax);
    }
  });

  it("FR-047 해금 전(1~3판)·연습에는 말씀·갑주가 없다", () => {
    for (let i = 1; i <= 300; i += 1) {
      expect(assign(i, 5, true, NONE)?.kind === "word").toBe(false);
      expect(assign(i, 5, true, NONE, true)?.kind ?? "armor").toBe("armor");
      const practice = assign(i, 5, true, ALL, false);
      expect(practice?.kind === "word" || practice?.kind === "armor").toBe(false);
    }
  });

  it("FR-045 콤보가 높을수록 여리고 확률 상승 (상한 max)", () => {
    expect(engineSpecials.jerichoChance(-1, s)).toBe(s.jericho.base);
    expect(engineSpecials.jerichoChance(1, s)).toBeCloseTo(s.jericho.base + s.jericho.perCombo);
    expect(engineSpecials.jerichoChance(99, s)).toBe(s.jericho.max);
    expect(engineSpecials.mannaChance(true, s)).toBe(Math.min(s.manna.max, s.manna.crisis));
  });
});

describe("room/specials.ts 재계산 검증 (FR-032, D-09)", () => {
  const word = find(200, isWord);
  const notWord = find(200, (i) => !isWord(i));

  it("정상 말씀 칸은 인정, 말씀이 아닌 조각의 말씀 주장은 거부", () => {
    expect(verify([{ kind: "word", pieceIndex: word }])).toMatchObject({ ok: true, word: true });
    expect(verify([{ kind: "word", pieceIndex: notWord }])).toEqual({ ok: false, reason: "word" });
  });

  it("말씀 해금 전·연습에서 말씀 주장 거부", () => {
    expect(verify([{ kind: "word", pieceIndex: word }], 500, NONE).ok).toBe(false);
    expect(verify([{ kind: "word", pieceIndex: word }], 500, ALL, false).ok).toBe(false);
  });

  it("갑주: 굴림·갑주 id 정확 일치만 인정", () => {
    const armorPiece = find(2000, (i) => !isWord(i) && rolls(i).armor < rules.armor.spawnChancePerPiece);
    const armorId = engineSpecials.armorIdFor(SEED, armorPiece, ARMOR_IDS);
    expect(verify([{ kind: "armor", pieceIndex: armorPiece, armorId }], 5000)).toMatchObject({ ok: true,
      armors: [armorId] });
    const wrongId = ARMOR_IDS.find((id) => id !== armorId);
    expect(verify([{ kind: "armor", pieceIndex: armorPiece, armorId: wrongId }], 5000).ok).toBe(false);
    const noArmor = find(2000, (i) => !isWord(i) && rolls(i).armor >= rules.armor.spawnChancePerPiece);
    expect(verify([{ kind: "armor", pieceIndex: noArmor, armorId: engineSpecials.armorIdFor(SEED, noArmor,
      ARMOR_IDS) }], 5000).ok).toBe(false);
    expect(verify([{ kind: "armor", pieceIndex: armorPiece, armorId }], 5000, ALL, false).ok).toBe(false);
  });

  it("여리고·만나: 굴림값이 최대 확률 미만일 때만 (콤보·위기는 상한 검증)", () => {
    const jericho = find(2000, (i) => !isWord(i) && rolls(i).jericho < s.jericho.max);
    const noJericho = find(2000, (i) => !isWord(i) && rolls(i).jericho >= s.jericho.max);
    expect(verify([{ kind: "jericho", pieceIndex: jericho }], 5000)).toMatchObject({ ok: true, jericho: 1 });
    expect(verify([{ kind: "jericho", pieceIndex: noJericho }], 5000).ok).toBe(false);
    expect(verify([{ kind: "jericho", pieceIndex: jericho }], 5000, { word: true, jericho: false,
      manna: false }).ok).toBe(false);
    const manna = find(2000, (i) => !isWord(i) && rolls(i).manna < s.manna.max);
    const noManna = find(2000, (i) => !isWord(i) && rolls(i).manna >= s.manna.max);
    expect(verify([{ kind: "manna", pieceIndex: manna }], 5000)).toMatchObject({ ok: true, manna: 1 });
    expect(verify([{ kind: "manna", pieceIndex: noManna }], 5000).ok).toBe(false);
  });

  it("엔진이 실제로 배정한 칸은 서버 검증을 통과한다 (콤보·위기 최대 조건 포함)", () => {
    for (let i = 1; i <= 1500; i += 1) {
      const a = assign(i, 10, true);
      if (!a) continue;
      const claim: ClaimedSpecial = { kind: a.kind, pieceIndex: i, ...(a.armorId ? { armorId: a.armorId } : {}) };
      expect(verify([claim], 5000).ok, `piece ${i} ${a.kind}`).toBe(true);
    }
  });

  it("위조 형식 거부: 조각 번호 범위·중복·재사용·개수 초과·없는 종류", () => {
    expect(verify([{ kind: "word", pieceIndex: word }], word - 2).ok).toBe(false);
    expect(verify([{ kind: "word", pieceIndex: word }, { kind: "word", pieceIndex: word }]).ok).toBe(false);
    expect(verify([{ kind: "word", pieceIndex: word }], 500, ALL, true, new Set([word])).ok).toBe(false);
    expect(verify(Array.from({ length: 5 }, () => ({ kind: "word", pieceIndex: word }))).ok).toBe(false);
    expect(verify([{ kind: "gold", pieceIndex: word }]).ok).toBe(false);
    expect(verify([{ kind: "word", pieceIndex: 0 }]).ok).toBe(false);
  });
});
