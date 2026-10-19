// board-view.js — 보드 1개 그리기(고정 칸·활성·고스트·힌트·위험선)만 — 내/상대 공용
// TASK-041 | REQ-001 REQ-013 FR-001 FR-003 FR-006 FR-015 FR-035 FR-044~FR-046 FR-048 FR-051 FR-055 | ARCH-004 |
// API-020 | SCR-005 | design-vision §2.3·§2.5·§2.8·§2.11·§4.6.10 X-01·§4.6.11 D-01·§4.9 | RTM §5 DCL-007 ⑤
// 보드마다 컨테이너 1개(root — SHK "보드"·보드 필터 대상) 안에 하위 레이어 zIndex 10·20·25·30·40.
// 칸 스프라이트 200개 재사용, 바뀐 칸만 텍스처 교체(§4.9). 홀드·다음 블록 칸은 piece-preview.js(D-03A 분할).
import { Container, Graphics, Sprite, FillGradient } from "pixi.js";
import { GlowFilter } from "pixi-filters";
import { cellCode, pieceCells } from "../engine/piece.js";
import { BLOCK_COLORS, SPECIAL_GLOW, SPECIAL_KINDS } from "./block-textures.js";
import { LAYER } from "./pixi-app.js";

const TAU = Math.PI * 2;
/** §2.3 맥동 주기 — 말씀 1.4초·갑주 1.2초·착지 힌트 1.2초 / §4.6.11 D-01 심장박동 900·650ms */
const PULSE_MS = { word: 1400, armor: 1200, hint: 1200, crisis: 900, crisisSevere: 650 };

/** 칸 집합의 바깥 테두리 변 목록 (고스트 외곽선·힌트 점선) @param {Array<[number, number]>} cells */
function outlineEdges(cells) {
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const edges = [];
  for (const [x, y] of cells) {
    if (!set.has(`${x},${y - 1}`)) edges.push([x, y, x + 1, y]);
    if (!set.has(`${x + 1},${y}`)) edges.push([x + 1, y, x + 1, y + 1]);
    if (!set.has(`${x},${y + 1}`)) edges.push([x, y + 1, x + 1, y + 1]);
    if (!set.has(`${x - 1},${y}`)) edges.push([x, y, x, y + 1]);
  }
  return edges;
}

/** @param {string} label @param {number} z */
const sub = (label, z) => new Container({ label, zIndex: z });

/**
 * §2.3 특수 칸 덮개 스프라이트 (갑주 칸은 해당 갑주 아이콘 축소 §2.13.4를 얹음) — 보드·미리보기 공용.
 * @param {any} textures createBlockTextures 결과 @param {{ kind: string, armorId?: string }} mark @param {number} size
 * @param {((armorId: string) => any) | undefined} armorIcon
 */
export function specialOverlaySprite(textures, mark, size, armorIcon) {
  const tex = textures.overlay(mark.kind, size);
  if (!tex) return null;
  const c = new Container({ label: `mark:${mark.kind}` });
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  c.addChild(s);
  if (mark.kind === "armor" && mark.armorId && armorIcon) {
    const icon = new Sprite(armorIcon(mark.armorId));
    icon.anchor.set(0.5);
    icon.width = size * 0.78;
    icon.height = size * 0.78;
    c.addChild(icon);
  }
  return c;
}

