// TASK-040-1 · FR-003 · FR-006 · FR-044~046 · FR-048 · FR-055 · NFR-001 — 보드 10×20 그리기: 우물·격자·고정 칸·낙하 블록·고스트·힌트·특수 칸 표식·위험선·납 줄 숫자.
// 고정 칸은 칸마다 Sprite 1개를 재사용하고 바뀐 칸만 텍스처를 바꾼다 (design-vision §2.7·§4.12). 판정 없음 — 받은 상태를 그릴 뿐이다.
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { gsap } from 'gsap';
import { BOARD_COLS, BOARD_ROWS } from '../engine/encode.js';
import { absoluteCells } from '../engine/pieces.js';
import { isInDanger, DEFAULT_DANGER_ROWS } from '../engine/danger.js';
import { CELL } from '../net/protocol.js';
import { COLORS, cellColor } from './piece-skin.js';

/** design-vision §2.3·§2.7·§2.8·§4.5 보드 수치 토큰 */
const BOARD = Object.freeze({
  borderPx: 2, borderGlowAlpha: 0.25, ghostFill: 0.12, ghostLine: 2, dangerIdle: 0.35, dangerActive: 0.8,
  dangerPulseMs: 800, dangerPulseMin: 0.35, dangerPulseMax: 0.9, dangerFadeMs: 600, wordPulseMs: 1200,
  moveMs: 60, rotateMs: 80, afterimageMs: 120, afterimageAlpha: 0.35, comboGlowStep: 0.15, comboGlowCap: 0.9, comboRevertMs: 600,
  fallGlow: Object.freeze({ distance: 12, outerStrength: 1.2, innerStrength: 0, quality: 0.2 }),
  garbageRowMs: 120, garbageMaxMs: 360, collapseMs: 900, dashPx: 6,
});

// FR-006 보드 한 판(내 보드 또는 상대 보드)
export class BoardView {
  constructor({ skin, cellSize, isMine, filtersOn }) {
    this.skin = skin;
    this.isMine = isMine;
    this.filtersOn = filtersOn;
    this.root = new Container();
    this.well = new Graphics();
    this.glow = new Graphics();
    this.border = new Graphics();
    this.dangerLine = new Graphics();
    this.cellsLayer = new Container();
    this.ghost = new Graphics();
    this.hint = new Graphics();
    this.active = new Container();
    this.fxLayer = new Container();
    this.root.addChild(this.glow, this.well, this.dangerLine, this.cellsLayer, this.ghost, this.hint, this.active, this.border, this.fxLayer);
    this.cellSprites = Array.from({ length: BOARD_ROWS * BOARD_COLS }, () => {
      const s = new Sprite();
      s.visible = false;
      this.cellsLayer.addChild(s);
      return s;
    });
    this.activeSprites = Array.from({ length: 4 }, () => this.active.addChild(new Sprite()));
    this.leadTexts = [];
    this.codes = new Array(BOARD_ROWS * BOARD_COLS).fill(CELL.EMPTY);
    this.wordIdx = [];
    this.lastActive = null;
    this.ghostKey = '';
    this.hintKey = '';
    this.danger = { on: false, level: 0 };
    this.comboBoost = 0;
    this.collapsed = false;
    if (isMine && filtersOn) {
      this.fallFilter = new GlowFilter({ ...BOARD.fallGlow, color: COLORS.lightGold });
      this.active.filters = [this.fallFilter];
    }
    this.resize(cellSize, 0, 0);
  }

  get width() { return this.cell * BOARD_COLS; }
  get height() { return this.cell * BOARD_ROWS; }

