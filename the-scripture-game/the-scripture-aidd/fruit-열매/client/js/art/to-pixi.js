// to-pixi.js — 그리기 명령 → Pixi Graphics·텍스처 굽기(48·64·96·128)만
// TASK-044-1 | REQ-013 FR-049 C-007 | ARCH-004 | design-vision §2.13 머리말 (128 상자 좌표 → Pixi Graphics → generateTexture)
// 그리기 명령 형식 (shapes-*.js가 데이터로 만든다, 좌표 = 그림의 상자 단위):
//   { op: "circle", cx, cy, r } · { op: "ellipse", cx, cy, rx, ry } · { op: "rect", x, y, w, h, r? }
//   { op: "poly", points: [x, y, ...] } · { op: "path", d: [["M",x,y],["L",x,y],["Q",cx,cy,x,y],["C",..6],["Z"]] }
//   { op: "group", name?, x?, y?, ox?, oy?, rotate? (도), scale?, alpha?, items: [...] }
//   { op: "use", shape, x, y, size } — 다른 그림을 (x, y) 가운데에 size 크기로
//   공통 스타일: fill ("#RRGGBB" | { linear: [x0,y0,x1,y1] | radial: [cx,cy,r], stops: [[offset, color, alpha?]] }),
//   fillAlpha, stroke { width, color, alpha?, cap?, join? } ("currentColor"는 호출자가 준 색)
import { Color, Container, FillGradient, Graphics, Rectangle } from "pixi.js";

/** design-vision §2.13 머리말 — 크기별 텍스처 */
export const BAKE_SIZES = Object.freeze([48, 64, 96, 128]);

/**
 * @typedef {{ id: string, box: { w: number, h: number }, label_ko?: string, items: any[] }} Shape
 * @typedef {{ currentColor?: string, recolor?: Record<string, string> }} DrawOptions
 */

/** @param {string} color @param {DrawOptions} opts */
function resolveColor(color, opts) {
  if (color === "currentColor") return opts.currentColor ?? "#F4EFE3";
  return opts.recolor?.[color.toUpperCase()] ?? color;
}

/** @param {any} fill @param {number} alpha @param {DrawOptions} opts */
function toFillStyle(fill, alpha, opts) {
  if (typeof fill === "string") return { color: resolveColor(fill, opts), alpha };
  const colorStops = fill.stops.map(([offset, color, a = 1]) => ({
    offset,
    color: new Color(resolveColor(color, opts)).setAlpha(a * alpha).toHexa(),
  }));
  const gradient = fill.linear
    ? new FillGradient({
      type: "linear", start: { x: fill.linear[0], y: fill.linear[1] }, end: { x: fill.linear[2], y: fill.linear[3] },
      colorStops, textureSpace: "global",
    })
    : new FillGradient({
      type: "radial", center: { x: fill.radial[0], y: fill.radial[1] }, innerRadius: 0,
      outerCenter: { x: fill.radial[0], y: fill.radial[1] }, outerRadius: fill.radial[2], colorStops,
      textureSpace: "global",
    });
  return { fill: gradient };
}

/** 경로 하나를 Graphics에 그리고 스타일을 칠한다 @param {Graphics} g @param {any} it @param {DrawOptions} opts */
function drawPrimitive(g, it, opts) {
  switch (it.op) {
    case "circle": g.circle(it.cx, it.cy, it.r); break;
    case "ellipse": g.ellipse(it.cx, it.cy, it.rx, it.ry); break;
    case "rect": if (it.r) g.roundRect(it.x, it.y, it.w, it.h, it.r); else g.rect(it.x, it.y, it.w, it.h); break;
    case "poly": g.poly(it.points, true); break;
    case "path":
      for (const seg of it.d) {
        const [cmd, ...a] = seg;
        if (cmd === "M") g.moveTo(a[0], a[1]);
        else if (cmd === "L") g.lineTo(a[0], a[1]);
        else if (cmd === "Q") g.quadraticCurveTo(a[0], a[1], a[2], a[3]);
        else if (cmd === "C") g.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
        else if (cmd === "Z") g.closePath();
      }
      break;
    default: throw new Error(`알 수 없는 그리기 명령 ${it.op}`);
  }
  if (it.fill) {
    const style = toFillStyle(it.fill, it.fillAlpha ?? 1, opts);
    if (style.fill) g.fill(style.fill);
    else g.fill(style);
  }
  if (it.stroke) {
    const s = it.stroke;
    g.stroke({
      width: s.width, color: resolveColor(s.color, opts), alpha: s.alpha ?? 1,
      cap: s.cap ?? "round", join: s.join ?? "round",
    });
  }
}