export class BoardView {
  /**
   * @param {{ textures: ReturnType<typeof import("./block-textures.js").createBlockTextures>,
   *   geometry: { x: number, y: number, cell: number }, cols: number, rows: number, dangerRows: number,
   *   role: "me" | "opponent", armorIcon?: (armorId: string) => any }} o
   *   cols·rows·dangerRows = rules.board.width·height·dangerRows, armorIcon = 갑주 아이콘 텍스처(to-pixi 굽기)
   */
  constructor(o) {
    this.o = o;
    this.cell = o.geometry.cell;
    this.width = o.cols * this.cell;
    this.height = o.rows * this.cell;
    this.reduced = false;
    this.time = 0;
    this.crisis = { active: false, severe: false };
    this.root = new Container({ label: `Board:${o.role}` });
    this.root.sortableChildren = true;
    this.root.position.set(o.geometry.x, o.geometry.y);
    this.layers = {
      frame: sub("BoardFrameLayer", LAYER.BOARD_FRAME), cells: sub("BoardCellLayer", LAYER.BOARD_CELL),
      guide: sub("GuideLayer", LAYER.GUIDE), active: sub("ActivePieceLayer", LAYER.ACTIVE_PIECE),
      fx: sub("BoardFxLayer", LAYER.BOARD_FX),
    };
    this.root.addChild(...Object.values(this.layers));
    this.drawFrame();
    // 칸 스프라이트 200개 (§4.9 재사용) + 특수 칸 덮개는 종류별 컨테이너(GLW-special 필터 1개씩 — 블록마다 필터 0)
    this.cellSprites = [];
    this.prevCells = new Array(o.cols * o.rows).fill(-1);
    for (let i = 0; i < o.cols * o.rows; i += 1) {
      const s = new Sprite();
      s.anchor.set(0.5);
      s.position.set(((i % o.cols) + 0.5) * this.cell, (Math.floor(i / o.cols) + 0.5) * this.cell);
      s.visible = false;
      this.cellSprites.push(s);
      this.layers.cells.addChild(s);
    }
    this.overlayLayers = {};
    for (const kind of SPECIAL_KINDS) {
      const c = new Container({ label: `special:${kind}` });
      this.overlayLayers[kind] = c;
      this.layers.cells.addChild(c);
    }
    this.overlayByIndex = new Map();
    this.ghostG = new Graphics();
    this.hintG = new Graphics();
    this.layers.guide.addChild(this.ghostG, this.hintG);
    this.activeContainer = new Container({ label: "active" });
    this.layers.active.addChild(this.activeContainer);
    this.setQuality("normal");
  }

  /** §2.11 보드 프레임·격자·위험선 + §4.6.11 위기 테두리 */
  drawFrame() {
    const { width: w, height: h, cell } = this;
    const g = new Graphics();
    g.rect(0, 0, w, h).fill(0x0a0814);
    for (let x = 1; x < this.o.cols; x += 1) g.moveTo(x * cell + 0.5, 0).lineTo(x * cell + 0.5, h);
    for (let y = 1; y < this.o.rows; y += 1) g.moveTo(0, y * cell + 0.5).lineTo(w, y * cell + 0.5);
    g.stroke({ width: 1, color: 0x1c1830, alpha: 0.6 });
    // 안쪽 그림자 12px rgba(0,0,0,0.6) — 네 변에서 안으로 옅어짐
    const shade = (x0, y0, x1, y1) => new FillGradient({
      type: "linear", start: { x: x0, y: y0 }, end: { x: x1, y: y1 }, textureSpace: "global",
      colorStops: [{ offset: 0, color: "rgba(0,0,0,0.6)" }, { offset: 1, color: "rgba(0,0,0,0)" }],
    });
    const sh = Math.min(12, cell * 0.6);
    g.rect(0, 0, w, sh).fill(shade(0, 0, 0, sh)).rect(0, h - sh, w, sh).fill(shade(0, h, 0, h - sh));
    g.rect(0, 0, sh, h).fill(shade(0, 0, sh, 0)).rect(w - sh, 0, sh, h).fill(shade(w, 0, w - sh, 0));
    // 바깥 3px 금 테두리 (--g-gold 세로 그라데이션)
    const gold = new FillGradient({
      type: "linear", start: { x: 0, y: -3 }, end: { x: 0, y: h + 3 }, textureSpace: "global",
      colorStops: [{ offset: 0, color: "#F6D98B" }, { offset: 0.55, color: "#E8B84A" }, { offset: 1,
        color: "#A97B1F" }],
    });
    g.rect(-1.5, -1.5, w + 3, h + 3).stroke({ width: 3, fill: gold });
    this.frameG = g;
    // 위험선: 위에서 dangerRows번째 줄 아래 경계, #FF6B6F 2px 점선(8/6), 평소 0.15 · 위기 0.6
    this.dangerG = new Graphics();
    const y = this.o.dangerRows * cell;
    for (let x = 0; x < w; x += 14) this.dangerG.moveTo(x, y).lineTo(Math.min(w, x + 8), y);
    this.dangerG.stroke({ width: 2, color: 0xff6b6f });
    this.dangerG.alpha = 0.15;
    // §4.6.11 D-01 위기 테두리 #E5484D 3px (맥동 0.35↔0.9)
    this.crisisG = new Graphics().rect(-1.5, -1.5, w + 3, h + 3).stroke({ width: 3, color: 0xe5484d });
    this.crisisG.alpha = 0;
    this.layers.frame.addChild(g);
    this.layers.fx.addChild(this.dangerG, this.crisisG);
  }

