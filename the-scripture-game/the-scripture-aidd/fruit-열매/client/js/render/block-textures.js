// block-textures.js — 블록·특수 칸 텍스처 굽기만
// TASK-041 | REQ-001 REQ-013 FR-001 FR-025 FR-029 FR-044~FR-046 FR-036 FR-048 NFR-001 | ARCH-004 | CODE-009 |
// design-vision §2.2·§2.3·§2.5 GLW-idle·§2.11·§4.9
// 시작 시 1회: 칸 30·32·22·12px × (블록 7 + 쓰레기 + 납) = 36장 + 특수 칸 덮개 4종 × 4크기 = 16장. 블록마다 실시간 필터 0개.
import { BlurFilter, Color, Container, FillGradient, Graphics, Rectangle } from "pixi.js";

/** §2.7 칸 크기 — 내 보드 30(가로형)·32(세로형), 상대 보드 22(가로형)·12(세로형) */
export const BLOCK_SIZES = Object.freeze([30, 32, 22, 12]);
/** §2.3 특수 칸 덮개 (rules.specials.priority 종류) */
export const SPECIAL_KINDS = Object.freeze(["word", "jericho", "manna", "armor"]);

/** §2.2 성막 재료 7색 (CODE-009 1~7) — base 바탕 · light 밝은 면 · dark 어두운 면 */
export const BLOCK_COLORS = Object.freeze({
  1: { base: 0x3d7bff, light: 0x8fb0ff, dark: 0x1e4ab3 }, // I 청색 Exodus 26:1
  2: { base: 0xf2c14e, light: 0xffe29a, dark: 0xa9801f }, // O 금 Exodus 26:29
  3: { base: 0x9b4dff, light: 0xc79bff, dark: 0x5e2a9e }, // T 자색 Exodus 26:1
  4: { base: 0xa9b4c4, light: 0xe3e8ef, dark: 0x6b7484 }, // S 은 Exodus 26:19
  5: { base: 0xe8304a, light: 0xff7a8a, dark: 0x8f1526 }, // Z 홍색 Exodus 26:1
  6: { base: 0xefe6d0, light: 0xffffff, dark: 0xb3a787 }, // J 세마포 Exodus 26:1
  7: { base: 0xd2873a, light: 0xf2b26e, dark: 0x8a5420 }, // L 놋 Exodus 26:37
  8: { base: 0x6a6480, light: 0x8a83a0, dark: 0x4e4862 }, // 쓰레기 §2.3
  9: { base: 0x9a9aa2, light: 0x9a9aa2, dark: 0x5c5c63 }, // 납 §2.3 (리벳 #5C5C63)
});

/** §2.3 특수 칸 발광색 (GLW-special color) — board-view가 GlowFilter에 쓴다 */
export const SPECIAL_GLOW = Object.freeze({ word: 0xf6d98b, jericho: 0xf2b26e, manna: 0xfff8e7, armor: 0xdce8ff });

/** 바깥 번짐 여유 — §2.11 ① 칸보다 6px 큰 사각형 + 블러 4 */
const PAD = 8;

/** @param {number} hex @param {number} a */
const rgba = (hex, a) => new Color(hex).setAlpha(a).toHexa();

/** §2.2 각인 문양 (어두운 면 색, 투명도 0.18) @param {Graphics} g @param {number} code @param {number} s 칸 */
function engrave(g, code, s, dark) {
  const w = Math.max(1, s / 15);
  const st = { width: w, color: dark, alpha: 0.18 };
  const c = s / 2;
  switch (code) {
    case 1: for (const y of [0.32, 0.5, 0.68]) g.moveTo(s * 0.2, s * y).lineTo(s * 0.8, s * y); g.stroke(st); break;
    case 2: g.poly([c, s * 0.22, s * 0.78, c, c, s * 0.78, s * 0.22, c]).stroke(st); break;
    case 3: g.moveTo(s * 0.24, s * 0.66).lineTo(c, s * 0.34).lineTo(s * 0.76, s * 0.66).stroke(st); break;
    case 4: g.moveTo(s * 0.22, s * 0.56).lineTo(s * 0.56, s * 0.22).moveTo(s * 0.44, s * 0.78).lineTo(s * 0.78,
      s * 0.44);
      g.stroke(st); break;
    case 5: g.moveTo(s * 0.2, s * 0.6).lineTo(s * 0.4, s * 0.4).lineTo(s * 0.6, s * 0.6).lineTo(s * 0.8,
      s * 0.4).stroke(st);
      break;
    case 6: for (const [x, y] of [[0.26, 0.26], [0.52, 0.26], [0.26, 0.52], [0.52, 0.52]]) g.rect(s * x, s * y,
      s * 0.22, s * 0.22);
      g.stroke(st); break;
    case 7: g.circle(c, c, s * 0.18).stroke(st); break;
    default: break;
  }
}

