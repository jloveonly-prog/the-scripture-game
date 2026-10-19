// juice-table-flow.js — A·D·M 이벤트 행(공격·위기·은혜·카운트다운·라운드·경기 — 시각·모션·소리·진동·감소) 정의만
// TASK-053 (D-03B 분할 — task-wall §3.4 #30-1) | REQ-007 REQ-013 FR-053 FR-055 FR-056 FR-058 FR-059 FR-062 | ARCH-005 |
// design-vision §4.6.3·§4.6.11·§4.6.12·§4.7.4 라운드·경기 종료·§4.8 | RTM §5 DCL-008
// 행 = (f, c) => void (juice-table-core.js 머리 주석과 같은 규약). 게임 효과는 호출자가 이미 반영했다(NFR-002).
import { Graphics } from "pixi.js";
import * as M from "./board-motion.js";
import { rules } from "../content.js";
import { buildShape } from "../art/to-pixi.js";
import { ARMOR_ICONS } from "../art/shapes-heroes-armor.js";

const top = (b) => ({ x: b.rect().x + b.width / 2, y: b.rect().y });
/** @type {WeakMap<any, Graphics>} 위기 붉은 비네트 (ScreenFx z90, 화면 가장자리 0.25) */
const vignettes = new WeakMap();
function crisisVignette(f) {
  let g = vignettes.get(f.pixi);
  if (!g) {
    g = new Graphics();
    g.alpha = 0;
    f.pixi.layers.screenFx.addChild(g);
    vignettes.set(f.pixi, g);
  }
  const s = f.geo().screen ?? { x: 0, y: 0, width: 1280, height: 720 };
  g.clear();
  for (let i = 0; i < 6; i += 1) {
    const d = i * 10;
    g.rect(s.x + d, s.y + d, s.width - 2 * d, s.height - 2 * d).stroke({ width: 10, color: 0xe5484d, alpha: 1 - i / 6,
      alignment: 1 });
  }
  return g;
}
/** M-04·M-05 공통: 배경음악 1,000ms 페이드 아웃 → 팡파르/패배음 @param {string} sfx */
function endMusic(f, sfx, o) {
  f.bgm?.stop(1000);
  f.later(1000, () => f.sound(sfx, o));
}

