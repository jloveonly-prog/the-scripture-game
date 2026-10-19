// juice-table-quiz.js — Q·X·R-07·RX·AC·RT·GR·SV·UI 이벤트 행 정의만
// TASK-053 (D-03B 분할 — task-wall §3.4 #31-1) | REQ-009 REQ-011 REQ-012 REQ-013 FR-036 FR-040~FR-047 FR-064 FR-065
// FR-078 | ARCH-005 | design-vision §4.6.6 R-07·§4.6.9·§4.6.10·§4.6.13·§4.7.4 말씀 대결 | RTM §5 DCL-008
// 퀴즈 모달·결과 화면 요소는 03-C가 만든다 — 행은 넘겨받은 요소(c.el)에 GSAP 모션(transform·opacity·filter)만 건다.
import { Graphics } from "pixi.js";
import { armorById } from "../content.js";
import { buildShape } from "../art/to-pixi.js";
import { ARMOR_ICONS } from "../art/shapes-heroes-armor.js";

/** @type {WeakMap<any, any[]>} Q-01 보드 정지 필터 */
const frozen = new WeakMap();

/** Q-01·Q-10 두 보드 AdjustmentFilter saturation 0.3·brightness 0.55 (200ms) @param {boolean} on */
function freezeBoards(f, on) {
  const list = frozen.get(f.pixi) ?? [];
  if (on) {
    for (const b of [f.me(), f.opp()]) {
      const h = b && f.filters.adjustment(b.root, { saturation: 1, brightness: 1 });
      if (!h) continue;
      list.push(h);
      f.pixi.animate(200, (k) => Object.assign(h.filter, { saturation: 1 - 0.7 * k, brightness: 1 - 0.45 * k }));
    }
    frozen.set(f.pixi, list);
    return;
  }
  frozen.set(f.pixi, []);
  for (const h of list) {
    const { saturation: s0, brightness: b0 } = h.filter;
    f.pixi.animate(200, (k) => Object.assign(h.filter, { saturation: s0 + (1 - s0) * k,
      brightness: b0 + (1 - b0) * k }),
      { onComplete: () => h.release() });
  }
}

/** 모달 가운데 위 (c.at 가상 좌표 — 없으면 콜아웃 기준점 위) */
const modalTop = (f, c) => c.at ?? { x: f.geo().callout.x, y: 200 };

