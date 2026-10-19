// shapes-ui.js — 기타 기호·UI 아이콘 그리기 명령 데이터만
// TASK-044-1 | REQ-013 FR-049 FR-062 FR-065 C-007 | design-vision §2.13.6
// 은혜 비둘기(FR-062)·예수님 이벤트 사용 별빛 점·빛 별 문양(말씀 카드)·업적 인장(FR-065)·UI 아이콘 8종(24px, 선 2px currentColor).
import { EMBLEMS } from "./shapes-heroes-armor.js";

/** 24px 아이콘 선 스타일 — §2.13.6 "선 2px currentColor" */
const LINE = Object.freeze({ width: 2, color: "currentColor" });

/** @param {string} id @param {string} label @param {any[]} items */
const icon = (id, label, items) => ({ id, box: { w: 24, h: 24 }, label_ko: label, items });

/** §2.13.6 은혜 아이콘 — 비둘기 옆모습 실루엣 20×16, #F6D98B 0.7, 글자 없음 (FR-062 "은은하게") */
export const GRACE_DOVE = Object.freeze({
  id: "grace_dove", box: { w: 20, h: 16 }, label_ko: "은혜",
  items: [
    { op: "ellipse", cx: 10, cy: 10, rx: 7, ry: 3.6, fill: "#F6D98B", fillAlpha: 0.7 },
    { op: "circle", cx: 16.2, cy: 8, r: 2.2, fill: "#F6D98B", fillAlpha: 0.7 },
    { op: "poly", points: [18, 7.6, 20, 8.4, 18, 9], fill: "#F6D98B", fillAlpha: 0.7 },
    { op: "path", fill: "#F6D98B", fillAlpha: 0.7, d: [["M", 8, 9], ["Q", 6, 1, 13, 0.5], ["Q", 11, 5, 12, 9], ["Z"]] },
    { op: "poly", points: [3.5, 9, 0, 7, 0.5, 12], fill: "#F6D98B", fillAlpha: 0.7 },
  ],
});

/** §2.13.6 예수님 이벤트 사용 표시 — 지름 10 별빛 점 #FFF8E7 0.35 (status.jesusUsed 후에만) */
export const JESUS_USED_STAR = Object.freeze({
  id: "jesus_used_star", box: { w: 10, h: 10 }, label_ko: "이번 경기에서 세상을 이기었노라 이벤트가 일어났습니다",
  items: [{ op: "circle", cx: 5, cy: 5, r: 5, fill: "#FFF8E7", fillAlpha: 0.35 }],
});

/**
 * §2.13.6 빛 별 문양 — 지름 64, 가운데 #FFF8E7 원(반지름 8) + 빛살 8갈래(길이 32·20 번갈아, 두께 3→0). GLW-holy는 렌더러 몫.
 * 말씀 카드에서 구절이 John 16:33일 때 엠블럼 자리 (§4.6.8 — 실루엣 없음).
 */
export const LIGHT_STAR = Object.freeze({
  id: "light_star", box: { w: 64, h: 64 }, label_ko: "빛",
  items: [
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const len = i % 2 === 0 ? 32 : 20;
      const px = Math.cos(a + Math.PI / 2) * 1.5;
      const py = Math.sin(a + Math.PI / 2) * 1.5;
      // 두께 3 → 0으로 가늘어지는 빛살 = 뿌리 폭 3의 가는 삼각형
      return { op: "poly", points: [32 + px, 32 + py, 32 + Math.cos(a) * len, 32 + Math.sin(a) * len, 32 - px,
        32 - py], fill: "#FFF8E7" };
    }),
    { op: "circle", cx: 32, cy: 32, r: 8, fill: "#FFF8E7" },
  ],
});

/**
 * §2.13.6 업적 인장 — 지름 96 금 밀랍(가장자리 물결 12갈래, #A9801F→#E8B84A) + 가운데 해당 위인 엠블럼 축소 (FR-065).
 * @param {keyof typeof EMBLEMS} emblemKey heroes.json `emblem`
 */