  /** §5.2 셀 크기·위치 변경 — 텍스처를 새 크기로 다시 받는다 */
  resize(cellSize, x, y) {
    this.cell = cellSize;
    this.root.position.set(x, y);
    const W = this.width;
    const H = this.height;
    this.well.clear().rect(0, 0, W, H).fill(COLORS.boardWell);
    for (let c = 1; c < BOARD_COLS; c += 1) this.well.moveTo(c * cellSize, 0).lineTo(c * cellSize, H);
    for (let r = 1; r < BOARD_ROWS; r += 1) this.well.moveTo(0, r * cellSize).lineTo(W, r * cellSize);
    this.well.stroke({ width: 1, color: COLORS.boardGrid });
    const dy = DEFAULT_DANGER_ROWS * cellSize;
    this.dangerLine.clear();
    for (let x0 = 0; x0 < W; x0 += BOARD.dashPx * 2) this.dangerLine.moveTo(x0, dy).lineTo(Math.min(W, x0 + BOARD.dashPx), dy);
    this.dangerLine.stroke({ width: 1, color: COLORS.danger });
    this.dangerLine.alpha = BOARD.dangerIdle;
    const old = this.codes;
    this.codes = new Array(old.length).fill(CELL.EMPTY);
    this.applyGrid(null, old);
    this.ghostKey = '';
    this.hintKey = '';
    const prevActive = this.lastActive;
    this.lastActive = null;
    this.renderActive(prevActive);
    this.drawBorder(0);
  }

  /** 우물 바깥 2px 테두리 + 금빛 발광 (콤보 중 강도 상승, 위기 시 붉은 맥동) */
  drawBorder(now) {
    const W = this.width;
    const H = this.height;
    const b = BOARD.borderPx;
    let color = COLORS.lineStrong;
    let glowColor = COLORS.lightGold;
    let glowAlpha = BOARD.borderGlowAlpha * (1 + this.comboBoost);
    if (this.danger.level > 0) {
      const phase = (Math.sin((now / BOARD.dangerPulseMs) * Math.PI * 2) + 1) / 2;
      const pulse = BOARD.dangerPulseMin + (BOARD.dangerPulseMax - BOARD.dangerPulseMin) * phase;
      color = COLORS.danger;
      glowColor = COLORS.danger;
      glowAlpha = pulse * this.danger.level;
    }
    this.border.clear().rect(-b / 2, -b / 2, W + b, H + b).stroke({ width: b, color });
    this.glow.clear();
    for (let i = 1; i <= 3; i += 1) this.glow.rect(-b - i * 2, -b - i * 2, W + 2 * (b + i * 2), H + 2 * (b + i * 2)).stroke({ width: 2, color: glowColor, alpha: glowAlpha / i });
  }

  /** 격자 문자 배열 → 바뀐 칸만 갱신 */
  applyGrid(grid, prevCodes = null) {
    this.wordIdx.length = 0;
    const m = this.skin.margin(this.cell);
    for (let r = 0; r < BOARD_ROWS; r += 1) {
      for (let c = 0; c < BOARD_COLS; c += 1) {
        const i = r * BOARD_COLS + c;
        const code = grid ? grid[r][c] : (prevCodes ? prevCodes[i] : CELL.EMPTY);
        if (code === CELL.WORD) this.wordIdx.push(i);
        if (code === this.codes[i]) continue;
        this.codes[i] = code;
        const s = this.cellSprites[i];
        if (code === CELL.EMPTY || cellColor(code) === null) {
          s.visible = false;
          continue;
        }
        s.texture = this.skin.getTexture(code, this.cell);
        s.position.set(c * this.cell - m, r * this.cell - m);
        s.alpha = 1;
        s.visible = true;
      }
    }
  }

  // FR-006 · FR-044~046 · FR-055 보드 상태 그리기 (BoardRenderState — 내 보드는 매 프레임, 상대는 opponentState마다)
  render(state) {
    if (!state || !Array.isArray(state.grid)) return;
    if (this.collapsed) this.resetCollapse();
    this.applyGrid(state.grid);
    this.renderActive(state.active ?? null);
    this.renderOutline(this.ghost, state.ghost ?? null, 'ghostKey', false);
    this.renderOutline(this.hint, state.hint ?? null, 'hintKey', true);
    this.setDanger(state.inDanger ?? isInDanger(state.grid));
    this.renderLeadRows(state.leadRows ?? []);
  }