/**
 * 명령 목록 → 컨테이너(이름 있는 group은 label로 찾을 수 있음 — holy-fx가 바퀴·숯불을 움직임).
 * @param {any[]} items @param {DrawOptions} opts @returns {Container}
 */
function buildItems(items, opts) {
  const root = new Container();
  /** @type {Graphics | null} */ let g = null;
  for (const it of items) {
    if (it.op === "group" || it.op === "use") {
      g = null;
      const child = it.op === "group" ? buildItems(it.items, opts) : buildShape(it.shape, it.size, opts);
      if (it.op === "group") {
        child.label = it.name ?? "";
        child.pivot.set(it.ox ?? 0, it.oy ?? 0);
        child.position.set(it.x ?? it.ox ?? 0, it.y ?? it.oy ?? 0);
        child.rotation = ((it.rotate ?? 0) * Math.PI) / 180;
        child.scale.set(it.scale ?? 1);
      } else {
        child.position.set(it.x - it.size / 2, it.y - it.size / 2);
      }
      child.alpha = it.alpha ?? 1;
      root.addChild(child);
      continue;
    }
    if (!g) {
      g = new Graphics();
      root.addChild(g);
    }
    drawPrimitive(g, it, opts);
  }
  return root;
}

/**
 * 그림 1개를 size px(상자의 긴 변 기준) 크기 컨테이너로 — 실시간 애니메이션이 필요한 그림(천사·예수님 빛)용.
 * @param {Shape} shape @param {number} size @param {DrawOptions} [opts] @returns {Container}
 */
export function buildShape(shape, size, opts = {}) {
  const k = size / Math.max(shape.box.w, shape.box.h);
  const outer = new Container({ label: shape.id });
  const inner = buildItems(shape.items, opts);
  inner.scale.set(k);
  // 긴 변이 아닌 쪽은 가운데 정렬
  inner.position.set((size - shape.box.w * k) / 2, (size - shape.box.h * k) / 2);
  outer.addChild(inner);
  return outer;
}

/**
 * 텍스처 굽기 캐시 (NFR-001 — 자주 쓰는 모양은 시작 시 1회). renderer는 Pixi 렌더러.
 * @param {any} renderer
 */
export function createArtBaker(renderer) {
  /** @type {Map<string, any>} */
  const cache = new Map();
  return {
    /**
     * @param {Shape} shape @param {number} size 48·64·96·128 (그 밖이면 그보다 큰 가장 작은 크기로)
     * @param {DrawOptions & { key?: string }} [opts]
     */
    bake(shape, size, opts = {}) {
      const bakeSize = BAKE_SIZES.find((s) => s >= size) ?? BAKE_SIZES[BAKE_SIZES.length - 1];
      const key = `${shape.id}@${bakeSize}${opts.key ? `#${opts.key}` : ""}`;
      let tex = cache.get(key);
      if (!tex) {
        const c = buildShape(shape, bakeSize, opts);
        try {
          // 상자 전체를 틀로 — 그림이 상자를 다 채우지 않아도 가운데 정렬이 유지된다
          tex = renderer.generateTexture({
            target: c, frame: new Rectangle(0, 0, bakeSize, bakeSize), antialias: true, resolution: 2,
          });
        } finally {
          c.destroy({ children: true });
        }
        cache.set(key, tex);
      }
      return tex;
    },
    destroy() {
      for (const t of cache.values()) t.destroy(true);
      cache.clear();
    },
  };
}
