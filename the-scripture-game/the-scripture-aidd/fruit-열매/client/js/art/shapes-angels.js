// shapes-angels.js — 천사 5 + 예수님 빛 실루엣 그리기 명령 데이터만
// TASK-044-3 | REQ-008 REQ-010 FR-035 FR-039 FR-049 C-002 C-010 | TBL-012 `visual` | design-vision §2.4·§2.13.2·§2.13.5
// 천사는 "빛기둥 위 192×192 상자"(§2.13.2). 예수님 빛 실루엣은 §2.13.5 치수(옷자락 300 높이 등)를 담는 상자.
// C-002: 실루엣에는 얼굴·이목구비·명암·무늬를 절대 그리지 않는다 — 단색 #FFF8E7 빛 형상과 후광 빛살뿐.

/**
 * 끝이 둥근 사다리꼴 깃털 1장 (원점 = 깃털 뿌리, 각도 deg 방향으로 길이 len).
 * @param {number} x @param {number} y 뿌리 @param {number} deg 방향(화면 좌표 — 180 왼쪽, 270 위)
 * @param {number} len @param {any} fill
 */
function feather(x, y, deg, len, fill) {
  return {
    op: "group", ox: 0, oy: 0, x, y, rotate: deg,
    items: [{ op: "path", fill, d: [["M", 0, -4], ["L", len - 8, -8], ["Q", len + 2, 0, len - 8, 8], ["L", 0, 4],
      ["Z"]] }],
  };
}

/**
 * 날개 한 쌍 — 왼쪽 날개 각도 목록을 거울로 오른쪽에 (x' = 2·cx − x, 각도' = 180 − 각도).
 * @param {number} cx 몸 가운데 x @param {number} y 어깨 높이 @param {number} spread 어깨 간격 반
 * @param {Array<[number, number]>} leftFeathers [각도, 길이] @param {any} fill
 */
function wingPair(cx, y, spread, leftFeathers, fill) {
  const out = [];
  for (const [deg, len] of leftFeathers) {
    out.push(feather(cx - spread, y, deg, len, fill));
    out.push(feather(cx + spread, y, 180 - deg, len, fill));
  }
  return out;
}

/** @param {number} y0 @param {number} y1 @param {string} top @param {string} bottom */
const vGradient = (y0, y1, top, bottom) => ({ linear: [0, y0, 0, y1], stops: [[0, top], [1, bottom]] });

/** 6장 깃털 — 위→아래로 짧아짐 (길이 90→40, §2.13.2 미가엘) */
const MICHAEL_FEATHERS = [[215, 90], [203, 80], [192, 70], [181, 60], [170, 50], [159, 40]];
/** 5장 깃털 — 미가엘보다 작게 (§2.13.2 가브리엘) */
const GABRIEL_FEATHERS = [[212, 70], [199, 61], [186, 52], [173, 43], [160, 35]];

/** 둘레 위 n개 점 @param {number} r @param {number} n @param {number} rr 점 반지름 */
function ringDots(r, n, rr) {
  return Array.from({ length: n }, (_, i) => ({
    op: "circle", cx: 96 + r * Math.cos((i * 2 * Math.PI) / n), cy: 96 + r * Math.sin((i * 2 * Math.PI) / n), r: rr,
    fill: "#FFF8E7",
  }));
}