  /** NFR-001 §4.9 자동 품질 — "가벼운 그리기"면 Glow는 구운 텍스처만 @param {"normal" | "light"} q */
  setQuality(q) {
    const live = q === "normal" && this.o.role === "me";
    for (const kind of SPECIAL_KINDS) {
      // GLW-special: distance 10, outerStrength 2.5(만나 1.5), innerStrength 0.3, quality 0.25
      this.overlayLayers[kind].filters = live ? [new GlowFilter({
        distance: 10, outerStrength: kind === "manna" ? 1.5 : 2.5, innerStrength: 0.3, quality: 0.25,
        color: SPECIAL_GLOW[kind],
      })] : [];
    }
    this.hintG.filters = q === "normal"
      ? [new GlowFilter({ distance: 10, outerStrength: 2.5, innerStrength: 0.3, quality: 0.25, color: 0xf6d98b })] : [];
  }

  /** §6.3 감소 모드 — 맥동 대신 고정 (가림 정도와 무관) @param {boolean} on */
  setReduced(on) {
    this.reduced = on;
  }

  /**
   * 고정 칸 (CODE-009) — 바뀐 칸만 텍스처 교체. marks = 엔진 board.marks (특수·갑주 표식).
   * @param {ArrayLike<number>} cells @param {ArrayLike<any> | null} [marks]
   */
  setCells(cells, marks = null) {
    for (let i = 0; i < cells.length; i += 1) {
      const code = cells[i];
      const mark = marks ? marks[i] : null;
      const markKey = mark ? `${mark.kind}:${mark.armorId ?? ""}:${mark.pieceIndex}` : "";
      const prevOverlay = this.overlayByIndex.get(i);
      if (code !== this.prevCells[i]) {
        const s = this.cellSprites[i];
        this.prevCells[i] = code;
        s.visible = code > 0;
        if (code > 0) s.texture = this.o.textures.block(code, this.cell);
      }
      if ((prevOverlay?.key ?? "") !== markKey) {
        if (prevOverlay) prevOverlay.sprite.destroy({ children: true });
        this.overlayByIndex.delete(i);
        if (mark && code > 0) {
          const sp = specialOverlaySprite(this.o.textures, mark, this.cell, this.o.armorIcon);
          if (sp) {
            sp.position.copyFrom(this.cellSprites[i].position);
            this.overlayLayers[mark.kind].addChild(sp);
            this.overlayByIndex.set(i, { key: markKey, sprite: sp });
          }
        }
      }
    }
  }

  /**
   * 활성 블록 (FR-003). activeContainer의 피벗 = 블록 가운데 — 03-B가 이동 보간·회전 잔상(J-01·J-02)에 쓴다.
   * @param {{ type: string, x: number, y: number, rot: number } | null} piece @param {any} [special] 엔진 activeSpecial
   */
  setActive(piece, special = null) {
    const c = this.activeContainer;
    c.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    if (!piece) return;
    const cells = pieceCells(piece);
    const code = cellCode(piece.type);
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const cx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * this.cell;
    const cy = ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * this.cell;
    c.pivot.set(cx, cy);
    c.position.set(cx, cy);
    cells.forEach(([x, y], i) => {
      if (y < 0) return; // 보드 위(스폰 여유)는 그리지 않는다
      const s = new Sprite(this.o.textures.block(code, this.cell));
      s.anchor.set(0.5);
      s.position.set((x + 0.5) * this.cell, (y + 0.5) * this.cell);
      c.addChild(s);
      if (special && special.cellIndex === i) {
        const ov = specialOverlaySprite(this.o.textures, special, this.cell, this.o.armorIcon);
        if (ov) {
          ov.position.copyFrom(s.position);
          c.addChild(ov);
        }
      }
    });
  }