  renderActive(active) {
    if (!active) {
      this.active.visible = false;
      this.lastActive = null;
      return;
    }
    const cell = this.cell;
    const m = this.skin.margin(cell);
    const code = String(active.type);
    const cells = absoluteCells(active);
    this.active.visible = true;
    cells.forEach(([r, c], k) => {
      const s = this.activeSprites[k];
      s.texture = this.skin.getTexture(code, cell);
      s.position.set((c - active.x) * cell - m, (r - active.y) * cell - m);
      s.visible = r >= 0;
    });
    if (this.fallFilter) this.fallFilter.color = cellColor(code);
    const prev = this.lastActive;
    const tx = active.x * cell;
    const ty = active.y * cell;
    const near = prev && prev.type === active.type && Math.abs(prev.x - active.x) <= 2 && active.y - prev.y >= 0 && active.y - prev.y <= 2;
    if (near && (prev.x !== active.x || prev.y !== active.y)) gsap.to(this.active, { x: tx, y: ty, duration: BOARD.moveMs / 1000, ease: 'power2.out', overwrite: true });
    else if (!near) {
      gsap.killTweensOf(this.active);
      this.active.position.set(tx, ty);
    }
    this.lastActive = { ...active };
  }

  /** 고스트(블록 색 외곽선 2px + 채움 0.12) / 힌트(금빛 외곽선 맥동) */
  renderOutline(g, piece, keyName, isHint) {
    const key = piece ? `${piece.type}:${piece.rot}:${piece.x}:${piece.y}` : '';
    if (key === this[keyName]) return;
    this[keyName] = key;
    g.clear();
    if (!piece) return;
    const color = isHint ? COLORS.lightGold : cellColor(String(piece.type)) ?? COLORS.lineStrong;
    for (const [r, c] of absoluteCells(piece)) {
      if (r < 0) continue;
      g.rect(c * this.cell + 1, r * this.cell + 1, this.cell - 2, this.cell - 2)
        .fill({ color, alpha: BOARD.ghostFill })
        .stroke({ width: BOARD.ghostLine, color });
    }
  }

  renderLeadRows(leadRows) {
    while (this.leadTexts.length < leadRows.length) {
      const t = new Text({ text: '', style: { fontFamily: 'Cinzel', fontWeight: '700', fill: COLORS.textPrimary, fontSize: 12 } });
      t.anchor.set(0.5);
      this.fxLayer.addChild(t);
      this.leadTexts.push(t);
    }
    this.leadTexts.forEach((t, i) => {
      const lead = leadRows[i];
      t.visible = Boolean(lead);
      if (!lead) return;
      const label = String(lead.clearsLeft);
      const size = Math.max(8, Math.round(this.cell * 0.6));
      if (t.text !== label) t.text = label;
      if (t.style.fontSize !== size) t.style.fontSize = size;
      t.position.set((BOARD_COLS - 0.5) * this.cell, (lead.row + 0.5) * this.cell);
    });
  }

  // FR-055 위험선 진입/이탈 (EVT-17) — 진입 즉시, 이탈은 600ms 페이드
  setDanger(on) {
    if (on === this.danger.on) return;
    this.danger.on = on;
    gsap.to(this.danger, { level: on ? 1 : 0, duration: on ? 0 : BOARD.dangerFadeMs / 1000, overwrite: true });
    gsap.to(this.dangerLine, { alpha: on ? BOARD.dangerActive : BOARD.dangerIdle, duration: on ? 0 : BOARD.dangerFadeMs / 1000, overwrite: true });
  }

  // FR-061 EVT-13 테두리 발광 +15%/콤보(상한 +90%), combo 0이면 600ms에 원복
  setComboGlow(combo) {
    const target = Math.min(Math.max(0, combo) * BOARD.comboGlowStep, BOARD.comboGlowCap);
    gsap.to(this, { comboBoost: target, duration: combo > 0 ? 0.1 : BOARD.comboRevertMs / 1000, overwrite: true });
  }

