// juice-table-powers.js — S·G·R·H·예수님 이벤트 행 정의만 (Q·X·RX·AC·RT·GR·SV·UI 행은 juice-table-quiz.js — D-03B 분할)
// TASK-053 | REQ-007 REQ-008 REQ-009 REQ-010 REQ-013 FR-014~FR-017 FR-027~FR-031 FR-035~FR-039 FR-054 C-002 C-011 |
// ARCH-005 | TBL-011~TBL-014 | design-vision §4.6.4~§4.6.8·§4.7.4 악한 영·예수님 | D3-09 | RTM §5 DCL-008
// 가림 정도는 spirit-fx가 spirits.json 수치 그대로 그린다 — 여기서는 등장 연출·소리·진동·자막만(D3-09).
// c.side: 악한 영 = 받는 쪽 기준("me" 받음 / "opp" 내가 보냄), 천사·갑주·스킬 = 쓴 사람 쪽("me" / "opp").
import { Graphics } from "pixi.js";
import * as M from "./board-motion.js";
import { angelsById, armorById, heroesById, rules, spirits, spiritsById } from "../content.js";
import { buildShape } from "../art/to-pixi.js";
import { ARMOR_ICONS } from "../art/shapes-heroes-armor.js";
import { GLW } from "../render/filters.js";

/** S-01~S-14 = spirits.json 순서 (TBL-013 id) */
const S_IDS = Object.fromEntries(spirits.map((s, i) => [`S-${String(i + 1).padStart(2, "0")}`, s.id]));
const G_IDS = { "G-01": "michael", "G-02": "gabriel", "G-03": "cherubim", "G-04": "seraphim",
  "G-05": "ministering_spirits" };
const R_IDS = { "R-01": "belt_of_truth", "R-02": "breastplate_of_righteousness", "R-03": "gospel_shoes",
  "R-04": "shield_of_faith", "R-05": "helmet_of_salvation", "R-06": "sword_of_the_spirit" };
const H_IDS = { "H-01": "david", "H-02": "solomon", "H-03": "peter", "H-04": "paul" };
const LOUD_ARMOR = new Set(["shield_of_faith", "helmet_of_salvation", "sword_of_the_spirit"]); // AUX-13 (나머지 AUX-09)
/** @type {WeakMap<any, any>} R-04 남아 있는 방패 · H-03 반석 띠 */
const held = new WeakMap();

/**
 * §4.6.4 악한 영 공통 등장 + 고유 소리 {spiritId?, side, applied, durationMs, cells?(S-09), rows?(S-11)}
 * @param {any} f @param {any} c @param {string} id
 */
