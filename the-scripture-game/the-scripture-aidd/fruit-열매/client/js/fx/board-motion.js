// board-motion.js — 보드 칸·활성 블록 모션(이동 보간·회전 잔상·꼬리·궤적·찌그러짐·줄 붕괴·상승·무너짐·강조선)만
// TASK-053 (D-03B 분할 — task-wall §3.4 #29-1) | REQ-013 FR-051 FR-052 FR-053 FR-056 FR-061 | ARCH-005 |
// design-vision §4.6.1 J-01~J-08·§4.6.2 C-01·C-06~C-08·C-12·C-13·§4.6.3 A-05·§4.6.12 M-03
// BoardView(03-A)의 칸 스프라이트 200개·activeContainer를 움직이기만 한다 — 그리기·게임 상태는 바꾸지 않는다.
// 보드마다 잔상 스프라이트 4개·그래픽 3개를 한 번 만들어 재사용(이벤트마다 생성 0). 시간은 pixi.animate(히트스톱에 멈춤).
import { Container, FillGradient, Graphics, Sprite } from "pixi.js";
import { cellCode, pieceCells } from "../engine/piece.js";
import { BLOCK_COLORS } from "../render/block-textures.js";

const DEG = Math.PI / 180;
/** @type {WeakMap<any, any>} */ const memo = new WeakMap();

/** 보드별 재사용 그래픽 @param {any} b BoardView */
function S(b) {
  let s = memo.get(b);
  if (!s) {
    const ghost = new Container({ label: "afterimage" });
    const sprites = Array.from({ length: 4 }, () => {
      const sp = new Sprite();
      sp.anchor.set(0.5);
      ghost.addChild(sp);
      return sp;
    });
    ghost.visible = false;
    const tail = new Graphics();
    const lines = new Graphics();
    const ring = new Graphics();
    ring.alpha = 0;
    b.layers.active.addChildAt(ghost, 0);
    b.layers.fx.addChild(tail, lines, ring);
    s = { ghost, sprites, tail, lines, ring, tw: {} };
    memo.set(b, s);
  }
  return s;
}
/** 같은 종류의 이전 트윈 취소 후 새 트윈 @param {any} s @param {string} key @param {any} h */
function own(s, key, h) {
  s.tw[key]?.cancel();
  s.tw[key] = h;
  return h;
}

/** J-01 이동 보간: 이전 칸 → 새 칸 x (setActive 직후 호출) @param {number} dx 칸 수(새−이전) */
export function slideActive(pixi, b, dx, ms) {
  const c = b.activeContainer;
  const base = c.x;
  if (ms <= 0) return;
  own(S(b), "move", pixi.animate(ms, (k) => { c.x = base - dx * b.cell * (1 - k); }, { ease: "power2.out" }));
}
/** J-01b 막힘: 막힌 방향 3px 밀렸다 돌아옴 80ms @param {number} dir */
export function bumpActive(pixi, b, dir) {
  const c = b.activeContainer;
  const base = c.x;
  own(S(b), "move", pixi.animate(80, (k) => { c.x = base + dir * 3 * Math.sin(k * Math.PI); }, { ease: "power2.out" }));
}
/** J-02 새 상태 rotation ±12°→0 90ms back.out(2) / J-03 ±4° 2번 왕복 100ms @param {"spin" | "wobble"} kind */
export function turnActive(pixi, b, kind, dir = 1) {
  const c = b.activeContainer;
  if (kind === "spin") {
    own(S(b), "rot", pixi.animate(90, (k) => { c.rotation = -dir * 12 * DEG * (1 - k); }, { ease: "back.out(2)" }));
  } else {
    own(S(b), "rot", pixi.animate(100, (k) => { c.rotation = 4 * DEG * Math.sin(k * 4 * Math.PI); }, { ease: "none",
      onComplete: () => { c.rotation = 0; } }));
  }
}

/**
 * 블록 잔상 (J-02 회전 잔상 0.45→0·scale 1→1.06 120ms / J-07 홀드 상자로 날아감 / C-10 T 칸 발광)
 * @param {{ piece: any, alpha?: number, scaleTo?: number, ms?: number, ease?: string, to?: {x:number,y:number},
 *   glow?: (c: any) => any }} o to = 보드 지역 좌표 목적지
 */
export function afterimage(pixi, b, o) {
  const s = S(b);
  const cells = pieceCells(o.piece);
  const code = cellCode(o.piece.type);
  let cx = 0;
  let cy = 0;
  s.sprites.forEach((sp, i) => {
    const cell = cells[i];
    sp.visible = !!cell && cell[1] >= 0;
    if (!sp.visible) return;
    sp.texture = b.o.textures.block(code, b.cell);
    sp.position.set((cell[0] + 0.5) * b.cell, (cell[1] + 0.5) * b.cell);
    cx += sp.x / cells.length;
    cy += sp.y / cells.length;
  });
  const g = s.ghost;
  g.visible = true;
  g.pivot.set(cx, cy);
  g.position.set(cx, cy);
  const a0 = o.alpha ?? 0.45;
  const glow = o.glow?.(g);
  own(s, "ghost", pixi.animate(o.ms ?? 120, (k) => {
    g.alpha = a0 * (1 - k);
    g.scale.set(1 + ((o.scaleTo ?? 1.06) - 1) * k);
    if (o.to) g.position.set(cx + (o.to.x - cx) * k, cy + (o.to.y - cy) * k);
  }, { ease: o.ease ?? "power2.out", onComplete: () => { g.visible = false; glow?.release(); } }));
}