/** §2.11 ①~⑥ 유리 질감 블록 1칸 @param {number} code @param {number} s */
function drawBlock(code, s) {
  const col = BLOCK_COLORS[code];
  const root = new Container();
  const glass = code <= 7;
  if (glass) {
    // ① GLW-idle 바깥 번짐: 칸보다 6px 큰 사각형, 바탕색, 블러 4, 투명도 0.35
    const halo = new Graphics().roundRect(PAD - 3, PAD - 3, s + 6, s + 6, 4).fill({ color: col.base, alpha: 0.35 });
    halo.filters = [new BlurFilter({ strength: 4, quality: 3 })];
    root.addChild(halo);
  }
  const g = new Graphics();
  g.position.set(PAD, PAD);
  root.addChild(g);
  // ② 몸체: 칸 − 2px, 반경 3
  g.roundRect(1, 1, s - 2, s - 2, 3).fill(col.base);
  if (glass) {
    // ③ 유리 그라데이션: 왼쪽 위 밝은 면 0.55 → 중앙 0 → 오른쪽 아래 어두운 면 0.6
    const grad = new FillGradient({
      type: "linear", start: { x: 1, y: 1 }, end: { x: s - 1, y: s - 1 }, textureSpace: "global",
      colorStops: [{ offset: 0, color: rgba(col.light, 0.55) }, { offset: 0.5, color: rgba(col.light, 0) },
        { offset: 0.5, color: rgba(col.dark, 0) }, { offset: 1, color: rgba(col.dark, 0.6) }],
    });
    g.roundRect(1, 1, s - 2, s - 2, 3).fill(grad);
    // ④ 하이라이트: 윗변 안쪽 1px 흰 선 0.55 + 왼쪽 위 반사점(지름 18%, 흰 0.4)
    g.moveTo(3, 2.5).lineTo(s - 3, 2.5).stroke({ width: 1, color: 0xffffff, alpha: 0.55 });
    g.circle(s * 0.27, s * 0.27, s * 0.09).fill({ color: 0xffffff, alpha: 0.4 });
    // ⑤ 각인
    engrave(g, code, s, col.dark);
  } else if (code === 8) {
    // §2.3 쓰레기: 윗변 1px #8A83A0 + 돌 반점 3개 #4E4862
    g.moveTo(1.5, 1.5).lineTo(s - 1.5, 1.5).stroke({ width: 1, color: 0x8a83a0 });
    for (const [x, y, r] of [[0.3, 0.38, 0.08], [0.66, 0.56, 0.1], [0.4, 0.74, 0.06]]) g.circle(s * x, s * y, s * r);
    g.fill(0x4e4862);
  } else {
    // §2.3 납: 사선 빗금 #7E7E86 + 네 모서리 리벳 점 2px #5C5C63
    // 빗금 x + y = k 를 칸 안 [2, s−2]로 자른 선분
    for (const k of [0.5, 1.0, 1.5]) {
      const kk = k * s;
      const x0 = Math.max(2, kk - (s - 2));
      const x1 = Math.min(s - 2, kk - 2);
      g.moveTo(x0, kk - x0).lineTo(x1, kk - x1);
    }
    g.stroke({ width: Math.max(1, s / 15), color: 0x7e7e86 });
    const r = Math.max(1, s / 15);
    for (const [x, y] of [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]]) g.circle(s * x, s * y, r);
    g.fill(0x5c5c63);
  }
  // ⑥ 안쪽 1px 테두리 (어두운 면 색 0.8)
  g.roundRect(1.5, 1.5, s - 3, s - 3, 3).stroke({ width: 1, color: col.dark, alpha: 0.8 });
  return root;
}