export const QUIZ = {
  /** Q-00 말씀 칸 삭제 {from: 말씀 칸 가상 좌표, cell?: [x,y]} — 금빛 줄기(폭 6, GLW-holy) 화면 가운데로 300ms expo.out */
  "Q-00"(f, c) {
    if (f.reduced || !c.from) {
      if (c.cell) f.fl("FL-1", { board: f.me(), cells: [c.cell], color: 0xf6d98b });
      return;
    }
    const s = f.geo().screen ?? { x: 0, y: 0, width: 1280, height: 720 };
    const to = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
    const g = new Graphics();
    f.pixi.layers.holy.addChild(g);
    f.pixi.animate(300, (k) => {
      g.clear().moveTo(c.from.x, c.from.y).lineTo(c.from.x + (to.x - c.from.x) * k, c.from.y + (to.y - c.from.y) * k)
        .stroke({ width: 6, color: 0xf6d98b });
    }, { ease: "expo.out" });
    f.pixi.animate(200, (k) => { g.alpha = 1 - k; }, { delayMs: 300, onComplete: () => g.destroy() });
  },
  /** Q-01 말씀 대결 열림 {modal?: HTMLElement} — 두 보드 정지 표시, 모달 0.9→1 260ms back.out(1.4), BGM −12dB·800Hz */
  "Q-01"(f, c) {
    freezeBoards(f, true);
    if (c.modal) f.gsap.fromTo(c.modal, { scale: f.reduced ? 1 : 0.9, opacity: 0 }, { scale: 1, opacity: 1,
      duration: 0.26,
      ease: f.ease("back.out(1.4)") });
    f.mixer?.duckMusic(-12, 0.2);
    f.mixer?.setMusicLowpass(800, 0.2);
    f.sound("AUX-02");
    f.haptic("HP-mid");
  },
  /** Q-02 보기 선택 {el} — scale 0.96→1 80ms */
  "Q-02"(f, c) {
    if (c.el) f.gsap.fromTo(c.el, { scale: 0.96 }, { scale: 1, duration: 0.08 });
    f.sound("AUX-14");
    f.haptic("HP-tap");
  },
  /** Q-03 오답 {el} — 고른 보기 x ±8px 4번 왕복 280ms (잠금 막대·색은 모달 몫) */
  "Q-03"(f, c) {
    if (c.el && !f.reduced) f.gsap.fromTo(c.el, { x: -8 }, { x: 8, duration: 0.035, yoyo: true, repeat: 7,
      onComplete: () => f.gsap.set(c.el, { x: 0 }) });
    f.sound("AUX-04");
    f.haptic([60]);
  },
  /** Q-04 잠금 해제 {els} — 테두리 흰 섬광 1회 120ms */
  "Q-04"(f, c) {
    for (const el of c.els ?? []) f.gsap.fromTo(el, { boxShadow: "0 0 0 2px #FFFFFF" }, { boxShadow: "0 0 0 0 #FFFFFF",
      duration: 0.12 });
  },
  /** Q-05 내가 승리 {reward: {kind: "gauge"|"armor", amount?, armorId?}, at?} — "말씀의 승리!" + 보상 비행 + PT-spark 40 */
  "Q-05"(f, c) {
    const p = modalTop(f, c);
    f.overlay.float({ text: "말씀의 승리!", x: p.x, y: p.y, type: "h1", color: "#F6D98B", scaleFrom: 1.4, ease: "expo.out",
      glow: "0 0 32px rgba(246,217,139,.65)", rise: 0, holdMs: 1400 });
    f.particles.emit("PT-spark", { x: p.x, y: p.y, count: 40 });
    const g = f.geo().gauge;
    if (c.reward?.kind === "gauge" && g) {
      const el = f.overlay.float({ text: `+${c.reward.amount ?? 50}`, x: p.x, y: p.y + 60, type: "h2", color: "#F6D98B",
        rise: 0, holdMs: 450 });
      if (!f.reduced) f.gsap.to(el, { left: g.x, top: g.y + g.h / 2, duration: 0.45, ease: "power2.inOut" });
    }
    if (c.reward?.kind === "armor") QUIZ["R-07"](f, { armorId: c.reward.armorId, from: p });
    f.sound("AUX-05");
    f.haptic("HP-holy");
  },
  /** Q-06 상대 승리 — "상대가 먼저 맞혔습니다"(type.h2 #B9B0CC) */
  "Q-06"(f, c) {
    const p = modalTop(f, c);
    f.overlay.float({ text: "상대가 먼저 맞혔습니다", x: p.x, y: p.y, type: "h2", color: "#B9B0CC", rise: 0, holdMs: 1400 });
    f.sound("AUX-02", { single: true, db: -10 });
  },
  /** Q-07 니어미스 {gapMs, at?} — "0.12초 차이!" (늦게 맞힌 쪽에만, FR-042) + SHK-1 */
  "Q-07"(f, c) {
    const p = modalTop(f, c);
    f.overlay.gap({ gapMs: c.gapMs ?? 0, x: p.x, y: p.y - 70 });
    if (!f.reduced) f.shk("SHK-1", "screen");
    f.sound("AUX-06");
    f.haptic([30, 30, 30]);
  },
  /** Q-08 정답자 없음 — "아무도 맞히지 못했습니다"(type.h2 #9C93B3) */
  "Q-08"(f, c) {
    const p = modalTop(f, c);
    f.overlay.float({ text: "아무도 맞히지 못했습니다", x: p.x, y: p.y, type: "h2", color: "#9C93B3", rise: 0,
      holdMs: 1400 });
    f.sound("AUX-04", { db: -8 });
  },
  /** Q-09 해설·재개 대기 — 모달 내용(03-C)만, 소리 없음 */
  "Q-09"() {},
  /** Q-10 재개 {modal?} — 모달 200ms power2.in 닫힘, 보드 필터 해제 200ms, 배경음악 원래대로 400ms */
  "Q-10"(f, c) {
    freezeBoards(f, false);
    if (c.modal) f.gsap.to(c.modal, { opacity: 0, duration: 0.2, ease: "power2.in" });
    f.mixer?.duckMusic(0, 0.4);
    f.mixer?.setMusicLowpass(20000, 0.4);
  },
  /** Q-11 남은 시간 3초 {el?} — 매초 AUX-03, 숫자 맥동 1.1→1 */
  "Q-11"(f, c) {
    if (c.el && !f.reduced) f.gsap.fromTo(c.el, { scale: 1.1 }, { scale: 1, duration: 0.3 });
    f.sound("AUX-03");
  },
  /** X-01 특수 칸 등장 — 맥동은 board-view(03-A) 몫 */
  "X-01"() {},
  /** X-02 말씀 칸 삭제 = Q-00 */
  "X-02": (f, c) => QUIZ["Q-00"](f, c),
  /** X-03 여리고 나팔 칸 삭제 {cell: [x,y], radius = rules.specials.jericho.radius} — 소리 고리 3개 + 3×3 폭파 + "+1 여리고" */
  "X-03"(f, c) {
    const b = f.me();
    const [cx, cy] = c.cell ?? [4, 18];
    const p = b.cellCenter(cx, cy);
    const n = f.reduced ? 1 : 3;
    for (let i = 0; i < n; i += 1) {
      const g = new Graphics();
      f.pixi.layers.projectile.addChild(g);
      f.pixi.animate(400, (k) => { g.clear().circle(p.x, p.y, Math.max(1, 120 * k)).stroke({ width: 3, color: 0xf2b26e,
        alpha: 1 - k }); }, { delayMs: i * 120, onComplete: () => g.destroy() });
    }
    const r = c.radius ?? 1;
    for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
      f.particles.emit("PT-shard", { ...b.cellCenter(cx + dx, cy + dy), count: 4, color: 0xf2b26e });
    }
    f.overlay.float({ text: "+1 여리고", x: p.x, y: p.y - 40, type: "h3", color: "#F2B26E" });
    if (!f.reduced) f.shk("SHK-3", b);
    f.sound("AUX-08");
    f.haptic("HP-heavy");
  },
  /** X-04 만나 칸 삭제 {cell, gauge = 25} — 흰 PT-flake 24가 믿음 게이지로 휘어 올라감 + "+25 만나" */
  "X-04"(f, c) {
    const b = f.me();
    const p = b.cellCenter(...(c.cell ?? [4, 18]));
    const g = f.geo().gauge;
    f.particles.emit("PT-flake", { ...p, count: 24, target: g ? { x: g.x + g.w / 2, y: g.y + g.h / 2 } : undefined });
    f.overlay.float({ text: `+${c.gauge ?? 25} 만나`, x: p.x, y: p.y - 40, type: "h3", color: "#FFF8E7" });
    f.sound("AUX-09");
    f.haptic("HP-light");
  },
  /** X-05 갑주 칸 삭제 = R-07 */
  "X-05": (f, c) => QUIZ["R-07"](f, c),
  /** X-06 단계 해금 첫 등장 {text: "새 축복: 말씀 블록" 등} — 카운트다운 아래 한 줄 2,000ms */
  "X-06"(f, c) {
    f.overlay.banner({ text: c.text ?? "", type: "h3", color: "#F6D98B", y: f.geo().callout.y + 120, holdMs: 2000 });
    f.sound("AUX-12");
  },
  /** R-07 갑주 획득 {armorId, from: 가상 좌표, to?: 슬롯 가상 좌표} — PT-spark 24 → 아이콘 베지어 450ms → 슬롯 팝 */
  "R-07"(f, c) {
    const ar = armorById.get(c.armorId);
    const from = c.from ?? f.me().cellCenter(4.5, 18);
    const to = c.to ?? { x: 144, y: 482 };
    f.particles.emit("PT-spark", { ...from, count: 24 });
    if (ar && !f.reduced) {
      const icon = buildShape(ARMOR_ICONS[c.armorId], 48);
      icon.pivot.set(24, 24);
      f.pixi.layers.holy.addChild(icon);
      const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 120 };
      f.pixi.animate(450, (k) => {
        const u = 1 - k;
        icon.position.set(u * u * from.x + 2 * u * k * mid.x + k * k * to.x,
          u * u * from.y + 2 * u * k * mid.y + k * k * to.y);
      }, { ease: "power2.inOut", onComplete: () => icon.destroy() });
    }
    const slot = f.hudEl("armorSlot", c.armorId);
    if (slot) f.gsap.fromTo(slot, { scale: f.reduced ? 1 : 1.3, opacity: f.reduced ? 0 : 1 }, { scale: 1, opacity: 1,
      duration: 0.3, ease: f.ease("back.out(2)"), delay: f.reduced ? 0 : 0.45 });
    if (ar) f.overlay.float({ text: `전신갑주: ${ar.name_ko}`, x: to.x + 120, y: to.y, type: "caption", color: "#F6D98B",
      rise: 0, holdMs: 1200 });
    f.sound("AUX-09");
    f.haptic("HP-mid");
  },
  /** RX-01 리액션 보내기 {reactionId, el?} */
  "RX-01"(f, c) {
    if (c.el && !f.reduced) f.gsap.fromTo(c.el, { scale: 0.8 }, { scale: 1, duration: 0.16, ease: "back.out(2)" });
    f.reactions?.send(c.reactionId);
    f.sound("AUX-10");
    f.haptic("HP-tap");
  },
  /** RX-02 리액션 받기 {reactionId} */
  "RX-02"(f, c) {
    f.reactions?.receive(c.reactionId);
    f.sound("AUX-10", { db: -6 });
  },
  /** AC-01 업적 달성 {el: 인장, origin?: 0~1} — 인장 scale 1.6→1 400ms elastic + 충격파 고리 + 콘페티 40 */
  "AC-01"(f, c) {
    if (c.el) {
      f.gsap.fromTo(c.el, { scale: f.reduced ? 1 : 1.6, opacity: 0 }, { scale: 1, opacity: 1,
        duration: f.reduced ? 0.2 : 0.4,
        ease: f.ease("elastic.out(1, 0.45)") });
      f.gsap.fromTo(c.el, { boxShadow: "0 0 0 0 rgba(232,184,74,.8)" }, { boxShadow: "0 0 0 40px rgba(232,184,74,0)",
        duration: 0.5, delay: 0.3 });
    }
    f.confetti?.burst(c.origin);
    f.sound("AUX-12");
    f.haptic("HP-mid");
  },
  /** RT-01 레이팅 변화 {el, from, to} — 900ms power2.out 숫자 보간 (감소: 최종값), 오를 때 AUX-05 −10dB */
  "RT-01"(f, c) {
    if (!c.el) return;
    const o = { v: c.from };
    if (f.reduced) c.el.textContent = String(c.to);
    else f.gsap.to(o, { v: c.to, duration: 0.9, ease: "power2.out",
      onUpdate: () => { c.el.textContent = String(Math.round(o.v)); } });
    if (c.to > c.from) f.sound("AUX-05", { db: -10 });
  },
  /** GR-01 성장 수치 {rows: 요소들} — 행마다 120ms 간격 투명도 (감소: 동시) */
  "GR-01"(f, c) {
    if (!c.rows?.length) return;
    f.gsap.fromTo(c.rows ?? [], { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: f.reduced ? 0 : 0.12 });
  },
  /** SV-01 저장 실패 {el} — 경고 띠 200ms + AUX-11 */
  "SV-01"(f, c) {
    if (c.el) f.gsap.fromTo(c.el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    f.sound("AUX-11");
  },
  /** UI-01 메뉴 버튼 누름 {el} — 눌림 60ms + AUX-14 + 터치 시 HP-tap */
  "UI-01"(f, c) {
    if (c.el) f.gsap.fromTo(c.el, { scale: 0.96 }, { scale: 1, duration: 0.06 });
    f.sound("AUX-14");
    f.haptic("HP-tap");
  },
};
