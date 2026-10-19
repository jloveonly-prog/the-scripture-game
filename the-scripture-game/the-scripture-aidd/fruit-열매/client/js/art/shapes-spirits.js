// shapes-spirits.js — 악한 영 14 실루엣 그리기 명령 데이터만 (고어·선정 없음)
// TASK-044-3 | REQ-007 FR-027~FR-030 FR-049 C-010 C-011 | TBL-013 | design-vision §2.4·§2.13.3
// §2.13.3 공통: 실루엣·연기 중심 반투명, 채움 #1A1424 투명도 0.75~0.9, 가장자리 GLW-evil(렌더러 필터 — spirit-fx).
// 얼굴·피·상처·신체 훼손 묘사 없음(C-011). 상자 128(용만 화면을 가로지르는 960×300 — 몸통 길이 900px).

const SMOKE = "#1A1424";

/** 연기 물방울(아래로 늘어짐) @param {number} cx @param {number} top @param {number} w @param {number} h @param {number} a */
function droplet(cx, top, w, h, a) {
  const hw = w / 2;
  return {
    op: "path", fill: SMOKE, fillAlpha: a,
    d: [["M", cx, top], ["C", cx + hw, top, cx + hw * 1.1, top + h * 0.55, cx + hw * 0.35, top + h * 0.8],
      ["Q", cx, top + h * 1.05, cx - hw * 0.35, top + h * 0.8],
      ["C", cx - hw * 1.1, top + h * 0.55, cx - hw, top, cx, top], ["Z"]],
  };
}

/** 그림자 사람 형상(머리 원 + 몸통 물방울) — 얼굴 없음 @param {number} cx @param {number} base @param {number} h */
function shadowFigure(cx, base, h, a) {
  const head = h * 0.16;
  return [
    { op: "circle", cx, cy: base - h + head, r: head, fill: SMOKE, fillAlpha: a },
    {
      op: "path", fill: SMOKE, fillAlpha: a,
      d: [["M", cx, base - h + head * 2.1], ["Q", cx + h * 0.32, base - h * 0.3, cx + h * 0.2, base],
        ["L", cx - h * 0.2, base], ["Q", cx - h * 0.32, base - h * 0.3, cx, base - h + head * 2.1], ["Z"]],
    },
  ];
}

/** 셰브론(메뚜기 — §2.10 PT-locust 6×4 모양) */
function chevron(x, y, s, a) {
  return { op: "poly", points: [x - 3 * s, y - 2 * s, x, y, x + 3 * s, y - 2 * s, x, y + 1.6 * s], fill: SMOKE,
    fillAlpha: a };
}

/** 나선 바람 연기 한 겹 @param {number} r0 @param {number} turns */
function spiral(r0, turns, width, a) {
  const d = [];
  const steps = 48;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const ang = t * turns * 2 * Math.PI;
    const r = r0 * (0.15 + 0.85 * t);
    d.push([i === 0 ? "M" : "L", 64 + r * Math.cos(ang), 64 + r * Math.sin(ang) * 0.75]);
  }
  return { op: "path", d, stroke: { width, color: SMOKE, alpha: a } };
}

/** 용 몸통 — S자 베지어 중심선을 두께 40→8로 감싼 다각형 (Revelation 12:3) */
function dragonBody() {
  const p = (t) => {
    // 3차 베지어 (20,170) → (300,20) → (620,300) → (900,120)
    const u = 1 - t;
    return [
      u * u * u * 20 + 3 * u * u * t * 300 + 3 * u * t * t * 620 + t * t * t * 900,
      u * u * u * 170 + 3 * u * u * t * 20 + 3 * u * t * t * 300 + t * t * t * 120,
    ];
  };
  const left = [];
  const right = [];
  const n = 40;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const [x, y] = p(t);
    const [x2, y2] = p(Math.min(1, t + 0.01));
    const [x1, y1] = p(Math.max(0, t - 0.01));
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    // 두께: 머리 쪽(t=0) 40 → 꼬리(t=1) 8
    const half = (40 - 32 * t) / 2;
    left.push(x + nx * half, y + ny * half);
    right.unshift(x - nx * half, y - ny * half);
  }
  const body = { op: "poly", points: [...left, ...right], fill: "#120008", stroke: { width: 2, color: "#8E2A5A" } };
  // 일곱 머리를 뜻하는 뾰족 윤곽 7개 — 머리 쪽 끝(20,170)에서 부채꼴
  const heads = Array.from({ length: 7 }, (_, i) => {
    const a = ((200 + i * 20) * Math.PI) / 180;
    const bx = 30 + Math.cos(a) * 6;
    const by = 166 + Math.sin(a) * 6;
    const tip = [bx + Math.cos(a) * 46, by + Math.sin(a) * 46];
    const side = [Math.cos(a + Math.PI / 2) * 7, Math.sin(a + Math.PI / 2) * 7];
    return {
      op: "poly", points: [bx + side[0], by + side[1], tip[0], tip[1], bx - side[0], by - side[1]],
      fill: "#120008", stroke: { width: 2, color: "#8E2A5A" },
    };
  });
  return [...heads, body];
}