  /** FR-003 고스트 — 밝은 면 색 채움 0.12 + 2px 외곽선 0.55 (§2.3) @param {any} piece 표시 위치(저주 반영 후) */
  setGhost(piece) {
    const g = this.ghostG.clear();
    if (!piece) return;
    const cells = pieceCells(piece).filter(([, y]) => y >= 0);
    const light = BLOCK_COLORS[cellCode(piece.type)].light;
    const k = this.cell;
    for (const [x, y] of cells) g.roundRect(x * k + 1, y * k + 1, k - 2, k - 2, 3);
    g.fill({ color: light, alpha: 0.12 });
    for (const [x0, y0, x1, y1] of outlineEdges(cells)) g.moveTo(x0 * k, y0 * k).lineTo(x1 * k, y1 * k);
    g.stroke({ width: 2, color: light, alpha: 0.55 });
  }

  /**
   * FR-015·FR-035 착지 힌트 — engine.placement.bestPlacement(board, type, rules.placement.weights) 결과.
   * #F6D98B 2px 점선(6px 선 / 4px 틈), 투명도 0.85↔0.5 맥동 1.2초, GLW-special 금 (§2.3)
   * @param {{ type: string, x: number, y: number, rot: number } | null} piece
   */
  setHint(piece) {
    const g = this.hintG.clear();
    this.hintOn = !!piece;
    if (!piece) return;
    const k = this.cell;
    for (const [x0, y0, x1, y1] of outlineEdges(pieceCells(piece).filter(([, y]) => y >= 0))) {
      const len = Math.hypot(x1 - x0, y1 - y0) * k;
      const ux = (x1 - x0) / Math.hypot(x1 - x0, y1 - y0);
      const uy = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d < len; d += 10) {
        const e = Math.min(len, d + 6);
        g.moveTo(x0 * k + ux * d, y0 * k + uy * d).lineTo(x0 * k + ux * e, y0 * k + uy * e);
      }
    }
    g.stroke({ width: 2, color: 0xf6d98b });
  }

  /** §4.6.11 D-01 위기 (로컬 엔진 crisis) — severe = 블록이 위 2줄 안 @param {{ active: boolean, severe?: boolean }} c */
  setCrisis(c) {
    this.crisis = { active: !!c.active, severe: !!c.severe };
    this.dangerG.alpha = c.active ? 0.6 : 0.15;
    if (!c.active) this.crisisG.alpha = 0;
  }

  /** 맥동 갱신 (Pixi 틱 dtMs — 히트스톱에 멈춤) @param {number} dtMs */
  update(dtMs) {
    this.time += dtMs;
    const wave = (period) => 0.5 + 0.5 * Math.sin((this.time / period) * TAU);
    // X-01 말씀 0.8↔1.0 1.4초 sine · 갑주 1.2초 — 감소 모드: 맥동 없음(발광 고정)
    this.overlayLayers.word.alpha = this.reduced ? 1 : 0.8 + 0.2 * wave(PULSE_MS.word);
    this.overlayLayers.armor.alpha = this.reduced ? 1 : 0.8 + 0.2 * wave(PULSE_MS.armor);
    if (this.hintOn) this.hintG.alpha = this.reduced ? 0.85 : 0.5 + 0.35 * wave(PULSE_MS.hint);
    if (this.crisis.active) {
      // D-01 0.35↔0.9, 주기 = 심장박동 간격 900ms(위 2줄 안이면 650ms) — 감소 모드: 고정 0.7
      const period = this.crisis.severe ? PULSE_MS.crisisSevere : PULSE_MS.crisis;
      this.crisisG.alpha = this.reduced ? 0.7 : 0.35 + 0.55 * wave(period);
    }
  }

  /** 보드 칸 → 가상 좌표(스테이지) 가운데 — 파티클·투사체 기준점 @param {number} x @param {number} y */
  cellCenter(x, y) {
    return { x: this.o.geometry.x + (x + 0.5) * this.cell, y: this.o.geometry.y + (y + 0.5) * this.cell };
  }

  /** 보드 사각형 (가상 좌표) */
  rect() {
    return { x: this.o.geometry.x, y: this.o.geometry.y, width: this.width, height: this.height };
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}