function spirit(f, c, id) {
  const sp = spiritsById.get(c.spiritId ?? id);
  if (!sp) return;
  const me = (c.side ?? "me") === "me";
  const boss = sp.id === "dragon";
  const timed = sp.duration_ms > 0;
  const applied = c.applied !== false;
  f.spiritFx?.appear(sp.id, { side: me ? "me" : "opp", applied, timed, durationMs: c.durationMs ?? sp.duration_ms,
    disguiseMs: sp.params?.disguiseMs });
  if (!me) return void f.sound("SFX-12", { tier: sp.tier, db: -14 }); // 보낸 쪽: 축소 실루엣 + SFX-12 −14dB
  f.ui("chips", { spiritId: sp.id });
  if (!applied) {
    f.overlay.subtitle({ kind: "spirit", title: sp.name_ko, note: "효과 상한 — 쓰레기 줄만 적용", holdMs: 1200 });
    return void f.sound("SFX-12", { tier: sp.tier, short: true });
  }
  const title = boss ? "루시퍼 / 용 / 옛 뱀 / 사탄" : sp.name_ko;
  const sub = { kind: "spirit", title, tier: sp.tier, verseRefs: [sp.verse_ref] };
  const ms = c.durationMs ?? sp.duration_ms;
  if (sp.id === "satan_angel_of_light") {
    // S-13: 처음엔 천사 연출(자막 없음) → disguiseMs에 진짜 자막 / SFX-13 +30센트 → 세 온음 아래 SFX-12 등급 5
    f.sound("SFX-13", { disguise: true, slideAtMs: sp.params.disguiseMs });
    f.later(sp.params.disguiseMs, () => f.overlay.subtitle(sub));
  } else {
    f.overlay.subtitle(sub);
    f.sound("SFX-12", { tier: sp.tier, boss, layer: { beelzebub: "fly", prince_of_persia: "seal", legion: "murmur",
      abaddon: "gnaw", wickedness: "lead" }[sp.id], layerMs: ms });
  }
  f.haptic(boss ? "HP-boss" : "HP-dread");
  if (sp.id === "deaf_dumb_spirit") f.mixer?.setSpiritMute(true); // S-02 효과음·경고음 음소거 (S-END에서 복귀)
  if (sp.id === "abaddon" && c.cells) f.spiritFx?.gnaw(c.cells);
  if (sp.id === "wickedness") {
    M.rise(f.pixi, f.me(), c.rows ?? 1, !f.reduced);
    if (!f.reduced) f.shk("SHK-3", f.me());
  }
  if (boss) {
    if (!f.reduced) f.shk("SHK-5");
    f.bgm?.dragon();
  } else if (sp.tier >= 4) {
    f.mixer?.duckMusic(-6, 0.2); // 등급 4 이상: musicBus −6dB 1.5초 (드론이 들리게)
    f.later(1500, () => f.mixer?.duckMusic(0, 0.4));
  }
}

/** §4.6.5 천사 공통 {side, params} @param {string} id */
function angel(f, c, id) {
  const a = angelsById.get(id);
  const me = (c.side ?? "me") === "me";
  f.holyFx?.pillar({ side: me ? "me" : "opp", angel: a.visual });
  f.sound("SFX-13", { angel: id, db: me ? 0 : -12 });
  if (!me) return false;
  f.overlay.subtitle({ kind: "angel", title: a.name_ko, titleColor: "#F6D98B", verseRefs: [a.verse_ref],
    holdMs: 2000 });
  f.haptic("HP-holy");
  f.ui("gauge", { angel: id });
  return true;
}

/** §4.6.6 갑주 공통 {side, from?: 슬롯 가상 좌표} — 아이콘이 보드 위 가운데로 96px(200ms) → 600ms → 200ms 소멸 */
function armor(f, c, id) {
  const ar = armorById.get(id);
  const me = (c.side ?? "me") === "me";
  const b = f.board(me ? "me" : "opp");
  if (!b) return false;
  const r = b.rect();
  const size = me ? 96 : 48;
  const icon = buildShape(ARMOR_ICONS[id], size);
  icon.pivot.set(size / 2, size / 2);
  const to = { x: r.x + r.width / 2, y: r.y + 70 };
  const from = me ? c.from ?? { x: 144, y: 480 } : to;
  icon.position.set(from.x, from.y);
  f.pixi.layers.holy.addChild(icon);
  const glow = me ? f.filters.glow(icon, GLW.holy) : null;
  f.pixi.animate(me && !f.reduced ? 200 : 1, (k) => {
    icon.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
    icon.scale.set(me ? 0.5 + 0.5 * k : 1);
  }, { ease: "power2.out" });
  f.pixi.animate(200, (k) => { icon.alpha = 1 - k; }, { delayMs: me ? 800 : 600,
    onComplete: () => { glow?.release(); icon.destroy(); } });
  if (!me) return false;
  f.overlay.subtitle({ kind: "armor", title: ar.name_ko, titleColor: "#F6D98B", verseRefs: [ar.verse_ref],
    holdMs: 1600 });
  f.sound(LOUD_ARMOR.has(id) ? "AUX-13" : "AUX-09");
  f.haptic("HP-mid");
  f.ui("armorUsed", { armorId: id });
  return true;
}