export function achievementSeal(emblemKey) {
  const pts = [];
  for (let i = 0; i < 72; i += 1) {
    const a = (i / 72) * 2 * Math.PI;
    const r = 44 + 4 * Math.cos(a * 12);
    pts.push(48 + r * Math.cos(a), 48 + r * Math.sin(a));
  }
  return {
    id: `seal_${emblemKey}`, box: { w: 96, h: 96 }, label_ko: "업적 인장",
    items: [
      { op: "poly", points: pts, fill: { linear: [0, 0, 0, 96], stops: [[0, "#A9801F"], [1, "#E8B84A"]] } },
      { op: "use", shape: EMBLEMS[emblemKey], x: 48, y: 48, size: 64 },
    ],
  };
}

/** §2.13.6 UI 아이콘 8종 — 톱니·뒤로·잠금·사슬·소리·음소거·저장·공유 (24px, 선 2px currentColor) */
export const UI_ICONS = Object.freeze({
  gear: icon("gear", "옵션", [
    {
      op: "poly", stroke: LINE,
      points: Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * 2 * Math.PI;
        const r = i % 4 < 2 ? 10 : 7.5;
        return [12 + r * Math.cos(a), 12 + r * Math.sin(a)];
      }).flat(),
    },
    { op: "circle", cx: 12, cy: 12, r: 3, stroke: LINE },
  ]),
  back: icon("back", "뒤로", [
    { op: "path", d: [["M", 20, 12], ["L", 4, 12]], stroke: LINE },
    { op: "path", d: [["M", 10, 6], ["L", 4, 12], ["L", 10, 18]], stroke: LINE },
  ]),
  lock: icon("lock", "잠금", [
    { op: "rect", x: 5, y: 11, w: 14, h: 10, r: 2, stroke: LINE },
    { op: "path", d: [["M", 8, 11], ["L", 8, 7], ["Q", 8, 3, 12, 3], ["Q", 16, 3, 16, 7], ["L", 16, 11]],
      stroke: LINE },
  ]),
  chain: icon("chain", "봉인", [
    { op: "group", ox: 12, oy: 12, rotate: -45, items: [
      { op: "rect", x: 1, y: 8, w: 12, h: 8, r: 4, stroke: LINE },
      { op: "rect", x: 11, y: 8, w: 12, h: 8, r: 4, stroke: LINE },
    ] },
  ]),
  sound: icon("sound", "소리", [
    { op: "poly", points: [3, 9, 7, 9, 12, 4, 12, 20, 7, 15, 3, 15], stroke: LINE },
    { op: "path", d: [["M", 15, 9], ["Q", 17.5, 12, 15, 15]], stroke: LINE },
    { op: "path", d: [["M", 18, 6], ["Q", 23, 12, 18, 18]], stroke: LINE },
  ]),
  mute: icon("mute", "음소거", [
    { op: "poly", points: [3, 9, 7, 9, 12, 4, 12, 20, 7, 15, 3, 15], stroke: LINE },
    { op: "path", d: [["M", 15, 7], ["L", 22, 17]], stroke: LINE },
  ]),
  save: icon("save", "저장", [
    { op: "path", d: [["M", 12, 3], ["L", 12, 15]], stroke: LINE },
    { op: "path", d: [["M", 7, 10], ["L", 12, 15], ["L", 17, 10]], stroke: LINE },
    { op: "path", d: [["M", 4, 17], ["L", 4, 21], ["L", 20, 21], ["L", 20, 17]], stroke: LINE },
  ]),
  share: icon("share", "공유", [
    { op: "path", d: [["M", 7, 12], ["L", 17, 6]], stroke: LINE },
    { op: "path", d: [["M", 7, 12], ["L", 17, 18]], stroke: LINE },
    { op: "circle", cx: 6, cy: 12, r: 2.6, stroke: LINE },
    { op: "circle", cx: 18, cy: 5.5, r: 2.6, stroke: LINE },
    { op: "circle", cx: 18, cy: 18.5, r: 2.6, stroke: LINE },
  ]),
});