/** J-04 소프트 드롭 꼬리: 블록 위 2칸 길이(밝은 면 색 0.2→0) 120ms 소멸 @param {any} piece */
export function softTail(pixi, b, piece) {
  const s = S(b);
  const k = b.cell;
  const light = BLOCK_COLORS[cellCode(piece.type)].light;
  const g = s.tail.clear();
  const tops = new Map();
  for (const [x, y] of pieceCells(piece)) tops.set(x, Math.min(tops.get(x) ?? 99, y));
  for (const [x, y] of tops) if (y > 0) g.rect(x * k + 2, Math.max(0, y - 2) * k, k - 4, Math.min(2, y) * k);
  g.fill({ color: light, alpha: 0.2 });
  own(s, "tail", pixi.animate(120, (t) => { g.alpha = 1 - t; }, { ease: "power2.out" }));
}

/** J-05 낙하 궤적: 시작~착지 블록 폭 세로 빛줄기(밝은 면 색 → 위로 옅어짐) 투명도 alpha→0 220ms @param {number} alpha */
export function dropTrail(pixi, b, from, to, alpha) {
  const s = S(b);
  const k = b.cell;
  const cells = pieceCells(to);
  const xs = cells.map(([x]) => x);
  const top = Math.max(0, Math.min(...pieceCells(from).map(([, y]) => y)));
  const bottom = Math.min(...cells.map(([, y]) => y));
  if (bottom <= top) return;
  const light = BLOCK_COLORS[cellCode(to.type)].light;
  const grad = new FillGradient({ type: "linear", start: { x: 0, y: top * k }, end: { x: 0, y: bottom * k },
    textureSpace: "global", colorStops: [{ offset: 0, color: "rgba(255,255,255,0)" }, { offset: 1, color: light }] });
  const g = s.tail.clear();
  g.rect(Math.min(...xs) * k, top * k, (Math.max(...xs) - Math.min(...xs) + 1) * k, (bottom - top) * k).fill(grad);
  own(s, "tail", pixi.animate(220, (t) => { g.alpha = alpha * (1 - t); }, { ease: "power2.out" }));
}

/** 칸 scaleY 변형 (J-05 1.15→1 80ms ease.slam 후 back.out(3) / J-06 0.92→1 80ms back.out(2)) */
export function squash(pixi, b, cells, from, ease) {
  const sprites = cells.filter(([x, y]) => y >= 0).map(([x, y]) => b.cellSprites[y * b.o.cols + x]).filter(Boolean);
  pixi.animate(80, (k) => { for (const sp of sprites) sp.scale.y = from + (1 - from) * k; }, { ease,
    onComplete: () => { for (const sp of sprites) sp.scale.y = 1; } });
}

/**
 * C-01 줄 붕괴 — setCells(새 보드) 뒤 호출. 남은 줄을 지우기 전 자리로 올려 두었다가 delayMs 뒤 120ms power2.in으로 내려옴 +
 * 마지막 4px back.out(3) 60ms @param {number[]} rows 지운 줄(이전 보드 y)
 */
export function collapse(pixi, b, rows, delayMs, overshoot = true) {
  const cols = b.o.cols;
  const cleared = new Set(rows);
  const shift = new Array(b.o.rows).fill(0); // 새 줄 y → 내려온 칸 수
  let n = b.o.rows - 1;
  for (let y = b.o.rows - 1; y >= 0; y -= 1) {
    if (cleared.has(y)) continue;
    shift[n] = n - y;
    n -= 1;
  }
  for (let y = 0; y <= n; y += 1) shift[y] = rows.length; // 새로 생긴 위쪽 빈 줄
  const at = (y, off) => {
    for (let x = 0; x < cols; x += 1) b.cellSprites[y * cols + x].y = (y + 0.5) * b.cell - off;
  };
  for (let y = 0; y < b.o.rows; y += 1) at(y, shift[y] * b.cell);
  const over = (y, k) => (overshoot && shift[y] ? 4 * k : 0);
  pixi.animate(120, (k) => { for (let y = 0; y < b.o.rows; y += 1) at(y, shift[y] * b.cell * (1 - k) - over(y, k)); },
    { delayMs, ease: "power2.in", onComplete: () => {
      pixi.animate(60, (k) => { for (let y = 0; y < b.o.rows; y += 1) at(y,
        overshoot && shift[y] ? -4 * (1 - k) : 0); },
        { ease: "back.out(3)" });
    } });
}