/** §2.3 특수 칸 문양 덮개 (원래 블록 위에 겹침) @param {string} kind @param {number} s */
function drawOverlay(kind, s) {
  const g = new Graphics();
  g.position.set(PAD, PAD);
  const c = s / 2;
  const w = Math.max(1, s / 15);
  if (kind === "word") {
    // 두루마리: 가로선 3개 + 양끝 말림 (#FFF8E7)
    g.roundRect(s * 0.22, s * 0.26, s * 0.56, s * 0.48, s * 0.04).fill({ color: 0xfff8e7, alpha: 0.9 });
    g.circle(s * 0.22, c, s * 0.1).circle(s * 0.78, c, s * 0.1).fill(0xfff8e7);
    for (const y of [0.38, 0.5, 0.62]) g.moveTo(s * 0.32, s * y).lineTo(s * 0.68, s * y);
    g.stroke({ width: w, color: 0xa9801f, alpha: 0.8 });
  } else if (kind === "jericho") {
    // 나팔: 가는 관 + 넓어지는 나팔꽃 (#D2873A), 셀 테두리 놋 #F2B26E 1px
    g.rect(s * 0.18, c - s * 0.05, s * 0.4, s * 0.1).fill(0xd2873a);
    g.poly([s * 0.56, c - s * 0.06, s * 0.84, c - s * 0.26, s * 0.84, c + s * 0.26, s * 0.56,
      c + s * 0.06]).fill(0xd2873a);
    g.circle(s * 0.18, c, s * 0.07).fill(0xf2b26e);
    g.rect(0.5, 0.5, s - 1, s - 1).stroke({ width: 1, color: 0xf2b26e });
  } else if (kind === "manna") {
    // 만나: 흰 둥근 웨이퍼(지름 60%, 점 6개) — Exodus 16:31 "like coriander seed, white"
    g.circle(c, c, s * 0.3).fill(0xffffff);
    for (let i = 0; i < 6; i += 1) {
      const a = (i * Math.PI) / 3;
      g.circle(c + Math.cos(a) * s * 0.16, c + Math.sin(a) * s * 0.16, Math.max(0.7, s * 0.03));
    }
    g.fill({ color: 0xd8cfb8 });
  } else {
    // 갑주: 은빛 테두리 #DCE8FF 1px — 해당 갑주 아이콘 축소(§2.13.4)는 board-view가 그 위에 얹는다
    g.rect(0.5, 0.5, s - 1, s - 1).stroke({ width: 1, color: 0xdce8ff });
    g.rect(1.5, 1.5, s - 3, s - 3).fill({ color: 0xdce8ff, alpha: 0.12 });
  }
  return g;
}

/**
 * 텍스처 52장 굽기 (§4.9 "시작 시 36장 + 특수 덮개 16장"). 스프라이트는 anchor 0.5로 칸 가운데에 놓는다.
 * @param {any} renderer Pixi 렌더러
 */
export function createBlockTextures(renderer) {
  /** @type {Map<string, any>} */
  const map = new Map();
  /** @param {Container} c @param {number} s */
  const bake = (c, s) => {
    try {
      return renderer.generateTexture({
        target: c, frame: new Rectangle(0, 0, s + PAD * 2, s + PAD * 2), antialias: true, resolution: 2,
      });
    } finally {
      c.destroy({ children: true });
    }
  };
  for (const s of BLOCK_SIZES) {
    for (let code = 1; code <= 9; code += 1) map.set(`b${code}@${s}`, bake(drawBlock(code, s), s));
    for (const kind of SPECIAL_KINDS) map.set(`o${kind}@${s}`, bake(drawOverlay(kind, s), s));
  }
  return {
    /** CODE-009 1~9 블록 텍스처 @param {number} code @param {number} size */
    block(code, size) {
      return map.get(`b${code}@${size}`) ?? null;
    },
    /** 특수 칸 덮개 @param {string} kind @param {number} size */
    overlay(kind, size) {
      return map.get(`o${kind}@${size}`) ?? null;
    },
    count: map.size,
    destroy() {
      for (const t of map.values()) t.destroy(true);
      map.clear();
    },
  };
}