/** TBL-012 angels.json `visual` 키 → 그림 (FR-049 천사: 빛·날개·불꽃) */
export const ANGEL_SHAPES = Object.freeze({
  // 미가엘 Jude 1:9 — 날개 한 쌍 + 세로 빛의 검
  wings_light: {
    id: "wings_light", box: { w: 192, h: 192 }, label_ko: "미가엘",
    items: [
      ...wingPair(96, 84, 10, MICHAEL_FEATHERS, vGradient(20, 150, "#DCE8FF", "#FFF8E7")),
      { op: "poly", points: [96, 30, 100, 44, 100, 144, 92, 144, 92, 44], fill: "#FFFFFF" },
      { op: "rect", x: 82, y: 144, w: 28, h: 5, r: 2, fill: "#FFFFFF" },
      { op: "rect", x: 94, y: 149, w: 4, h: 12, r: 1, fill: "#FFFFFF" },
    ],
  },
  // 가브리엘 Luke 1:19 — 작은 날개 + 오른쪽 위 나팔 빛 + 소리 고리 2개
  herald_light: {
    id: "herald_light", box: { w: 192, h: 192 }, label_ko: "가브리엘",
    items: [
      ...wingPair(84, 104, 8, GABRIEL_FEATHERS, vGradient(40, 150, "#DCE8FF", "#FFF8E7")),
      {
        op: "group", ox: 0, oy: 0, x: 98, y: 96, rotate: -40,
        items: [
          {
            op: "path", fill: { linear: [0, 0, 90, 0], stops: [[0, "#F6D98B", 1], [1, "#F6D98B", 0]] },
            d: [["M", 0, -3], ["L", 50, -5], ["L", 90, -22], ["L", 90, 22], ["L", 50, 5], ["L", 0, 3], ["Z"]],
          },
          { op: "path", d: [["M", 96, -20], ["Q", 104, 0, 96, 20]], stroke: { width: 3, color: "#F6D98B",
            alpha: 0.8 } },
          { op: "path", d: [["M", 106, -28], ["Q", 117, 0, 106, 28]], stroke: { width: 3, color: "#F6D98B",
            alpha: 0.5 } },
        ],
      },
    ],
  },
  // 그룹 Genesis 3:24 · Ezekiel 10 — 두 겹 바퀴(눈 12개씩) + 네 얼굴 상징 문양(얼굴 묘사 없음)
  four_faces_wheels: {
    id: "four_faces_wheels", box: { w: 192, h: 192 }, label_ko: "그룹",
    items: [
      {
        op: "group", name: "outer", ox: 96, oy: 96,
        items: [{ op: "circle", cx: 96, cy: 96, r: 60, stroke: { width: 4, color: "#F6D98B" } }, ...ringDots(60, 12,
          3)],
      },
      {
        op: "group", name: "inner", ox: 96, oy: 96,
        items: [{ op: "circle", cx: 96, cy: 96, r: 40, stroke: { width: 4, color: "#F6D98B" } }, ...ringDots(40, 12,
          3)],
      },
      // 위: 그룹(작은 날개 2장)
      { op: "path", fill: "#FF8A3D", d: [["M", 96, 22], ["Q", 84, 8, 78, 16], ["Q", 86, 18, 96, 22], ["Z"]] },
      { op: "path", fill: "#FF8A3D", d: [["M", 96, 22], ["Q", 108, 8, 114, 16], ["Q", 106, 18, 96, 22], ["Z"]] },
      // 오른쪽: 사람(빈 원)
      { op: "circle", cx: 174, cy: 96, r: 8, stroke: { width: 2.5, color: "#FF8A3D" } },
      // 아래: 사자(8갈래 갈기 별)
      {
        op: "poly", fill: "#FF8A3D",
        points: Array.from({ length: 16 }, (_, i) => {
          const a = (i * Math.PI) / 8;
          const r = i % 2 === 0 ? 10 : 4.5;
          return [96 + r * Math.cos(a), 174 + r * Math.sin(a)];
        }).flat(),
      },
      // 왼쪽: 독수리(펼친 날개 V)
      { op: "path", d: [["M", 8, 88], ["L", 18, 100], ["L", 28, 88]], stroke: { width: 3, color: "#FF8A3D" } },
    ],
  },
  // 스랍 Isaiah 6:2·6:6 — 여섯 날개 + 가운데 숯불
  six_wings: {
    id: "six_wings", box: { w: 192, h: 192 }, label_ko: "스랍",
    items: [
      // 가운데 한 쌍: 크게 펼침
      ...wingPair(96, 96, 8, [[200, 84], [190, 76], [180, 68], [170, 60], [160, 52]],
        vGradient(40, 150, "#FFB347", "#FFF8E7")),
      // 위 한 쌍: 가운데를 덮듯 안쪽으로 접힘
      ...wingPair(96, 70, 30, [[300, 40], [310, 36], [320, 32], [330, 28], [340, 24]],
        vGradient(30, 80, "#FFB347", "#FFF8E7")),
      // 아래 한 쌍: 아래를 덮음
      ...wingPair(96, 122, 30, [[60, 40], [50, 36], [40, 32], [30, 28], [20, 24]],
        vGradient(110, 170, "#FFB347", "#FFF8E7")),
      {
        op: "group", name: "coal", ox: 96, oy: 96,
        items: [
          { op: "circle", cx: 96, cy: 96, r: 16, fill: { radial: [96, 96, 16], stops: [[0, "#FFB347", 0.9], [1,
            "#FFB347", 0]] } },
          { op: "circle", cx: 96, cy: 96, r: 9, fill: "#FF8A3D" },
        ],
      },
    ],
  },
  // 섬기는 영들 Hebrews 1:14 — 작은 빛 구슬 12개가 원(반지름 50)
  small_lights: {
    id: "small_lights", box: { w: 192, h: 192 }, label_ko: "섬기는 영들",
    items: [
      {
        op: "group", name: "orbit", ox: 96, oy: 96,
        items: Array.from({ length: 12 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 12;
          const r = 4 + (i % 4);
          const cx = 96 + 50 * Math.cos(a);
          const cy = 96 + 50 * Math.sin(a);
          return [
            { op: "circle", cx, cy, r: r + 10, fill: { radial: [cx, cy, r + 10], stops: [[0, "#FFF8E7", 0.6], [1,
              "#FFF8E7", 0]] } },
            { op: "circle", cx, cy, r, fill: "#FFF8E7" },
          ];
        }).flat(),
      },
    ],
  },
});

