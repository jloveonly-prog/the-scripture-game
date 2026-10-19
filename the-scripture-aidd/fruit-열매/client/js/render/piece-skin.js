// TASK-040-1 · FR-048 · FR-044~046 · NFR-001 · D3-02 — 색 토큰(design-vision §2.1~§2.4)과 블록 유리 질감 텍스처 생성·캐시 (§2.7).
// 고정 블록은 텍스처에 구운 발광만 쓴다 (실시간 필터 없음). 셀 크기별 1회 생성 후 캐시, 창 크기 변경 시 다시 만든다 (§5.2).
import { Texture } from 'pixi.js';
import { CELL, ARMOR_CELL_CODES, ARMOR_IDS } from '../net/protocol.js';

/** design-vision §2.1·§2.2·§2.4 색 토큰 (0xRRGGBB) */
export const COLORS = Object.freeze({
  bgAbyss: 0x07080f, bgNight: 0x0e1020, bgPanel: 0x161a2e, bgPanelRaised: 0x1f2440, boardWell: 0x0a0c18, boardGrid: 0x1c2138,
  lineSubtle: 0x2c3254, lineStrong: 0x6e78ac, skyGlow: 0x22305e, cloud: 0x2a2f4a, hitTint: 0x8b1e2d,
  textPrimary: 0xf5f0e1, lightGold: 0xf2c14e, lightGoldBright: 0xffe08a, lightWhite: 0xffffff, danger: 0xff6b78,
  warning: 0xffb547, correct: 0x7be3a5, seal: 0xb49bff, grace: 0xfff4d6,
  spiritSmoke: 0x120a16, spiritEmber: 0xb0303f, angelCore: 0xffffff, angelHalo: 0xffe9a8, seraphFire: 0xff9a3c,
  jesusLight: 0xfffdf5, projectileTail: 0xffe08a, projectileHead: 0xffffff,
  blockBlueSky: 0x4fb3ff, blockGold: 0xf4c430, blockPurple: 0xa35cf0, blockSilver: 0xc7d0dc, blockScarlet: 0xe5404f,
  blockBlueDeep: 0x3b5fe0, blockScarletLight: 0xf27a45, cellGarbage: 0x636a80, cellLead: 0x7d838f, cellWord: 0xfff6d0,
  cellJericho: 0xe8c99b, cellManna: 0xf4f1e6, cellArmor: 0xdce3ee,
});

/** design-vision §2.3 셀 코드(CODE-009) → 색 */
export const CELL_COLORS = Object.freeze({
  [CELL.I]: COLORS.blockBlueSky, [CELL.O]: COLORS.blockGold, [CELL.T]: COLORS.blockPurple, [CELL.S]: COLORS.blockSilver,
  [CELL.Z]: COLORS.blockScarlet, [CELL.J]: COLORS.blockBlueDeep, [CELL.L]: COLORS.blockScarletLight,
  [CELL.GARBAGE]: COLORS.cellGarbage, [CELL.LEAD]: COLORS.cellLead, [CELL.WORD]: COLORS.cellWord,
  [CELL.JERICHO]: COLORS.cellJericho, [CELL.MANNA]: COLORS.cellManna,
  ...Object.fromEntries(ARMOR_CELL_CODES.map((code) => [code, COLORS.cellArmor])),
});

/** heroes.json emblem.palette 접미사(D4-07) → 블록 토큰 */
export const PALETTE_COLORS = Object.freeze({
  gold: COLORS.blockGold, 'blue-sky': COLORS.blockBlueSky, purple: COLORS.blockPurple, silver: COLORS.blockSilver,
  'blue-deep': COLORS.blockBlueDeep, scarlet: COLORS.blockScarlet,
});

const SKIN = Object.freeze({ baseCell: 30, radius: 3, glowMargin: 4, highlightAlpha: 0.45, highlightRatio: 0.45, glowAlpha: 0.35,
  edgeShade: -0.25, innerLight: 0.3, edgePx: 1.5, leadBorderPx: 2 });

// FR-048 셀 코드 → 색 (빈칸·알 수 없는 코드는 null)
export function cellColor(code) {
  return CELL_COLORS[code] ?? null;
}