  /** 매 프레임: 말씀 칸 맥동(1200ms)·힌트 맥동·테두리 */
  update(now) {
    const w = 0.75 + 0.25 * Math.sin((now / BOARD.wordPulseMs) * Math.PI * 2);
    for (const i of this.wordIdx) this.cellSprites[i].alpha = w;
    this.hint.alpha = 0.55 + 0.45 * Math.sin((now / BOARD.wordPulseMs) * Math.PI * 2);
    this.drawBorder(now);
  }

  // FR-051 EVT-02 회전 잔상 (직전 자세 0.35→0, 120ms)
  rotateAfterimage(fromActive) {
    if (!fromActive) return;
    const g = new Graphics();
    const color = cellColor(String(fromActive.type)) ?? COLORS.lightWhite;
    for (const [r, c] of absoluteCells(fromActive)) if (r >= 0) g.rect(c * this.cell, r * this.cell, this.cell, this.cell).fill(color);
    g.alpha = BOARD.afterimageAlpha;
    this.fxLayer.addChild(g);
    gsap.to(g, { alpha: 0, duration: BOARD.afterimageMs / 1000, onComplete: () => g.destroy() });
  }

  // FR-046 EVT-23 쓰레기 줄 삽입 — 아래에서 120ms/줄 밀어 올림 (최대 360ms)
  garbageRise(rows) {
    const n = Math.max(0, rows | 0);
    if (!n) return;
    gsap.fromTo(this.cellsLayer, { y: n * this.cell }, { y: 0, duration: Math.min(n * BOARD.garbageRowMs, BOARD.garbageMaxMs) / 1000, ease: 'power2.out' });
  }

  // FR-007 EVT-48 패배 보드 — 블록이 아래로 무너져 떨어짐 900ms (다음 render에서 원위치)
  collapse(delayMs = 0) {
    this.collapsed = true;
    gsap.to(this.cellsLayer, { y: this.height, alpha: 0, delay: delayMs / 1000, duration: BOARD.collapseMs / 1000, ease: 'power2.in' });
  }

  resetCollapse() {
    gsap.killTweensOf(this.cellsLayer);
    this.cellsLayer.position.set(0, 0);
    this.cellsLayer.alpha = 1;
    this.collapsed = false;
  }

  /** 보드 좌표 → 게임 레이어 좌표 (칸 중심) */
  cellCenter(row, col) {
    return { x: this.root.x + (col + 0.5) * this.cell, y: this.root.y + (row + 0.5) * this.cell };
  }

  rect() {
    return { x: this.root.x, y: this.root.y, width: this.width, height: this.height };
  }

  /** 가장 높은 고정 칸이 있는 열의 꼭대기 (다윗 물맷돌 목표) — 빈 보드면 null */
  highestCell() {
    for (let r = 0; r < BOARD_ROWS; r += 1) for (let c = 0; c < BOARD_COLS; c += 1) if (this.codes[r * BOARD_COLS + c] !== CELL.EMPTY) return [r, c];
    return null;
  }

  /** 열의 최상단 고정 칸 행 (없으면 null) */
  topRowOfColumn(col) {
    for (let r = 0; r < BOARD_ROWS; r += 1) if (this.codes[r * BOARD_COLS + col] !== CELL.EMPTY) return r;
    return null;
  }

  destroy() {
    // 광야 BUG-007: 배열로 넘기면 GSAP는 "대상 일부"만 빼려 하고, 아직 시작 전(delay)인 트윈(EVT-48 무너짐 300ms 지연)은 살아남아
    // 파괴된 Container의 y를 매 프레임 읽다 예외를 던졌다 — 대상마다 따로 죽인다.
    for (const target of [this.active, this.cellsLayer, this.danger, this.dangerLine, this]) gsap.killTweensOf(target);
    this.root.destroy({ children: true });
  }
}