/**
 * §2.13.5 예수님 "세상을 이기었노라" 빛 실루엣 — 서 있는 형상을 순수한 빛으로만 (C-002).
 * ① 옷자락: 위 폭 60 · 아래 폭 140 · 높이 300 둥근 사다리꼴 ② 머리 자리: 반지름 26 원형 빛(단색, 가장자리 번짐만)
 * ③ 팔: 몸 양옆 가는 호 2개(두께 14, 끝 둥금) ④ 후광: 가는 빛살 24개(길이 80~160, #FFFFFF 0.3)
 * 상자 420×560, 머리 가운데 (210, 196). 얼굴·눈·코·입·윤곽·명암 없음 — 이 데이터에는 #FFF8E7·#FFFFFF 외 색이 없다.
 */
export const JESUS_LIGHT = Object.freeze({
  id: "jesus_light", box: { w: 420, h: 560 }, label_ko: "빛",
  items: [
    {
      op: "group", name: "halo", ox: 210, oy: 196,
      items: Array.from({ length: 24 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 24;
        const len = i % 2 === 0 ? 160 : 80 + ((i * 37) % 60);
        const c = Math.cos(a);
        const s = Math.sin(a);
        return {
          op: "path", stroke: { width: 3, color: "#FFFFFF", alpha: 0.3 },
          d: [["M", 210 + 34 * c, 196 + 34 * s], ["L", 210 + (34 + len) * c, 196 + (34 + len) * s]],
        };
      }),
    },
    { op: "path", fill: "#FFF8E7", d: [["M", 180, 238], ["Q", 210, 228, 240, 238], ["L", 278, 530], ["Q", 210, 546,
      142, 530], ["Z"]] },
    { op: "path", d: [["M", 184, 250], ["Q", 150, 300, 140, 372]], stroke: { width: 14, color: "#FFF8E7",
      cap: "round" } },
    { op: "path", d: [["M", 236, 250], ["Q", 270, 300, 280, 372]], stroke: { width: 14, color: "#FFF8E7",
      cap: "round" } },
    { op: "circle", cx: 210, cy: 196, r: 34, fill: { radial: [210, 196, 34], stops: [[0, "#FFF8E7", 1], [0.76,
      "#FFF8E7", 1], [1, "#FFF8E7", 0]] } },
  ],
});