/** §4.6.7 위인 스킬 공통 {side} @param {string} id */
function hero(f, c, id) {
  const h = heroesById.get(id);
  const me = (c.side ?? "me") === "me";
  const g = f.geo().gauge;
  if (me && g) f.particles.emit("PT-flake", { x: g.x + g.w / 2, y: g.y + g.h / 2, area: { w: g.w, h: g.h / 2 },
    count: 12,
    life: 300, target: c.skillAt ?? { x: 144, y: 224 } }); // 게이지가 금 입자로 스킬 버튼 쪽으로 (300ms)
  f.holyFx?.pillar({ side: me ? "me" : "opp", emblem: h.emblem });
  f.sound("SFX-14", { hero: id, db: me ? 0 : -12 });
  if (!me) return false;
  f.overlay.subtitle({ kind: "hero", title: h.skill_name_ko, titleColor: "#F6D98B", verseRefs: [h.verse_ref],
    holdMs: 2000 });
  if (id !== "paul") f.haptic("HP-mid");
  return true;
}

/** 공통 행 생성기 */
const rows = (ids, fn, extra = {}) => Object.fromEntries(Object.entries(ids).map(([ev, id]) => [ev, (f, c) => {
  if (fn(f, c, id) !== false) extra[ev]?.(f, c);
}]));