export const FLOW = {
  /** A-01 공격 발사 {garbage, power} — 내 보드 위 가운데 → 상대 보드 위 가운데 */
  "A-01"(f, c) {
    const me = f.me();
    const opp = f.opp();
    f.sound("SFX-10");
    f.haptic("HP-tap");
    if (!me || !opp || !(c.garbage > 0)) return;
    f.arrows.fly({ from: top(me), to: top(opp), count: c.garbage, power: c.power ?? c.garbage, toSide: "opp",
      onArrive: (i) => {
        if (i !== 0) return;
        f.fl("FL-2", { board: opp, color: 0xe5484d });
        f.filters.shockwave(opp.root, { x: opp.width / 2, y: 0, amplitude: 8 });
        f.sound("SFX-11", { db: -10 });
      } });
  },
  /** A-02 공격 받음 {garbage, power} — 내 보드 붉은 FL-2·SHK-3, 받을 공격 막대 자람·맥동, 화살은 상대 → 나 */
  "A-02"(f, c) {
    const me = f.me();
    const opp = f.opp();
    f.fl("FL-2", { board: me, color: 0xe5484d });
    if (!f.reduced) f.shk("SHK-3", me);
    const bar = f.hudEl("pending");
    if (bar) {
      f.gsap.fromTo(bar, { scaleY: 0.9, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.2,
        ease: "power2.out" });
      if (!f.reduced) f.gsap.to(bar, { opacity: 0.6, duration: 0.4, ease: "sine.inOut", yoyo: true, repeat: 1,
        delay: 0.2 });
    }
    f.ui("pendingSweep", { ms: rules.garbage.delayMs }); // 막대 위 흰 선이 delayMs 동안 위→아래로 훑음 (HUD)
    if (opp && c.garbage > 0) f.arrows.fly({ from: top(opp), to: top(me), count: c.garbage, power: c.power ?? c.garbage,
      palette: "dark", toSide: "me" });
    f.sound("SFX-11");
    f.haptic("HP-hit");
  },
  /** A-03 대기 공격 상쇄 {n} — 막대 위쪽 칸이 금 PT-spark 8개씩으로 부서짐 + "−n 상쇄" */
  "A-03"(f, c) {
    const g = f.geo().pending;
    if (g) {
      const k = g.h / 20;
      for (let i = 0; i < (c.n ?? 1); i += 1) {
        f.later(i * 40, () => f.particles.emit("PT-spark", { x: g.x + g.w / 2, y: g.y + g.h - (i + 0.5) * k,
          count: f.reduced ? 2 : 8 }));
      }
      f.overlay.float({ text: `−${c.n} 상쇄`, x: g.x + g.w + 30, y: g.y + g.h - 40, type: "caption", color: "#F6D98B" });
    }
    f.sound("SFX-10", { variant: "cancel" });
    f.haptic("HP-tap");
  },
  /** A-04 가운데 충돌 상쇄 {canceled, garbage} — 금 화살 ↔ 어두운 화살이 충돌점에서 만남 */
  "A-04"(f, c) {
    const me = f.me();
    const opp = f.opp();
    const p = f.geo().collision;
    f.sound("AUX-15");
    f.haptic("HP-mid");
    if (!me || !opp || !p) return;
    const n = Math.max(1, c.canceled ?? 1);
    f.arrows.fly({ from: top(me), to: p, count: n, durationMs: 240, lift: 60 });
    f.arrows.fly({ from: top(opp), to: p, count: n, palette: "dark", durationMs: 240, lift: 60, onArrive: (i) => {
      if (i !== 0) return;
      f.filters.shockwave(f.pixi.screenRoot, { x: p.x, y: p.y, amplitude: f.reduced ? 8 : 20, radius: 200 });
      f.particles.emit("PT-spark", { ...p, count: 20 });
      f.particles.emit("PT-spark", { ...p, count: 20, color: 0xffffff });
      f.arrows.ring(p);
      if (!f.reduced) f.shk("SHK-2", "screen");
      if (c.garbage > 0) f.arrows.fly({ from: p, to: top(opp), count: c.garbage, toSide: "opp", lift: 60 });
    } });
  },
  /** A-05 쓰레기 줄 상승 {rows} — setCells 뒤 */
  "A-05"(f, c) {
    const b = f.board(c.side);
    M.rise(f.pixi, b, c.rows ?? 1, !f.reduced);
    f.particles.emit("PT-dust", { x: b.rect().x + b.width / 2, y: b.rect().y + b.height, area: { w: b.width, h: 4 },
      count: 20, dir: -Math.PI / 2, spread: 1.2 });
    if (!f.reduced) f.shk("SHK-2", b);
    f.sound("SFX-05", { garbage: true, rows: c.rows ?? 1 });
    f.haptic("HP-mid");
  },
  /** A-05b 상승 무효 (베드로 반석) */
  "A-05b"(f) {
    const b = f.me();
    const r = b.rect();
    f.particles.emit("PT-dust", { x: r.x + r.width / 2, y: r.y + r.height, area: { w: r.width, h: 6 }, count: 16,
      color: 0xa9b4c4 });
    f.overlay.float({ text: "무효", x: r.x + r.width / 2, y: r.y + r.height - 40, type: "h3", color: "#A9B4C4" });
    f.sound("SFX-14", { hero: "peter", rockOnly: true, db: -10 });
    f.haptic("HP-tap");
  },
  /** A-06 방어 완전 차단 {side: 막은 쪽, by: "shield_of_faith"|"michael"} — 방패 아이콘 96px 또는 미가엘 빛의 검 */
  "A-06"(f, c) {
    const side = c.side ?? "me";
    const b = f.board(side);
    if (!b) return;
    const r = b.rect();
    const k = side === "me" ? 1 : 0.6; // 보낸 쪽: 상대 보드 앞에서 같은 그림 축소
    if (c.by === "michael") f.holyFx?.slash(side);
    else {
      const size = 96 * k;
      const icon = buildShape(ARMOR_ICONS.shield_of_faith, size);
      icon.pivot.set(size / 2, size / 2);
      icon.position.set(r.x + r.width / 2, r.y + 80 * k);
      f.pixi.layers.projectile.addChild(icon);
      f.pixi.animate(160, (t) => { icon.scale.set(0.6 + 0.4 * t); }, { ease: f.ease("back.out(2)") });
      f.pixi.animate(200, (t) => { icon.alpha = 1 - t; }, { delayMs: 560, onComplete: () => icon.destroy() });
    }
    f.particles.emit("PT-ember", { x: r.x + r.width / 2, y: r.y + 80 * k, count: 20, color: 0xf6d98b });
    if (side === "me") f.overlay.float({ text: "차단", x: r.x + r.width / 2, y: r.y + 150, type: "h2", color: "#F6D98B",
      scaleFrom: 0.6, ease: "back.out(2)" });
    if (!f.reduced) f.shk("SHK-1", b);
    f.sound("AUX-13", side === "me" ? {} : { db: -12 });
    if (side === "me") f.haptic("HP-mid");
  },
  /** A-07 되돌림 {garbage} — #7FD3FF 화살 내 보드 → 상대 보드 */
  "A-07"(f, c) {
    const me = f.me();
    const opp = f.opp();
    if (opp) f.arrows.fly({ from: top(me), to: top(opp), count: c.garbage ?? 1, palette: "reflect", toSide: "opp" });
    f.overlay.float({ text: "되돌림", x: top(me).x, y: top(me).y + 120, type: "h3", color: "#7FD3FF" });
    f.sound("SFX-10", { variant: "reflect" });
    f.haptic("HP-mid");
  },
  /** A-08 은혜 경감 — 연출 없음 (FR-062 은은하게, D-03 비둘기만) */
  "A-08"() {},
  /** D-01 위기 진입 {severe, enter} — 심장박동 AUX-01 반복·BGM 위기 층·가장자리 붉은 비네트 0.25 (보드 테두리는 render) */
  "D-01"(f, c) {
    f.aux?.setHeartbeat(true, !!c.severe);
    f.bgm?.setCrisis(true);
    const g = crisisVignette(f);
    f.pixi.animate(300, (k) => { g.alpha = Math.max(g.alpha, 0.25 * k); });
    if (c.enter !== false) f.haptic([20, 100, 30]);
  },
  /** D-02 위기 해제 — 600ms 소멸, AUX-01 정지, 위기 층 해제 */
  "D-02"(f) {
    f.aux?.setHeartbeat(false);
    f.bgm?.setCrisis(false);
    const g = vignettes.get(f.pixi);
    if (g) {
      const a0 = g.alpha;
      f.pixi.animate(600, (k) => { g.alpha = a0 * (1 - k); });
    }
  },
  /** D-03 은혜 적용 {on} — 비둘기 아이콘만 (글자·소리 없음) */
  "D-03"(f, c) {
    f.overlay.grace(c.on !== false);
  },
  /** M-01 카운트다운 {countdownMs = 3000, round} — "3"·"2"·"1" → "STAND!"(D3-15) + 보드 프레임 금빛 위→아래 */
  "M-01"(f, c) {
    for (const b of [f.me(), f.opp()]) if (b) M.resetBoard(b);
    const ms = c.countdownMs ?? 3000;
    [3, 2, 1].forEach((n, i) => f.later((ms / 3) * i, () => {
      f.overlay.countdown({ text: String(n), round: c.round });
      f.sound("SFX-15");
      f.haptic("HP-tap");
    }));
    f.later(ms, () => {
      f.overlay.countdown({ text: "STAND!", stand: true });
      f.sound("SFX-15", { kind: "start" });
      if (f.bgm && f.bgm.scene !== "battle") f.bgm.play("battle");
      else f.bgm?.resumeRound();
      const b = f.me();
      if (!b) return;
      const line = new Graphics().rect(-3, 0, b.width + 6, 6).fill({ color: 0xe8b84a, alpha: 0.8 });
      b.layers.fx.addChild(line);
      f.pixi.animate(300, (k) => { line.y = b.height * k; line.alpha = 1 - k * 0.6; }, { ease: "power2.out",
        onComplete: () => line.destroy() });
    });
  },
  /** M-02 라운드 승리 {round} — 흰·금 원형 빛 터짐 + "ROUND n — 승리" + 상대 보드 M-03 축소판 */
  "M-02"(f, c) {
    const b = f.me();
    const r = b.rect();
    const burst = new Graphics().circle(0, 0, r.height / 2).fill(0xfff8e7).circle(0, 0, r.height / 3).fill(0xf6d98b);
    burst.position.set(r.x + r.width / 2, r.y + r.height / 2);
    f.pixi.layers.screenFx.addChild(burst);
    const a0 = f.reduced ? 0.3 : 0.6;
    f.pixi.animate(500, (k) => { burst.alpha = a0 * (1 - k); burst.scale.set(0.6 + 0.4 * k); }, {
      onComplete: () => burst.destroy() });
    f.overlay.banner({ text: `ROUND ${c.round ?? 1} — 승리`, type: "h1", color: "#F6D98B", holdMs: 1600 });
    if (f.opp()) M.crumble(f.pixi, f.filters, f.opp(), { reduced: f.reduced });
    f.ui("roundWin", { round: c.round });
    f.bgm?.pauseRound();
    f.sound("SFX-16", { short: true });
    f.haptic("HP-mid");
  },
  /** M-03 라운드 패배 {fallMs?} — 회색으로 굳음 → 무너짐, PT-dust 20, SHK-2 */
  "M-03"(f, c) {
    const b = f.me();
    M.crumble(f.pixi, f.filters, b, { fallMs: c.fallMs, reduced: f.reduced });
    const r = b.rect();
    f.particles.emit("PT-dust", { x: r.x + r.width / 2, y: r.y + r.height, area: { w: r.width, h: 6 }, count: 20 });
    if (!f.reduced) f.shk("SHK-2", b);
    f.bgm?.pauseRound();
    if (!c.silent) f.sound("SFX-17", { short: true });
    f.haptic([120]);
  },
  /** M-04 경기 승리 {firstTwoOnly?} — FL-4 흰빛 + Bloom 600ms + 콘페티 3회 + "VICTORY" + victoryVerseRef 구절 */
  "M-04"(f, c) {
    f.fl("FL-4", { edge: f.reduced });
    if (!f.reduced) f.filters.bloom(f.pixi.screenRoot, { threshold: 0.5, bloomScale: 1.6, durationMs: 600 });
    f.confetti?.victory({ reduced: f.reduced, firstTwoOnly: !!c.firstTwoOnly });
    f.overlay.banner({ text: "VICTORY", type: "callout-xl", gold: true, verseRef: rules.victoryVerse, scaleFrom: 1.6,
      holdMs: 2500 });
    endMusic(f, "SFX-16");
    f.haptic("HP-win");
    f.ui("toResult", { afterMs: 2500 });
  },
  /** M-05 경기 패배 — M-03을 1,400ms로 느리게 + "DEFEAT"(Cinzel 900 72px #B9B0CC — 붉은색 쓰지 않음) */
  "M-05"(f) {
    FLOW["M-03"](f, { fallMs: 1400, silent: true });
    f.overlay.banner({ text: "DEFEAT", type: "callout-l", color: "#B9B0CC", holdMs: 2000 });
    endMusic(f, "SFX-17");
    f.haptic("HP-lose");
    f.ui("toResult", { afterMs: 2000 });
  },
  /** M-06 상대 이탈 승리 — 상대 보드가 재처럼 회색·투명도 0.2 + "상대가 나갔습니다" 800ms → M-04 (콘페티 ①②만) */
  "M-06"(f) {
    const o = f.opp();
    if (o) {
      const adj = f.filters.adjustment(o.root, { saturation: 1 });
      f.pixi.animate(800, (k) => { if (adj) adj.filter.saturation = 1 - k; o.root.alpha = 1 - 0.8 * k; });
    }
    f.overlay.banner({ text: "상대가 나갔습니다", type: "h2", holdMs: 800 });
    f.later(800, () => {
      f.confetti?.victory({ reduced: f.reduced, firstTwoOnly: true });
      f.overlay.banner({ text: "VICTORY", type: "callout-xl", gold: true, scaleFrom: 1.6, holdMs: 1000 });
    });
    endMusic(f, "SFX-16");
    f.haptic("HP-win");
    f.ui("toResult", { afterMs: 1800 });
  },
  /** M-07 연습 종료 — M-03 + "연습 종료"(type.callout-ko #F4EFE3), SFX-17 앞 2음 −6dB */
  "M-07"(f) {
    FLOW["M-03"](f, { silent: true });
    f.overlay.banner({ text: "연습 종료", type: "callout-ko", color: "#F4EFE3", holdMs: 1600 });
    f.sound("SFX-17", { short: true, db: -6 });
    f.ui("toResult", { afterMs: 1600 });
  },
};
