// to-svg.js — 그리기 명령 → 인라인 SVG 문자열만
// TASK-044-1 | REQ-013 FR-049 FR-013 C-007 | ARCH-004 | design-vision §2.13 머리말 ("DOM 버튼 안의 같은 그림은 같은 좌표의 인라인 SVG")
// 명령 형식은 to-pixi.js 머리 주석과 같다. 발광(Glow)은 Pixi 필터라 SVG에는 없다(DOM은 CSS 발광 — §2.5).

let gradientSeq = 0;

/** @param {number} n */
const num = (n) => String(Math.round(n * 100) / 100);

/** @param {string} text */
function esc(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch]);
}

/** @param {any} fill @param {string[]} defs */
function fillAttr(fill, defs) {
  if (typeof fill === "string") return fill;
  gradientSeq += 1;
  const id = `swtg${gradientSeq}`;
  const stops = fill.stops.map(([o, c,
    a = 1]) => `<stop offset="${num(o)}" stop-color="${c}" stop-opacity="${num(a)}"/>`)
    .join("");
  if (fill.linear) {
    const [x1, y1, x2, y2] = fill.linear.map(num);
    defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">`
      + `${stops}</linearGradient>`);
  } else {
    const [cx, cy, r] = fill.radial.map(num);
    defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops}`
      + "</radialGradient>");
  }
  return `url(#${id})`;
}

/** @param {any} it @param {string[]} defs */
function styleAttrs(it, defs) {
  let out = it.fill ? ` fill="${fillAttr(it.fill, defs)}"` : ' fill="none"';
  if (it.fill && it.fillAlpha !== undefined) out += ` fill-opacity="${num(it.fillAlpha)}"`;
  if (it.stroke) {
    const s = it.stroke;
    out += ` stroke="${s.color}" stroke-width="${num(s.width)}" stroke-linecap="${s.cap ?? "round"}"`
      + ` stroke-linejoin="${s.join ?? "round"}"`;
    if (s.alpha !== undefined) out += ` stroke-opacity="${num(s.alpha)}"`;
  }
  return out;
}

/** @param {any[]} items @param {string[]} defs @returns {string} */
function itemsToSvg(items, defs) {
  let out = "";
  for (const it of items) {
    switch (it.op) {
      case "circle":
        out += `<circle cx="${num(it.cx)}" cy="${num(it.cy)}" r="${num(it.r)}"${styleAttrs(it, defs)}/>`;
        break;
      case "ellipse":
        out += `<ellipse cx="${num(it.cx)}" cy="${num(it.cy)}" rx="${num(it.rx)}" ry="${num(it.ry)}"`
          + `${styleAttrs(it, defs)}/>`;
        break;
      case "rect":
        out += `<rect x="${num(it.x)}" y="${num(it.y)}" width="${num(it.w)}" height="${num(it.h)}"`
          + `${it.r ? ` rx="${num(it.r)}"` : ""}${styleAttrs(it, defs)}/>`;
        break;
      case "poly":
        out += `<polygon points="${it.points.map(num).join(" ")}"${styleAttrs(it, defs)}/>`;
        break;
      case "path":
        out += `<path d="${it.d.map(([c, ...a]) => c + a.map(num).join(" ")).join(" ")}"${styleAttrs(it, defs)}/>`;
        break;
      case "group": {
        const ox = it.ox ?? 0;
        const oy = it.oy ?? 0;
        // to-pixi와 같은 변환: 점 p → (x, y) + 회전·배율 × (p − 피벗)
        const t = `translate(${num(it.x ?? ox)} ${num(it.y ?? oy)}) rotate(${num(it.rotate ?? 0)}) `
          + `scale(${num(it.scale ?? 1)}) translate(${num(-ox)} ${num(-oy)})`;
        out += `<g transform="${t}"${it.alpha !== undefined ? ` opacity="${num(it.alpha)}"` : ""}>`
          + `${itemsToSvg(it.items, defs)}</g>`;
        break;
      }
      case "use": {
        const sh = it.shape;
        const k = it.size / Math.max(sh.box.w, sh.box.h);
        const t = `translate(${num(it.x - (sh.box.w * k) / 2)} ${num(it.y - (sh.box.h * k) / 2)}) scale(${num(k)})`;
        out += `<g transform="${t}">${itemsToSvg(sh.items, defs)}</g>`;
        break;
      }
      default:
        throw new Error(`알 수 없는 그리기 명령 ${it.op}`);
    }
  }
  return out;
}

/**
 * 그림 → 인라인 SVG 문자열 (§6.1 1.1.1: 이름이 있으면 role="img" + aria-label, 없으면 장식 aria-hidden).
 * @param {{ id: string, box: { w: number, h: number }, items: any[] }} shape
 * @param {number} size 표시 크기 px (긴 변)
 * @param {{ label?: string, className?: string }} [opts]
 * @returns {string}
 */
export function toSvg(shape, size, opts = {}) {
  /** @type {string[]} */
  const defs = [];
  const body = itemsToSvg(shape.items, defs);
  const k = size / Math.max(shape.box.w, shape.box.h);
  const a11y = opts.label ? ` role="img" aria-label="${esc(opts.label)}"` : ' aria-hidden="true"';
  const cls = opts.className ? ` class="${esc(opts.className)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(shape.box.w * k)}" height="${num(shape.box.h * k)}"`
    + ` viewBox="0 0 ${shape.box.w} ${shape.box.h}"${a11y}${cls} focusable="false">`
    + `${defs.length ? `<defs>${defs.join("")}</defs>` : ""}${body}</svg>`;
}