/** 0xRRGGBB → 'rgba(r,g,b,a)' */
export function toCss(color, alpha = 1) {
  return `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;
}

// FR-048 명도 조정 — pct < 0 이면 어둡게(L × (1+pct)), > 0 이면 밝게(L + (1−L) × pct) (HSL 명도)
export function shadeColor(color, pct) {
  const r = ((color >> 16) & 255) / 255;
  const g = ((color >> 8) & 255) / 255;
  const b = (color & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l2 = Math.min(1, Math.max(0, pct < 0 ? l * (1 + pct) : l + (1 - l) * pct));
  const c = (1 - Math.abs(2 * l2 - 1)) * s;
  const x = c * (1 - Math.abs((h % 2 + 2) % 2 - 1));
  const m = l2 - c / 2;
  const [r1, g1, b1] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round(Math.min(1, Math.max(0, v + m)) * 255);
  return (to(r1) << 16) | (to(g1) << 8) | to(b1);
}

// design-vision §2.6·§2.7 셀 크기 비례 값 (30px 기준 모서리 3px, 발광 여백 4px)
export function skinMetrics(cellSize) {
  const k = cellSize / SKIN.baseCell;
  return { radius: Math.max(1, SKIN.radius * k), margin: Math.max(2, Math.round(SKIN.glowMargin * k)) };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlass(ctx, color, s, m, r) {
  ctx.save();
  ctx.shadowColor = toCss(color, SKIN.glowAlpha);
  ctx.shadowBlur = m * 2;
  roundRect(ctx, m, m, s, s, r);
  ctx.fillStyle = toCss(color);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, m, m, s, s, r);
  ctx.clip();
  const hl = ctx.createLinearGradient(m, m, m + s, m + s * SKIN.highlightRatio);
  hl.addColorStop(0, `rgba(255,255,255,${SKIN.highlightAlpha})`);
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(m, m, s, s * SKIN.highlightRatio);
  ctx.strokeStyle = toCss(shadeColor(color, SKIN.edgeShade));
  ctx.lineWidth = SKIN.edgePx;
  ctx.beginPath();
  ctx.moveTo(m + s - SKIN.edgePx / 2, m);
  ctx.lineTo(m + s - SKIN.edgePx / 2, m + s - SKIN.edgePx / 2);
  ctx.lineTo(m, m + s - SKIN.edgePx / 2);
  ctx.stroke();
  ctx.restore();
  roundRect(ctx, m + 0.5, m + 0.5, s - 1, s - 1, r);
  ctx.strokeStyle = toCss(shadeColor(color, SKIN.innerLight));
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMatte(ctx, color, s, m, r, lead) {
  roundRect(ctx, m, m, s, s, r);
  ctx.fillStyle = toCss(color);
  ctx.fill();
  ctx.strokeStyle = toCss(shadeColor(color, SKIN.edgeShade));
  ctx.lineWidth = lead ? SKIN.leadBorderPx : 1;
  ctx.stroke();
  ctx.beginPath();
  if (lead) {
    for (let i = 1; i <= 3; i += 1) {
      ctx.moveTo(m + s * 0.15, m + (s * i) / 4);
      ctx.lineTo(m + s * 0.85, m + (s * i) / 4);
    }
  } else {
    ctx.moveTo(m + s * 0.2, m + s * 0.2);
    ctx.lineTo(m + s * 0.45, m + s * 0.5);
    ctx.lineTo(m + s * 0.8, m + s * 0.8);
  }
  ctx.strokeStyle = toCss(shadeColor(color, -0.4));
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** 특수 칸 문양 (design-vision §2.3 셀별 표식) — 0~1 단위 좌표를 셀 크기로 변환 */
function drawMarker(ctx, code, s, m) {
  const P = (u) => m + u * s;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (code === CELL.WORD) {
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? 0.36 : 0.12;
      ctx.lineTo(P(0.5 + Math.cos(a) * rr), P(0.5 + Math.sin(a) * rr));
    }
    ctx.closePath();
    ctx.fillStyle = toCss(COLORS.lightGoldBright);
    ctx.fill();
  } else if (code === CELL.JERICHO) {
    ctx.beginPath();
    ctx.moveTo(P(0.2), P(0.7));
    ctx.quadraticCurveTo(P(0.5), P(0.75), P(0.78), P(0.25));
    ctx.lineTo(P(0.86), P(0.35));
    ctx.strokeStyle = toCss(shadeColor(COLORS.cellJericho, -0.55));
    ctx.lineWidth = Math.max(1.5, s * 0.1);
    ctx.stroke();
  } else if (code === CELL.MANNA) {
    ctx.fillStyle = '#ffffff';
    for (const [u, v] of [[0.3, 0.3], [0.7, 0.32], [0.5, 0.52], [0.3, 0.72], [0.7, 0.7]]) {
      ctx.beginPath();
      ctx.arc(P(u), P(v), Math.max(1, s * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const idx = ARMOR_CELL_CODES.indexOf(code);
    if (idx >= 0) drawArmorCrest(ctx, ARMOR_IDS[idx], P, s);
  }
  ctx.restore();
}

/** 방패형 은테 + 갑주별 금 문장 (허리띠·흉배·신·방패·투구·검) */
function drawArmorCrest(ctx, armorId, P, s) {
  ctx.beginPath();
  ctx.moveTo(P(0.2), P(0.18));
  ctx.lineTo(P(0.8), P(0.18));
  ctx.quadraticCurveTo(P(0.8), P(0.7), P(0.5), P(0.86));
  ctx.quadraticCurveTo(P(0.2), P(0.7), P(0.2), P(0.18));
  ctx.strokeStyle = toCss(COLORS.blockSilver);
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.stroke();
  ctx.fillStyle = toCss(COLORS.lightGold);
  ctx.strokeStyle = toCss(COLORS.lightGold);
  ctx.beginPath();
  if (armorId === 'belt_of_truth') ctx.rect(P(0.28), P(0.42), s * 0.44, s * 0.1);
  else if (armorId === 'breastplate_of_righteousness') ctx.rect(P(0.34), P(0.32), s * 0.32, s * 0.3);
  else if (armorId === 'gospel_shoes') { ctx.moveTo(P(0.36), P(0.3)); ctx.lineTo(P(0.36), P(0.6)); ctx.lineTo(P(0.66), P(0.6)); ctx.lineTo(P(0.5), P(0.5)); ctx.lineTo(P(0.46), P(0.3)); }
  else if (armorId === 'shield_of_faith') ctx.arc(P(0.5), P(0.45), s * 0.16, 0, Math.PI * 2);
  else if (armorId === 'helmet_of_salvation') { ctx.arc(P(0.5), P(0.5), s * 0.17, Math.PI, 0); ctx.lineTo(P(0.67), P(0.6)); ctx.lineTo(P(0.33), P(0.6)); }
  else { ctx.rect(P(0.47), P(0.26), s * 0.06, s * 0.42); ctx.rect(P(0.38), P(0.56), s * 0.24, s * 0.05); }
  ctx.closePath();
  ctx.fill();
}

// FR-048 · FR-044~046 셀 한 칸 텍스처를 캔버스에 그린다 (셀 + 사방 발광 여백)
export function paintCellCanvas(code, cellSize, doc = globalThis.document) {
  const color = cellColor(code);
  if (color === null) throw new RangeError(`piece-skin: 알 수 없는 셀 코드 ${code}`);
  const { radius, margin } = skinMetrics(cellSize);
  const canvas = doc.createElement('canvas');
  canvas.width = cellSize + margin * 2;
  canvas.height = cellSize + margin * 2;
  const ctx = canvas.getContext('2d');
  if (code === CELL.GARBAGE || code === CELL.LEAD) drawMatte(ctx, color, cellSize, margin, radius, code === CELL.LEAD);
  else drawGlass(ctx, color, cellSize, margin, radius);
  if (code >= CELL.WORD) drawMarker(ctx, code, cellSize, margin);
  return canvas;
}

// NFR-001 텍스처 캐시 — (셀 코드, 셀 크기)마다 1회 생성. makeTexture 주입(테스트)
export function createSkinCache({ makeTexture = (canvas) => Texture.from(canvas) } = {}) {
  const cache = new Map();
  return {
    getTexture(code, cellSize) {
      const key = `${code}@${cellSize}`;
      let tex = cache.get(key);
      if (!tex) {
        tex = makeTexture(paintCellCanvas(code, cellSize));
        cache.set(key, tex);
      }
      return tex;
    },
    margin: (cellSize) => skinMetrics(cellSize).margin,
    /** §5.2 창 크기 변경 — 캐시를 비우고 옛 텍스처 목록을 돌려준다 (그리기에서 빠진 뒤 호출 쪽이 폐기) */
    retire() {
      const old = [...cache.values()];
      cache.clear();
      return old;
    },
    /** §5.2 창 크기 변경 → 옛 셀 크기 텍스처 폐기 */
    clear() {
      for (const tex of cache.values()) tex.destroy?.(true);
      cache.clear();
    },
  };
}
