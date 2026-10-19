// shapes-heroes-armor.js — 엠블럼 4·갑주 6 그리기 명령 데이터만
// TASK-044-2 | REQ-003 REQ-009 FR-013 FR-037 FR-049 | TBL-011 `emblem` · TBL-014 | design-vision §2.4·§2.13.1·§2.13.4
// 좌표·색은 design-vision §2.13.1(128 상자)·§2.13.4(48 상자) 원문 그대로. 명령 형식은 to-pixi.js 머리 주석.

const GOLD_RING = "#E8B84A";
const GOLD_INNER = "#F6D98B";

/** §2.13.1 ① 원형 메달: 반지름 58, 금 테두리 4px, 안쪽 1px 고리(반지름 52) @param {string} base */
function medal(base) {
  return [
    { op: "circle", cx: 64, cy: 64, r: 58, fill: base, stroke: { width: 4, color: GOLD_RING } },
    { op: "circle", cx: 64, cy: 64, r: 52, stroke: { width: 1, color: GOLD_INNER } },
  ];
}

/** 타원 둘레 점 (끊긴 고리용) — 각도 범위 [a0, a1] 도 @returns {any[]} path d */
function ellipseArc(cx, cy, rx, ry, a0, a1, steps = 24) {
  const d = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    d.push([i === 0 ? "M" : "L", cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return d;
}

/** §2.13.1 ③ 열쇠 (길이 64 — 손잡이 고리 반지름 7 + 자루 4px + 이 2개), 원점 = 열쇠 가운데, +x 방향 @param {string} color */
function key(color) {
  return [
    { op: "circle", cx: -25, cy: 0, r: 7, stroke: { width: 4, color } },
    { op: "rect", x: -18, y: -2, w: 50, h: 4, fill: color },
    { op: "rect", x: 20, y: 2, w: 4, h: 8, fill: color },
    { op: "rect", x: 27, y: 2, w: 4, h: 6, fill: color },
  ];
}

/** TBL-011 heroes.json `emblem` 키 → 그림 (FR-013 코드로 그린 벡터 엠블럼) */
export const EMBLEMS = Object.freeze({
  // 다윗 — 1 Samuel 17:49 물매, 17:40 "five smooth stones"
  sling: {
    id: "sling", box: { w: 128, h: 128 }, label_ko: "다윗 엠블럼 — 물맷돌",
    items: [
      ...medal("#1B2A5C"),
      { op: "path", d: [["M", 40, 30], ["Q", 42, 66, 54, 80]], stroke: { width: 3, color: "#EFE6D0" } },
      { op: "path", d: [["M", 88, 30], ["Q", 86, 66, 74, 80]], stroke: { width: 3, color: "#EFE6D0" } },
      { op: "ellipse", cx: 64, cy: 82, rx: 12, ry: 7, fill: "#D2873A" },
      { op: "circle", cx: 64, cy: 76, r: 8, fill: "#A9B4C4" },
      { op: "circle", cx: 61, cy: 73, r: 2.2, fill: "#FFFFFF", fillAlpha: 0.7 },
      // ④ 아래 호를 따라 작은 돌 5개
      ...[50, 70, 90, 110, 130].map((deg) => ({
        op: "circle", cx: 64 + 44 * Math.cos((deg * Math.PI) / 180), cy: 64 + 44 * Math.sin((deg * Math.PI) / 180),
        r: 3, fill: "#A9B4C4",
      })),
    ],
  },
  // 솔로몬 — 1 Kings 3:9 "understanding heart"
  crown: {
    id: "crown", box: { w: 128, h: 128 }, label_ko: "솔로몬 엠블럼 — 지혜로운 마음",
    items: [
      ...medal("#2A1550"),
      {
        op: "poly",
        // ② 밑변 (30,78)~(98,78) 높이 10 띠 + 뾰족 5개(꼭짓점 y 34·42·30·42·34)
        points: [30, 78, 30, 68, 36, 34, 45, 62, 50, 42, 57, 62, 64, 30, 71, 62, 78, 42, 83, 62, 92, 34, 98, 68, 98,
          78],
        fill: "#F2C14E", stroke: { width: 2, color: "#A9801F" },
      },
      { op: "path", d: [["M", 30, 68], ["L", 98, 68]], stroke: { width: 2, color: "#A9801F" } },
      ...[[36, 34], [50, 42], [64, 30], [78, 42], [92, 34]].map(([x, y]) => ({
        op: "circle", cx: x, cy: y, r: 4, fill: "#FFE29A",
      })),
      { op: "circle", cx: 64, cy: 73, r: 5, fill: "#E8304A" },
      { op: "circle", cx: 48, cy: 73, r: 4, fill: "#3D7BFF" },
      { op: "circle", cx: 80, cy: 73, r: 4, fill: "#3D7BFF" },
      // ⑤ 하트 18×16
      {
        op: "path", fill: "#F6D98B", fillAlpha: 0.9,
        d: [["M", 64, 104], ["C", 52, 96, 54, 87, 59, 88], ["C", 62, 88, 64, 91, 64, 92],
          ["C", 64, 91, 66, 88, 69, 88], ["C", 74, 87, 76, 96, 64, 104], ["Z"]],
      },
    ],
  },
  // 베드로 — Matthew 16:18 반석과 열쇠
  rock_key: {
    id: "rock_key", box: { w: 128, h: 128 }, label_ko: "베드로 엠블럼 — 이 반석 위에",
    items: [
      ...medal("#26303A"),
      { op: "poly", points: [24, 96, 30, 70, 48, 56, 70, 58, 92, 66, 104, 90, 96, 100], fill: "#6B7484" },
      { op: "path", d: [["M", 30, 70], ["L", 48, 56], ["L", 70, 58], ["L", 92, 66]], stroke: { width: 4,
        color: "#A9B4C4" } },
      { op: "group", ox: 0, oy: 0, x: 64, y: 50, rotate: 45, items: key("#F2C14E") },
      { op: "group", ox: 0, oy: 0, x: 64, y: 50, rotate: 135, items: key("#E3E8EF") },
    ],
  },
  // 바울 — Acts 16:26 옥문·끊어진 사슬
  broken_chain: {
    id: "broken_chain", box: { w: 128, h: 128 }, label_ko: "바울 엠블럼 — 옥문이 열리다",
    items: [
      ...medal("#3A1512"),
      ...[44, 64, 84].map((x) => ({ op: "rect", x: x - 3, y: 18, w: 6, h: 92, fill: "#5C5C63", fillAlpha: 0.7 })),
      { op: "ellipse", cx: 46, cy: 72, rx: 11, ry: 7, stroke: { width: 4, color: "#A9B4C4" } },
      { op: "ellipse", cx: 82, cy: 72, rx: 11, ry: 7, stroke: { width: 4, color: "#A9B4C4" } },
      // ③ 가운데 고리는 위쪽이 6px 벌어진 채 끊김 (-90° 둘레 ±16°)
      { op: "path", d: ellipseArc(64, 72, 11, 7, -74, 254), stroke: { width: 4, color: "#A9B4C4" } },
      ...[[61, 60, 2], [67, 58, 2.5], [64, 54, 1.5], [58, 55, 1.8], [70, 62, 1.6], [66, 51, 2]].map(([x, y, r]) => ({
        op: "circle", cx: x, cy: y, r, fill: "#F6D98B",
      })),
    ],
  },
});

/** §2.13.4 전신갑주 아이콘 6종 — 48 상자 (armor.json id) */
export const ARMOR_ICONS = Object.freeze({
  belt_of_truth: {
    id: "belt_of_truth", box: { w: 48, h: 48 }, label_ko: "진리의 허리띠",
    items: [
      { op: "rect", x: 4, y: 19, w: 40, h: 10, r: 4, fill: "#F2C14E" },
      { op: "rect", x: 18, y: 16, w: 12, h: 16, r: 2, fill: "#FFE29A" },
      { op: "rect", x: 21, y: 20, w: 6, h: 8, r: 1, fill: "#F2C14E" },
    ],
  },
  breastplate_of_righteousness: {
    id: "breastplate_of_righteousness", box: { w: 48, h: 48 }, label_ko: "의의 흉배",
    items: [
      { op: "path", fill: "#A9B4C4", d: [["M", 8, 6], ["L", 40, 6], ["L", 38, 26], ["Q", 33, 37, 24, 42], ["Q", 15, 37,
        10, 26], ["Z"]] },
      { op: "path", d: [["M", 24, 8], ["L", 24, 40]], stroke: { width: 1.5, color: "#6B7484" } },
      ...[14, 21, 28].map((y) => ({
        op: "path", d: [["M", 11, y], ["Q", 24, y + 4, 37, y]], stroke: { width: 1.5, color: "#6B7484" },
      })),
    ],
  },
  gospel_shoes: {
    id: "gospel_shoes", box: { w: 48, h: 48 }, label_ko: "평안의 복음의 신",
    items: [
      { op: "path", fill: "#D2873A", d: [["M", 4, 34], ["Q", 6, 40, 14, 40], ["L", 40, 40], ["Q", 46, 39, 44, 34],
        ["Z"]] },
      { op: "path", d: [["M", 10, 34], ["Q", 14, 22, 22, 18]], stroke: { width: 2.5, color: "#F2B26E" } },
      { op: "path", d: [["M", 20, 34], ["Q", 24, 24, 30, 22]], stroke: { width: 2.5, color: "#F2B26E" } },
      { op: "path", d: [["M", 30, 34], ["Q", 34, 27, 40, 27]], stroke: { width: 2.5, color: "#F2B26E" } },
    ],
  },
  shield_of_faith: {
    id: "shield_of_faith", box: { w: 48, h: 48 }, label_ko: "믿음의 방패",
    items: [
      { op: "circle", cx: 24, cy: 24, r: 18, fill: "#E8B84A" },
      { op: "circle", cx: 24, cy: 24, r: 12, stroke: { width: 2, color: "#A9801F" } },
      { op: "circle", cx: 24, cy: 24, r: 3.5, fill: "#A9801F" },
    ],
  },
  helmet_of_salvation: {
    id: "helmet_of_salvation", box: { w: 48, h: 48 }, label_ko: "구원의 투구",
    items: [
      // 볏 3갈래
      { op: "path", fill: "#E8304A", d: [["M", 24, 12], ["Q", 18, 4, 14, 8], ["Q", 18, 9, 21, 13], ["Z"]] },
      { op: "path", fill: "#E8304A", d: [["M", 24, 12], ["Q", 30, 4, 34, 8], ["Q", 30, 9, 27, 13], ["Z"]] },
      { op: "path", fill: "#E8304A", d: [["M", 22, 13], ["Q", 24, 2, 26, 13], ["Z"]] },
      // 반원 돔 + 볼가리개
      { op: "path", fill: "#E3E8EF", d: [["M", 10, 28], ["Q", 10, 12, 24, 12], ["Q", 38, 12, 38, 28], ["L", 38, 40],
        ["L", 31, 40], ["L", 31, 28], ["L", 17, 28], ["L", 17, 40], ["L", 10, 40], ["Z"]] },
    ],
  },
  sword_of_the_spirit: {
    id: "sword_of_the_spirit", box: { w: 48, h: 48 }, label_ko: "성령의 검",
    items: [
      { op: "poly", points: [24, 4, 26, 8, 26, 34, 22, 34, 22, 8], fill: "#DCE8FF" },
      { op: "rect", x: 15, y: 34, w: 18, h: 3, r: 1, fill: "#F2C14E" },
      { op: "rect", x: 22, y: 37, w: 4, h: 8, r: 1, fill: "#F2C14E" },
    ],
  },
});
