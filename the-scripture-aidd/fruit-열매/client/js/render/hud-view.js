// TASK-040-2 · FR-003 · FR-033 · FR-036 · FR-048 · FR-062 · D4-15 — Pixi 측 HUD: 홀드·다음 블록 모양·믿음 게이지 막대·갑주 문장·은혜 ✧ + 장전된 방어(방패·검·흉배) 빛.
// 수치·키캡·칩·배너는 DOM(므낫세 battle-screen) 담당. 여기 값은 HudState(서버 playerStatus 반영 후)를 그대로 그린다 (R-10 서버 판정 존중).
import { Container, Graphics, Sprite } from 'pixi.js';
import { gsap } from 'gsap';
import { pieceByType } from '../engine/pieces.js';
import { ARMOR_IDS, ARMOR_CELL_CODES } from '../net/protocol.js';
import { heroesById } from '../content/content-loader.js';
import { COLORS } from './piece-skin.js';

/** design-vision §3.5 HUD-02·03·06·09·15, §4.6·§4.8·§4.9 수치 토큰 */
const HUD = Object.freeze({
  holdScale: 0.7, nextFirstScale: 0.8, nextRestScale: 0.6, holdUsedAlpha: 0.4, panelAlpha: 0.88, slotGap: 8,
  faithMax: 100, faithTweenMs: 300, faithPulseMs: 1200, graceAlpha: 0.55, graceFadeMs: 1000, wardAlpha: 0.35, maxNext: 7,
});

function panel(g, r) {
  g.clear().roundRect(r.x, r.y, r.width, r.height, 8).fill({ color: COLORS.bgPanel, alpha: HUD.panelAlpha }).stroke({ width: 1, color: COLORS.lineSubtle });
}

function starPath(g, cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? outer : inner;
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  return g.poly(pts);
}

// D4-15 Pixi HUD 묶음
export class HudView {
  constructor({ skin, mode }) {
    this.skin = skin;
    this.practice = mode === 'practice';
    this.root = new Container();
    this.holdBg = new Graphics();
    this.nextBg = new Graphics();
    this.smoke = new Graphics();
    this.faithG = new Graphics();
    this.armorG = new Graphics();
    this.wardG = new Graphics();
    this.grace = new Graphics();
    this.holdC = new Container();
    this.nextC = new Container();
    this.armorC = new Container();
    this.root.addChild(this.holdBg, this.nextBg, this.holdC, this.nextC, this.smoke, this.faithG, this.armorG, this.armorC, this.wardG, this.grace);
    this.holdSprites = Array.from({ length: 4 }, () => this.holdC.addChild(new Sprite()));
    this.nextSprites = Array.from({ length: HUD.maxNext * 4 }, () => this.nextC.addChild(new Sprite()));
    this.armorSprites = ARMOR_IDS.map(() => this.armorC.addChild(new Sprite()));
    this.faith = { shown: 0, target: 0 };
    this.grace.alpha = 0;
    this.graceOn = false;
    this.hud = null;
    this.layout = null;
    this.armorC.visible = !this.practice;
    this.armorG.visible = !this.practice;
  }

  /** §5.2 배치 갱신 (pixi-app가 layout 계산 후 호출) */
  setLayout(layout) {
    this.layout = layout;
    panel(this.holdBg, layout.hold);
    panel(this.nextBg, layout.next);
    this.grace.clear();
    starPath(this.grace, layout.hold.x + layout.hold.width - 10, layout.hold.y + 10, 6, 2.2).fill(COLORS.grace);
    if (this.hud) this.update(this.hud, true);
  }

  // FR-003 · FR-033 · FR-036 · FR-062 HudState 반영 (D4-15 Pixi 분담만)
  update(hud, force = false) {
    if (!hud || !hud.me || !this.layout) return;
    const prev = this.hud;
    this.hud = hud;
    const me = hud.me;
    const L = this.layout;
    const cell = L.cellSize;
    if (force || !prev || prev.me.hold !== me.hold || prev.me.holdUsed !== me.holdUsed) {
      this.placePiece(this.holdSprites, me.hold, Math.round(cell * HUD.holdScale), L.hold.x + L.hold.width / 2, L.hold.y + L.hold.height / 2);
      this.holdC.alpha = me.holdUsed ? HUD.holdUsedAlpha : 1;
    }
    const nextKey = `${(me.next ?? []).join(',')}|${me.nextHidden}`;
    if (force || nextKey !== this.nextKey) {
      this.nextKey = nextKey;
      this.drawNext(me.next ?? [], cell, L.next);
      this.drawSmoke(Boolean(me.nextHidden), L.next);
    }
    if (me.faith !== this.faith.target) {
      this.faith.target = me.faith;
      gsap.to(this.faith, { shown: Math.max(0, Math.min(HUD.faithMax, me.faith)), duration: HUD.faithTweenMs / 1000, overwrite: true });
    }
    if (!this.practice) this.drawArmor(me.armor ?? [], me.wards ?? null, L.armor);
    this.drawWards(me.wards ?? null, L.myBoard);
    if (Boolean(me.grace) !== this.graceOn) this.setGrace(Boolean(me.grace));
  }

