// engine-purity.test.js — 엔진 9파일 Node import·DOM 전역 미사용·같은 시드 같은 순서 확인 단위 테스트만 (D-12)
// TASK-010-4 | REQ-001 FR-001 FR-005 FR-075 | ARCH-002 ARCH-018 | D-12 (엔진은 DOM·Pixi·window·타이머·JSON import 금지)
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { rules, armor } from "../js/content.js";

const ENGINE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../js/engine");
// task-wall §3.2 #1~#9 — 엔진 파일 목록 그대로
const ENGINE_FILES = ["rng.js", "bag.js", "piece.js", "srs.js", "board.js", "scoring.js", "gravity.js", "specials.js",
  "index.js"];
// devguide §3.5-4 금지 식별자 (주석 줄 제외 후 검사)
const FORBIDDEN = [
  /\bwindow\b/, /\bdocument\b/, /\blocalStorage\b/, /\bsessionStorage\b/, /\bnavigator\b/, /\bsetTimeout\b/,
  /\bsetInterval\b/, /\brequestAnimationFrame\b/, /\bDate\.now\b/, /\bperformance\b/, /\bMath\.random\b/,
  /\bfetch\b/, /\bWebSocket\b/, /pixi/i, /from\s+["'][^"']*\.json["']/, /\brequire\(/,
];
const stripComments = (src) => src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

describe("engine purity (D-12)", () => {
  it("엔진 폴더 파일 = task-wall 9파일", () => {
    expect(readdirSync(ENGINE_DIR).sort()).toEqual([...ENGINE_FILES].sort());
  });

  it.each(ENGINE_FILES)("%s — Node에서 import 되고 금지 전역·JSON import가 없다", async (file) => {
    const mod = await import(/* @vite-ignore */ pathToFileURL(join(ENGINE_DIR, file)).href);
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    const src = stripComments(readFileSync(join(ENGINE_DIR, file), "utf8"));
    for (const re of FORBIDDEN) expect(re.test(src), `${file}: ${re}`).toBe(false);
    // 엔진 안의 import는 같은 폴더 상대 경로만
    for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) expect(m[1].startsWith("./")).toBe(true);
  });

  it("FR-001·FR-005 같은 시드 → 같은 블록 순서, 다른 시드 → 다른 순서", async () => {
    const { sequenceFor } = await import("../js/engine/index.js");
    expect(sequenceFor(2873310455, 70)).toEqual(sequenceFor(2873310455, 70));
    expect(sequenceFor(2873310455, 70)).not.toEqual(sequenceFor(2873310456, 70));
  });

  it("FR-001 7-bag — 7개마다 7종이 정확히 한 번씩", async () => {
    const { sequenceFor, PIECE_TYPES } = await import("../js/engine/index.js");
    const seq = sequenceFor(918273, 7 * 100);
    for (let i = 0; i < seq.length; i += 7) expect([...seq.slice(i, i + 7)].sort()).toEqual([...PIECE_TYPES].sort());
  });

  it("같은 시드 두 엔진 = 같은 입력에 같은 보드 (rules는 인자로 주입)", async () => {
    const { Engine } = await import("../js/engine/index.js");
    const make = () => new Engine({
      rules, seed: 77, stage: { word: true, jericho: true, manna: true }, versus: true,
      armorIds: armor.map((a) => a.id), previewCount: rules.board.preview,
    });
    const a = make();
    const b = make();
    a.start();
    b.start();
    const script = ["left", "rotateCW", "hardDrop", "right", "right", "hardDrop", "hold", "rotateCCW", "hardDrop"];
    for (const cmd of script) {
      a.input(cmd);
      b.input(cmd);
      a.tick(16);
      b.tick(16);
    }
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.snapshot().cells).toHaveLength(rules.board.width * rules.board.height);
  });
});