/** A-05 쓰레기 상승: 보드 내용 전체 rows칸 위로 140ms power2.out + 4px 넘침 후 복귀 60ms (setCells 뒤) */
export function rise(pixi, b, rows, overshoot = true) {
  const L = b.layers.cells;
  const from = rows * b.cell;
  L.y = from;
  pixi.animate(140, (k) => { L.y = from * (1 - k) - (overshoot ? 4 * k : 0); }, { ease: "power2.out",
    onComplete: () => pixi.animate(60, (k) => { L.y = overshoot ? -4 * (1 - k) : 0; }) });
}

/**
 * M-03 회색으로 굳음(saturation 1→0·brightness 1→0.7 400ms) → 칸마다 아래로 떨어지며 ±15° 회전·투명도 0 (900ms power2.in,
 * 무작위 지연 0~300ms) / 감소 모드: 투명도 0 페이드 600ms @param {{ fallMs?: number, reduced?: boolean }} o
 */
export function crumble(pixi, filters, b, o = {}) {
  const adj = filters.adjustment(b.root, { saturation: 1, brightness: 1 });
  S(b).adj = adj;
  pixi.animate(400, (k) => { if (adj) Object.assign(adj.filter, { saturation: 1 - k, brightness: 1 - 0.3 * k }); });
  const live = b.cellSprites.filter((sp) => sp.visible);
  if (o.reduced) {
    pixi.animate(600, (k) => { for (const sp of live) sp.alpha = 1 - k; }, { delayMs: 400 });
    return;
  }
  for (const sp of live) {
    const y0 = sp.y;
    const spin = (Math.random() * 2 - 1) * 15 * DEG;
    const fall = b.height - y0 + b.cell * 2;
    pixi.animate(o.fallMs ?? 900, (k) => {
      sp.y = y0 + fall * k;
      sp.rotation = spin * k;
      sp.alpha = 1 - k;
    }, { delayMs: 400 + Math.random() * 300, ease: "power2.in" });
  }
}

/** C-12 줄 외곽선 / C-13 겹친 칸 맥동 (#FF6B6F 2px, 600ms) @param {{ rows?: number[], cells?: number[][] }} o */
export function highlight(pixi, b, o, pulse) {
  const g = S(b).lines.clear();
  const k = b.cell;
  for (const y of o.rows ?? []) g.rect(0, y * k, b.width, k);
  for (const [x, y] of o.cells ?? []) g.rect(x * k, Math.max(0, y) * k, k, k);
  g.stroke({ width: 2, color: 0xff6b6f });
  if (pulse) g.fill({ color: 0xff6b6f, alpha: 0.35 });
  pixi.animate(600, (t) => { g.alpha = pulse ? 0.5 + 0.5 * Math.cos(t * 6 * Math.PI) : 1; }, { ease: "none",
    onComplete: () => g.clear() });
}

/**
 * C-06~C-08 보드 테두리 금 맥동 — once = 1회 / loop = 콤보가 끊길 때까지 0.5초 주기 / off = 끔 (C-09)
 * @param {"once" | "loop" | "off"} mode @param {boolean} ringOut C-08 보드 둘레 빛 고리 확산
 */
export function borderPulse(pixi, b, mode, ringOut = false) {
  const s = S(b);
  const g = s.ring;
  own(s, "pulse", { cancel() {} });
  if (mode === "off") return void (g.alpha = 0);
  g.clear().rect(-4, -4, b.width + 8, b.height + 8).stroke({ width: 4, color: 0xe8b84a });
  const period = mode === "loop" ? 500 : 600;
  own(s, "pulse", pixi.animate(mode === "loop" ? 1e9 : period, (k) => {
    const t = mode === "loop" ? ((k * 1e9) % period) / period : k;
    g.alpha = Math.sin(t * Math.PI);
    g.scale.set(1);
  }, { ease: "none", onComplete: () => { g.alpha = 0; } }));
  if (ringOut) {
    const r = new Graphics().rect(0, 0, b.width, b.height).stroke({ width: 3, color: 0xf6d98b });
    b.layers.fx.addChild(r);
    pixi.animate(400, (k) => {
      r.scale.set(1 + 0.12 * k);
      r.position.set(-b.width * 0.06 * k, -b.height * 0.06 * k);
      r.alpha = 1 - k;
    }, { ease: "power2.out", onComplete: () => r.destroy() });
  }
}

/** 라운드 리셋: 칸 변형·필터·잔상 원상 복구 */
export function resetBoard(b) {
  const s = memo.get(b);
  if (s) {
    for (const h of Object.values(s.tw)) h?.cancel();
    s.tw = {};
    s.adj?.release();
    s.adj = null;
    s.ghost.visible = false;
    s.tail.clear();
    s.lines.clear();
    s.ring.alpha = 0;
  }
  b.layers.cells.y = 0;
  b.activeContainer.rotation = 0;
  b.cellSprites.forEach((sp, i) => {
    sp.position.set(((i % b.o.cols) + 0.5) * b.cell, (Math.floor(i / b.o.cols) + 0.5) * b.cell);
    sp.rotation = 0;
    sp.alpha = 1;
    sp.scale.set(1);
  });
}