/** TBL-013 spirits.json id → 등장 실루엣 (§2.13.3 표) */
export const SPIRIT_SHAPES = Object.freeze({
  unclean_spirit: {
    id: "unclean_spirit", box: { w: 128, h: 128 }, label_ko: "더러운 귀신",
    items: [droplet(64, 10, 96, 70, 0.75), droplet(64, 28, 72, 72, 0.82), droplet(64, 46, 48, 70, 0.9)],
  },
  deaf_dumb_spirit: {
    id: "deaf_dumb_spirit", box: { w: 128, h: 128 }, label_ko: "귀먹고 말 못하게 하는 귀신",
    items: [
      droplet(64, 24, 60, 88, 0.75),
      { op: "group", ox: 30, oy: 60, rotate: -18, items: [{ op: "ellipse", cx: 30, cy: 60, rx: 20, ry: 28, fill: SMOKE,
        fillAlpha: 0.9 }] },
      { op: "group", ox: 98, oy: 60, rotate: 18, items: [{ op: "ellipse", cx: 98, cy: 60, rx: 20, ry: 28, fill: SMOKE,
        fillAlpha: 0.9 }] },
    ],
  },
  legion: {
    id: "legion", box: { w: 128, h: 128 }, label_ko: "군대",
    items: [[18, 96, 40], [36, 104, 50], [52, 92, 34], [66, 110, 48], [82, 98, 42], [98, 108, 50], [112, 94, 30]]
      .flatMap(([x, b, h], i) => shadowFigure(x, b, h, 0.75 + (i % 3) * 0.05)),
  },
  lying_spirit: {
    id: "lying_spirit", box: { w: 128, h: 128 }, label_ko: "거짓말하는 영",
    items: [
      { op: "path", d: [["M", 24, 12], ["C", 110, 40, 18, 88, 104, 116]], stroke: { width: 14, color: SMOKE,
        alpha: 0.82 } },
      { op: "path", d: [["M", 104, 12], ["C", 18, 40, 110, 88, 24, 116]], stroke: { width: 14, color: SMOKE,
        alpha: 0.82 } },
    ],
  },
  divination_spirit: {
    id: "divination_spirit", box: { w: 128, h: 128 }, label_ko: "점치는 귀신",
    items: [
      droplet(64, 14, 104, 96, 0.75),
      { op: "circle", cx: 64, cy: 66, r: 22, fill: "#2A2433", fillAlpha: 0.9 },
      { op: "path", d: [["M", 64, 66], ["Q", 76, 58, 70, 52], ["Q", 56, 48, 52, 64], ["Q", 54, 82, 72, 80], ["Q", 84,
        74, 82, 62]], stroke: { width: 2, color: "#8E2A5A", alpha: 0.8 } },
    ],
  },
  beelzebub: {
    id: "beelzebub", box: { w: 128, h: 128 }, label_ko: "바알세불",
    items: [
      ...[[-30, 40], [-60, 34], [30, 88], [60, 94]].map(([rot, x]) => ({
        op: "group", ox: 64, oy: 58, rotate: rot,
        items: [{ op: "ellipse", cx: x, cy: 40, rx: 26, ry: 12, fill: SMOKE, fillAlpha: 0.4 }],
      })),
      { op: "ellipse", cx: 64, cy: 72, rx: 16, ry: 30, fill: SMOKE, fillAlpha: 0.9 },
      { op: "circle", cx: 64, cy: 38, r: 10, fill: SMOKE, fillAlpha: 0.9 },
    ],
  },
  prince_of_the_air: {
    id: "prince_of_the_air", box: { w: 128, h: 128 }, label_ko: "공중 권세 잡은 자",
    items: [spiral(58, 2.2, 14, 0.75), spiral(44, 2.4, 10, 0.82), spiral(30, 2.6, 7, 0.9)],
  },
  prince_of_persia: {
    id: "prince_of_persia", box: { w: 128, h: 128 }, label_ko: "바사 왕국의 군주",
    items: [
      { op: "path", fill: SMOKE, fillAlpha: 0.85, d: [["M", 52, 40], ["L", 76, 40], ["L", 112, 120], ["L", 16, 120],
        ["Z"]] },
      { op: "circle", cx: 64, cy: 34, r: 13, fill: SMOKE, fillAlpha: 0.9 },
      { op: "poly", points: [46, 24, 46, 8, 52, 18, 58, 4, 64, 16, 70, 4, 76, 18, 82, 8, 82, 24], fill: SMOKE,
        fillAlpha: 0.9 },
    ],
  },
  abaddon: {
    id: "abaddon", box: { w: 128, h: 128 }, label_ko: "아바돈 / 아볼루온",
    items: Array.from({ length: 30 }, (_, i) => {
      // 셰브론 30개가 뭉친 타원 (황금각 배치 — 결정론적)
      const r = Math.sqrt((i + 0.5) / 30);
      const a = i * 2.39996;
      return chevron(64 + 50 * r * Math.cos(a), 64 + 34 * r * Math.sin(a), 1.6, 0.75 + (i % 4) * 0.05);
    }),
  },
  jezebel: {
    id: "jezebel", box: { w: 128, h: 128 }, label_ko: "이세벨의 영",
    items: [
      // 긴 머리 뒷모습 — 얼굴 없음
      { op: "path", fill: SMOKE, fillAlpha: 0.85, d: [["M", 64, 22], ["C", 92, 22, 92, 60, 96, 118], ["L", 32, 118],
        ["C", 36, 60, 36, 22, 64, 22], ["Z"]] },
      // 비틀린 왕관
      { op: "group", ox: 64, oy: 22, rotate: -12, items: [{ op: "poly", points: [44, 26, 46, 8, 54, 18, 62, 4, 68, 17,
        78, 6, 84, 24], fill: SMOKE, fillAlpha: 0.9 }] },
    ],
  },
  wickedness: {
    id: "wickedness", box: { w: 128, h: 128 }, label_ko: "악 (에바 속의 여인)",
    // 에바(뚜껑 있는 둥근 바구니, 폭 70) + 납 뚜껑 원판 #9A9AA2 — 사람 형상은 그리지 않음 (Zechariah 5:7~8)
    items: [
      { op: "path", fill: SMOKE, fillAlpha: 0.88, d: [["M", 29, 58], ["L", 99, 58], ["Q", 98, 112, 64, 112], ["Q", 30,
        112, 29, 58], ["Z"]] },
      ...[72, 86, 100].map((y) => ({ op: "path", d: [["M", 32, y], ["Q", 64, y + 6, 96, y]], stroke: { width: 2,
        color: "#8E2A5A", alpha: 0.5 } })),
      { op: "ellipse", cx: 64, cy: 50, rx: 38, ry: 9, fill: "#9A9AA2" },
      { op: "ellipse", cx: 64, cy: 47, rx: 30, ry: 5, fill: "#5C5C63", fillAlpha: 0.5 },
    ],
  },
  babylon: {
    id: "babylon", box: { w: 128, h: 128 }, label_ko: "큰 음녀 바벨론",
    // 금잔 실루엣 — Revelation 17:4
    items: [
      { op: "path", fill: SMOKE, fillAlpha: 0.9, stroke: { width: 3, color: "#A9801F" }, d: [["M", 30, 18], ["L", 98,
        18], ["Q", 98, 70, 68, 78], ["L", 68, 100], ["L", 88, 112], ["L", 40, 112], ["L", 60, 100], ["L", 60, 78],
        ["Q", 30, 70, 30, 18], ["Z"]] },
    ],
  },
  satan_angel_of_light: {
    // 처음 disguiseMs는 천사 wings_light와 같은 모양(색 #CFE3FF) → 금 8개 → 반전 #3B0F2E/#8E2A5A (spirit-fx가 재색칠)
    id: "satan_angel_of_light", box: { w: 192, h: 192 }, label_ko: "광명의 천사로 가장한 사탄", ref: "wings_light",
    disguise: { "#DCE8FF": "#CFE3FF", "#FFF8E7": "#CFE3FF", "#FFFFFF": "#CFE3FF" },
    inverted: { "#DCE8FF": "#3B0F2E", "#FFF8E7": "#3B0F2E", "#FFFFFF": "#8E2A5A" },
    cracks: [[60, 60, 40, 90], [52, 70, 28, 64], [70, 96, 44, 120], [40, 104, 22, 96], [132, 60, 152, 90], [140, 70,
      164, 64], [122, 96, 148, 120], [152, 104, 170, 96]],
    items: [],
  },
  dragon: {
    id: "dragon", box: { w: 960, h: 300 }, label_ko: "루시퍼 / 용 / 옛 뱀 / 사탄",
    items: dragonBody(),
  },
});