  placePiece(sprites, type, px, cx, cy, offset = 0) {
    const piece = type ? pieceByType(type) : null;
    for (let k = 0; k < 4; k += 1) sprites[offset + k].visible = Boolean(piece);
    if (!piece) return;
    const cells = piece.cells[0];
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const w = (Math.max(...cols) - Math.min(...cols) + 1) * px;
    const h = (Math.max(...rows) - Math.min(...rows) + 1) * px;
    const m = this.skin.margin(px);
    cells.forEach(([r, c], k) => {
      const s = sprites[offset + k];
      s.texture = this.skin.getTexture(piece.code, px);
      s.position.set(cx - w / 2 + (c - Math.min(...cols)) * px - m, cy - h / 2 + (r - Math.min(...rows)) * px - m);
    });
  }

  // FR-003 HUD-03 첫 칸 0.8배, 나머지 0.6배 (개수 = 서버·효과 반영 후 next 길이)
  drawNext(next, cell, rect) {
    let y = rect.y + HUD.slotGap;
    for (let i = 0; i < HUD.maxNext; i += 1) {
      const type = next[i] ?? null;
      const px = Math.round(cell * (i === 0 ? HUD.nextFirstScale : HUD.nextRestScale));
      const slotH = px * 2 + HUD.slotGap;
      const fits = y + slotH <= rect.y + rect.height;
      this.placePiece(this.nextSprites, fits ? type : null, px, rect.x + rect.width / 2, y + slotH / 2, i * 4);
      y += slotH;
    }
  }

  // FR-027 hideNext — HUD-03을 연기로 가림
  drawSmoke(on, rect) {
    this.smoke.clear();
    if (!on) return;
    this.smoke.roundRect(rect.x, rect.y, rect.width, rect.height, 8).fill({ color: COLORS.spiritSmoke, alpha: 0.9 });
    for (let i = 0; i < 6; i += 1) {
      this.smoke.circle(rect.x + rect.width * (0.2 + 0.12 * i), rect.y + rect.height * (0.25 + 0.1 * (i % 3)), rect.width * 0.22).fill({ color: COLORS.spiritSmoke, alpha: 0.6 });
    }
  }

  // FR-036 HUD-09 갑주 6슬롯 — 보유 시 금빛 문장, 미보유 시 윤곽만, 장전 방어는 슬롯 아래 점
  drawArmor(owned, wards, rect) {
    if (!rect) return;
    const g = this.armorG.clear();
    const cols = 3;
    const sw = (rect.width - HUD.slotGap * (cols - 1)) / cols;
    const sh = (rect.height - HUD.slotGap) / 2;
    const size = Math.max(8, Math.floor(Math.min(sw, sh) * 0.7));
    const charged = wardCharges(wards);
    ARMOR_IDS.forEach((id, i) => {
      const x = rect.x + (i % cols) * (sw + HUD.slotGap);
      const y = rect.y + Math.floor(i / cols) * (sh + HUD.slotGap);
      const has = owned.includes(id);
      g.moveTo(x + sw * 0.2, y + 2).lineTo(x + sw * 0.8, y + 2).quadraticCurveTo(x + sw * 0.8, y + sh * 0.7, x + sw / 2, y + sh - 6)
        .quadraticCurveTo(x + sw * 0.2, y + sh * 0.7, x + sw * 0.2, y + 2).stroke({ width: 1, color: has ? COLORS.lightGold : COLORS.lineStrong });
      const s = this.armorSprites[i];
      s.visible = has;
      if (has) {
        s.texture = this.skin.getTexture(ARMOR_CELL_CODES[i], size);
        s.position.set(x + (sw - size) / 2 - this.skin.margin(size), y + (sh - size) / 2 - 3 - this.skin.margin(size));
      }
      if (charged[id]) g.circle(x + sw / 2, y + sh - 2, 2).fill(COLORS.lightGoldBright);
    });
    if (wards?.michael > 0) for (let k = 0; k < wards.michael; k += 1) g.rect(rect.x + k * 6, rect.y + rect.height + 2, 2, 6).fill(COLORS.angelHalo);
  }