export const POWERS = {
  ...rows(S_IDS, spirit),
  /** S-07 바람 밀림 순간 {} — 돌풍 덮개 100ms + SFX-10 휙(−18dB, 0.12초) */
  "S-07p"(f) {
    f.spiritFx?.gust();
    f.sound("SFX-10", { variant: "wind" });
  },
  /** S-END 시간형 효과 종료 {spiritId} — 덮개·필터 해제는 spirit-fx sync, 귀신 음소거 200ms 복귀 */
  "S-END"(f, c) {
    if (c.spiritId === "deaf_dumb_spirit") f.mixer?.setSpiritMute(false);
    f.ui("chips", { ended: c.spiritId });
  },
  ...rows(G_IDS, angel, {
    /** G-01 canceled: 빛의 검 베기 + FL-2 흰색 / armed: 준비 표시 */
    "G-01"(f, c) {
      if (c.params?.canceled) {
        f.holyFx?.slash("me");
        f.fl("FL-2", { board: f.me() });
      } else f.ui("armed", { id: "michael" });
    },
    /** G-03 그룹 {params.burned} — 받을 공격 막대 위쪽 n칸이 주황 불길로 (칸마다 400ms, 80ms 간격) + PT-ember 20 */
    "G-03"(f, c) {
      const p = f.geo().pending;
      if (!p) return;
      const n = c.params?.burned ?? 1;
      for (let i = 0; i < n; i += 1) f.later(i * 80, () => f.particles.emit("PT-ember", { x: p.x + p.w / 2,
        y: p.y + p.h - (i + 0.5) * (p.h / 20), count: Math.ceil(20 / n), color: 0xff8a3d }));
    },
    /** G-04 스랍 — 걸린 효과가 주황 불티로 흩어짐 (덮개 해제는 sync), 비네트 내림 */
    "G-04"(f) {
      const r = f.me().rect();
      f.particles.emit("PT-ember", { x: r.x + r.width / 2, y: r.y + r.height / 2, area: { w: r.width, h: r.height },
        count: 20 });
      f.spiritFx?.clearVignette();
    },
    /** G-05 섬기는 영들 {params.rows} — 빛 구슬 12개 하강 400ms → 줄 소멸 300ms → 보드 내림 120ms (setCells 뒤) */
    "G-05"(f, c) {
      const b = f.me();
      const bottom = b.cellCenter(4.5, b.o.rows - 1);
      f.particles.emit("PT-flake", { x: bottom.x, y: b.rect().y, area: { w: b.width, h: 20 }, count: 12, life: 400,
        target: bottom });
      f.later(400, () => f.particles.emit("PT-spark", { ...bottom, area: { w: b.width, h: b.cell }, count: 16 }));
      M.collapse(f.pixi, b, Array.from({ length: c.params?.rows ?? 1 }, (_, i) => b.o.rows - 1 - i), 700, false);
    },
  }),
  ...rows(R_IDS, armor, {
    /** R-01 금 띠 고리(타원 테두리 4px #F2C14E)가 보드를 감싸며 닫힘 300ms */
    "R-01"(f) {
      const r = f.me().rect();
      const g = new Graphics().ellipse(0, 0, r.width * 0.62, r.height * 0.55).stroke({ width: 4, color: 0xf2c14e });
      g.position.set(r.x + r.width / 2, r.y + r.height / 2);
      f.pixi.layers.holy.addChild(g);
      f.pixi.animate(300, (k) => { g.scale.set(1.4 - 0.4 * k); }, { ease: "power2.out" });
      f.pixi.animate(300, (k) => { g.alpha = 1 - k; }, { delayMs: 500, onComplete: () => g.destroy() });
    },
    /** R-03 바람줄이 멈추고 흩어짐(sync) + 블록 아래 짧은 금 발자국 2개 */
    "R-03"(f) {
      const b = f.me();
      const g = new Graphics().ellipse(-10, 0, 5, 8).fill(0xf2c14e).ellipse(10, -6, 5, 8).fill(0xf2c14e);
      g.position.set(b.width / 2, b.height - 16);
      b.layers.fx.addChild(g);
      f.pixi.animate(600, (k) => { g.alpha = 1 - k; }, { delayMs: 300, onComplete: () => g.destroy() });
    },
    /** R-04 방패가 보드 앞에 반투명 0.35로 남음 — {active:false}(status.armed에서 빠짐)로 걷음 */
    "R-04"(f) {
      const r = f.me().rect();
      const s = buildShape(ARMOR_ICONS.shield_of_faith, 96);
      s.pivot.set(48, 48);
      s.position.set(r.x + r.width / 2, r.y + r.height / 2);
      s.alpha = 0.35;
      f.pixi.layers.projectile.addChild(s);
      held.get(f.me())?.shield?.destroy();
      held.set(f.me(), { ...held.get(f.me()), shield: s });
    },
    /** R-05 위→아래 빛 띠가 400ms 훑으며 어둠·잡음·흐림이 걷힘 + 음소거(S-02) 풀림 */
    "R-05"(f) {
      const b = f.me();
      const band = new Graphics().rect(0, 0, b.width, 48).fill({ color: 0xfff8e7, alpha: 0.8 });
      b.layers.fx.addChild(band);
      f.pixi.animate(400, (k) => { band.y = (b.height - 48) * k; }, { ease: "none", onComplete: () => band.destroy() });
      f.mixer?.setSpiritMute(false);
    },
  }),
  /** R-02 실제 경감 순간 {} — 받을 공격 막대 옆 "−rules.armor.breastplateReduce" */
  "R-02r"(f) {
    const p = f.geo().pending;
    if (p) f.overlay.float({ text: `−${rules.armor.breastplateReduce}`, x: p.x + p.w + 24, y: p.y + p.h - 60,
      type: "h3", color: "#F6D98B" });
  },
  /** R-04 해제 {} — 방패 반투명이 사라짐 (다음 공격을 막았거나 준비가 풀림) */
  "R-04off"(f) {
    const h = held.get(f.me());
    h?.shield?.destroy();
    if (h) h.shield = null;
  },
  ...rows(H_IDS, hero, {
    /** H-01 물맷돌 {target: 가상 좌표(상대 보드 가장 높은 열 꼭대기), from?: 엠블럼 좌표} */
    "H-01"(f, c) {
      const opp = f.opp();
      if (!opp) return;
      const to = c.target ?? { x: opp.rect().x + opp.width / 2, y: opp.rect().y + opp.height / 2 };
      f.arrows.sling({ from: c.from ?? { x: 144, y: 224 }, to, toSide: "opp", onHit: () => {
        f.particles.emit("PT-shard", { ...to, count: 12, color: 0xa9b4c4 });
        f.arrows.cracks(to);
        if (!f.reduced) f.shk("SHK-2", opp);
      } });
    },
    /** H-03 반석 띠 {durationMs} — 보드 아래 높이 24 (#6B7484 + 위 #F2C14E 2px + 돌결 3줄) 솟음 200ms back.out(2) */
    "H-03"(f, c) {
      const b = f.me();
      const g = new Graphics().rect(0, 0, b.width, 24).fill(0x6b7484).rect(0, 0, b.width, 2).fill(0xf2c14e);
      for (let i = 1; i <= 3; i += 1) g.moveTo(8 * i, 6 * i).lineTo(b.width - 12 * i, 6 * i + 3);
      g.stroke({ width: 1, color: 0x8a93a3 });
      b.layers.fx.addChild(g);
      g.y = b.height;
      f.pixi.animate(200, (k) => { g.y = b.height - 24 * k; }, { ease: f.ease("back.out(2)") });
      f.pixi.animate(300, (k) => { g.y = b.height - 24 * (1 - k); }, { delayMs: c.durationMs ?? 10000,
        onComplete: () => g.destroy() });
    },
    /** H-04 바울 {rows: 사라진 쓰레기 줄 y} — 지진 SHK-5 + 줄 금(200ms) → 아래로 떨어져 사라짐 500ms + PT-dust 30 */
    "H-04"(f, c) {
      const b = f.me();
      if (!f.reduced) f.shk("SHK-5");
      const r = b.rect();
      f.particles.emit("PT-dust", { x: r.x + r.width / 2, y: r.y + r.height - 20, area: { w: r.width, h: 40 },
        count: 30 });
      if (c.rows?.length) M.collapse(f.pixi, b, c.rows, 200, false);
      f.haptic([60, 40, 60, 40, 120]);
    },
  }),
  /** H-05 스킬 준비 완료 — AUX-12 1회 (준비 상태 표시는 HUD) */
  "H-05"(f) {
    f.sound("AUX-12");
    f.ui("skillReady", {});
  },
  /** H-06 게이지 가득 — 게이지 막대 흰·금 섬광 + PT-spark 12 + AUX-12 (+5반음) */
  "H-06"(f) {
    const g = f.geo().gauge;
    if (g) f.particles.emit("PT-spark", { x: g.x + g.w / 2, y: g.y, count: 12 });
    const el = f.hudEl("gauge");
    if (el) f.gsap.fromTo(el, { filter: "brightness(2)" }, { filter: "brightness(1)", duration: 0.4 });
    f.sound("AUX-12", { semitones: 5 });
  },
  /** §4.6.8 예수님 "세상을 이기었노라" {side, garbageRows} — 전체 3,900ms, 게임은 멈추지 않는다 */
  JESUS(f, c) {
    const me = (c.side ?? "me") === "me";
    f.holyFx?.jesus({ side: me ? "me" : "opp", garbageRows: c.garbageRows });
    f.haptic("HP-holy");
    if (!me) {
      // 상대 화면: 상단 바 아래 짧은 자막 "세상을 이기었노라 — John 16:33" (밝기는 낮추지 않는다)
      const sc = f.geo().screen ?? { x: 0, width: 1280 };
      return void f.overlay.float({ text: "세상을 이기었노라 — John 16:33", x: sc.x + sc.width / 2, y: 72, type: "h3",
        color: "#FFF8E7", rise: 0, holdMs: 2400 });
    }
    f.spiritFx?.clearVignette();
    f.mixer?.duckMusic(-18, 0.3); // 0~300ms 배경음악 −18dB
    f.later(3300, () => f.mixer?.duckMusic(0, 1.5)); // 3,300ms부터 1,500ms에 걸쳐 원래 음량
    f.sound("AUX-07");
    f.later(900, () => f.overlay.subtitle({ kind: "jesus", wide: true, verseRefs: ["John 16:33", "John 1:5"],
      holdMs: 2400 }));
  },
};