  // FR-037 장전된 방어의 머무는 빛 — 방패 반원(보드 위), 성령의 검(보드 옆), 의의 흉배 빛판(보드 아래) (design-vision §4.8)
  drawWards(wards, board) {
    const g = this.wardG.clear();
    if (!wards || !board) return;
    if (wards.shield) g.arc(board.x + board.width / 2, board.y, board.width / 2, Math.PI, 0).stroke({ width: 3, color: COLORS.lightGold, alpha: HUD.wardAlpha * 2 })
      .arc(board.x + board.width / 2, board.y, board.width / 2, Math.PI, 0).fill({ color: COLORS.lightGold, alpha: HUD.wardAlpha / 3 });
    if (wards.reflect) {
      const x = board.x + board.width + 6;
      g.rect(x, board.y + board.height * 0.3, 3, board.height * 0.4).fill({ color: COLORS.angelCore, alpha: 0.8 })
        .rect(x - 5, board.y + board.height * 0.62, 13, 3).fill({ color: COLORS.angelHalo, alpha: 0.8 });
    }
    if (wards.breastplate) g.roundRect(board.x + board.width * 0.3, board.y + board.height - 10, board.width * 0.4, 8, 3).fill({ color: COLORS.angelHalo, alpha: HUD.wardAlpha });
  }

  // FR-062 · EVT-52 은혜 ✧ 불투명도 0→0.55, 1000ms, 설명 없음
  setGrace(on) {
    this.graceOn = on;
    gsap.to(this.grace, { alpha: on ? HUD.graceAlpha : 0, duration: on ? HUD.graceFadeMs / 1000 : 0, overwrite: true });
  }

  /** 매 프레임: 믿음 게이지 막대 (100이면 금빛 맥동) */
  drawFaith(now) {
    const r = this.layout?.faith;
    const g = this.faithG.clear();
    if (!r || !this.hud) return;
    const ratio = this.faith.shown / HUD.faithMax;
    g.roundRect(r.x, r.y, r.width, r.height, r.height / 2).fill({ color: COLORS.bgPanel, alpha: HUD.panelAlpha }).stroke({ width: 1, color: COLORS.lineStrong });
    const full = this.faith.shown >= HUD.faithMax;
    const pulse = full ? 0.75 + 0.25 * Math.sin((now / HUD.faithPulseMs) * Math.PI * 2) : 1;
    if (ratio > 0) g.roundRect(r.x, r.y, r.width * ratio, r.height, r.height / 2).fill({ color: full ? COLORS.lightGoldBright : COLORS.lightGold, alpha: pulse });
    const hero = heroesById.get(this.hud.me.heroId);
    const cost = hero ? hero.skill.cost : null;
    if (cost) g.rect(r.x + (r.width * cost) / HUD.faithMax - 1, r.y - 3, 2, r.height + 6).fill(COLORS.textPrimary);
  }

  /** 획득 비행 목표 좌표 (EVT-30 갑주 슬롯, EVT-36·39 믿음 게이지) */
  armorSlotCenter(armorId) {
    const rect = this.layout?.armor;
    const i = ARMOR_IDS.indexOf(armorId);
    if (!rect || i < 0) return null;
    const sw = (rect.width - HUD.slotGap * 2) / 3;
    const sh = (rect.height - HUD.slotGap) / 2;
    return { x: rect.x + (i % 3) * (sw + HUD.slotGap) + sw / 2, y: rect.y + Math.floor(i / 3) * (sh + HUD.slotGap) + sh / 2 };
  }

  destroy() {
    gsap.killTweensOf([this.faith, this.grace]);
    this.root.destroy({ children: true });
  }
}

/** §7.12 wards → 슬롯별 장전 여부 */
function wardCharges(w) {
  if (!w) return {};
  return {
    belt_of_truth: w.deception > 0 || w.control > 0, breastplate_of_righteousness: Boolean(w.breastplate), gospel_shoes: w.speed > 0,
    shield_of_faith: Boolean(w.shield), helmet_of_salvation: w.vision > 0, sword_of_the_spirit: Boolean(w.reflect),
  };
}
