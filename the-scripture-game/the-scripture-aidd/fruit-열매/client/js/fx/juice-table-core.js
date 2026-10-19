// juice-table-core.js — J·C 이벤트 행(시각·모션·소리·진동·감소) 정의만 (A·D·M 행은 juice-table-flow.js — D-03B 분할)
// TASK-053 | REQ-013 FR-051 FR-052 FR-061 | ARCH-005 | design-vision §4.6.1·§4.6.2·§4.8 | RTM §5 DCL-008
// 행 = (f, c) => void. f = juice.js 실행 환경(모듈·sound·hs·shk·fl·haptic·reduced), c = 이벤트 문맥(각 행 주석).
// 공통 c.side = "me" | "opp" (기본 "me"). 보드 칸 좌표는 엔진 그대로(x 0~9, y 0~19).
import * as M from "./board-motion.js";
import { BLOCK_COLORS } from "../render/block-textures.js";

/** 콤보 단계 (C-05 1~2 · C-06 3~4 · C-07 5~6 · C-08 ≥ 7) @param {number} combo */
export const comboStage = (combo) => (combo >= 7 ? 4 : combo >= 5 ? 3 : combo >= 3 ? 2 : combo >= 1 ? 1 : 0);
/**
 * C-12 판정: 10칸 중 9칸 찬 줄("한 칸만 빈 줄") — 3줄 이상이면 니어미스 (combo ≥ 3이 끊기는 고정 순간에 호출자가 확인)
 * @param {ArrayLike<number>} cells @param {number} width @returns {number[]} 그런 줄 y
 */
export function nearMissRows(cells, width) {
  const out = [];
  for (let y = 0; y * width < cells.length; y += 1) {
    let filled = 0;
    for (let x = 0; x < width; x += 1) if (cells[y * width + x] > 0) filled += 1;
    if (filled === width - 1) out.push(y);
  }
  return out;
}
const shardColor = (code) => BLOCK_COLORS[code]?.base ?? 0xf6d98b;

/** C-01~C-04 공통 줄 삭제 @param {any} f @param {{ rows: number[], combo?: number, prevCells?: ArrayLike<number> }} c */
function clearLines(f, c, n) {
  const b = f.board(c.side);
  if (!b) return;
  const tetris = n >= 4;
  // FL-1 흰 덮개: 70ms 유지 후 80ms 소멸 (C-04: 덮개 투명도 1.0 + HS-3 정지)
  f.fl("FL-1", { board: b, rows: c.rows, instant: tetris, peak: tetris ? 1 : undefined, holdMs: 70, downMs: 80 });
  if (tetris) f.hs("HS-3");
  f.later(tetris ? 80 : 0, () => {
    for (const y of c.rows) {
      for (let x = 0; x < b.o.cols; x += 1) {
        const p = b.cellCenter(x, y);
        // PT-shard 지운 칸마다 4 (테트리스 6), 블록 바탕색 — 감소 모드 ×0.5는 particles가 적용
        f.particles.emit("PT-shard", { x: p.x, y: p.y, count: tetris ? 6 : 4,
          color: shardColor(c.prevCells?.[y * b.o.cols + x]) });
      }
    }
    if (n === 3) f.particles.emit("PT-spark", { ...b.cellCenter(4.5, c.rows[0]), count: 12 });
  });
  M.collapse(f.pixi, b, c.rows, 150, !f.reduced);
  f.sound("SFX-07", { lines: n, combo: c.combo ?? 0 });
  if (n === 2 && !f.reduced) f.shk("SHK-1", b);
  if (n === 3 && !f.reduced) f.shk("SHK-2", b);
  f.haptic(n === 1 ? "HP-light" : n < 4 ? "HP-mid" : "HP-heavy");
}

/** C-05~C-08 콤보 단계 @param {any} f @param {{ combo: number }} c */
function combo(f, c) {
  const st = comboStage(c.combo);
  const b = f.me();
  const style = [null, { size: 36, color: "#FFF8E7" }, { size: 44, color: "#F6D98B" },
    { size: 52, color: "#E8B84A", glow: "0 0 16px rgba(232,184,74,.55)" },
    { size: 64, color: "#FFFFFF", glow: "0 0 32px rgba(246,217,139,.65)",
      shadow: f.reduced ? "" : "-2px 0 #E8304A, 2px 0 #3D7BFF" }][st];
  f.overlay.callout({ kind: "combo", text: `${c.combo} COMBO`, ...style, jitterPx: st - 1 });
  f.sound("SFX-08", { combo: c.combo });
  f.bgm?.setCombo(c.combo);
  // §4.6.2 배경 P1 밝기 +10%·+20%·+30% (background.setCombo는 1당 +5%)
  f.background?.setCombo([0, 0, 2, 4, 6][st]);
  if (st >= 2 && b) {
    const p = b.cellCenter(8, 1);
    f.particles.emit("PT-spark", { ...p, count: [0, 0, 16, 28, 40][st] });
    f.hs(["", "", "HS-1", "HS-2", "HS-4"][st]);
    if (!f.reduced) f.shk(["", "", "SHK-1", "SHK-2", "SHK-3"][st], b);
    M.borderPulse(f.pixi, b, st === 4 ? "loop" : "once", st === 4 && !f.reduced);
    f.haptic(["", "", "HP-tap", "HP-mid", "HP-heavy"][st]);
  }
}

export const CORE = {
  /** J-01 이동 성공 {dx: −1|1} — setActive(새 위치) 직후 */
  "J-01"(f, c) {
    M.slideActive(f.pixi, f.me(), c.dx ?? 0, f.reduced ? 0 : 60);
    f.sound("SFX-01");
  },
  /** J-01b 이동 막힘 {dir} */
  "J-01b"(f, c) {
    if (!f.reduced) M.bumpActive(f.pixi, f.me(), c.dir ?? 1);
    f.sound("SFX-01", { blocked: true });
  },
  /** J-02 회전 성공 {prev: 이전 블록, dir: "cw"|"ccw", kick: boolean, kickDir?: −1|1} */
  "J-02"(f, c) {
    const b = f.me();
    if (!f.reduced) {
      if (c.prev) M.afterimage(f.pixi, b, { piece: c.prev });
      M.turnActive(f.pixi, b, "spin", c.dir === "ccw" ? -1 : 1);
    }
    if (c.kick && c.prev) {
      const p = b.cellCenter(c.prev.x + (c.kickDir > 0 ? 3 : 0), c.prev.y + 1);
      f.particles.emit("PT-dust", { ...p, count: 4 });
    }
    f.sound("SFX-02", { dir: c.dir, kick: !!c.kick });
  },
  /** J-03 회전 실패 {cells: 활성 블록 칸} — 테두리 #9C93B3 섬광 1회 */
  "J-03"(f, c) {
    const b = f.me();
    f.fl("FL-1", { board: b, cells: c.cells ?? [], color: 0x9c93b3 });
    if (!f.reduced) M.turnActive(f.pixi, b, "wobble");
    f.sound("SFX-02", { fail: true });
  },
  /** J-04 소프트 드롭 1칸 {piece} — SFX-03 60ms에 1회까지(sfx.js) */
  "J-04"(f, c) {
    if (!f.reduced && c.piece) M.softTail(f.pixi, f.me(), c.piece);
    f.sound("SFX-03");
  },
  /** J-05 하드 드롭 {from: 시작 블록, to: 착지 블록, cells: 착지 칸} */
  "J-05"(f, c) {
    const b = f.me();
    if (c.from && c.to) M.dropTrail(f.pixi, b, c.from, c.to, f.reduced ? 0.35 : 0.7);
    const cells = c.cells ?? [];
    if (cells.length) {
      const xs = cells.map(([x]) => x);
      const bottom = Math.max(...cells.map(([, y]) => y)) + 1;
      const cx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * b.cell;
      // 충격파: 보드 컨테이너, center = 착지 블록 아래 가운데 (감소 모드 amplitude 2) — RTM §5 DCL-009 ① 고리 크기
      f.filters.shockwave(b.root, { x: cx, y: bottom * b.cell, amplitude: f.reduced ? 2 : 6, wavelength: 40,
        speed: 520, brightness: 1.15, radius: 260 });
      const left = b.cellCenter(Math.min(...xs), bottom - 0.5);
      const right = b.cellCenter(Math.max(...xs), bottom - 0.5);
      f.particles.emit("PT-dust", { ...left, count: 5, dir: Math.PI, spread: 0.8 });
      f.particles.emit("PT-dust", { ...right, count: 5, dir: 0, spread: 0.8 });
      if (!f.reduced) M.squash(f.pixi, b, cells, 1.15, "power4.in");
    }
    if (!f.reduced) f.shk("SHK-2", b, { firstDown: 4 });
    f.sound("SFX-04"); // 착지음 SFX-05는 생략
    f.haptic("HP-light");
  },
  /** J-06 착지·고정(하드 드롭 아님) {cells} */
  "J-06"(f, c) {
    const b = f.me();
    f.fl("FL-1", { board: b, cells: c.cells ?? [] });
    if (!f.reduced) M.squash(f.pixi, b, c.cells ?? [], 0.92, "back.out(2)");
    f.sound("SFX-05");
  },
  /** J-07 홀드 {piece: 홀드로 간 블록} — 홀드 상자 금 테두리 맥동 1회, 블록이 상자로 scale 1→0.5 160ms */
  "J-07"(f, c) {
    const b = f.me();
    const box = f.hudEl("hold");
    if (box) f.gsap.fromTo(box, { boxShadow: "0 0 0 0 rgba(232,184,74,0)" },
      { boxShadow: "0 0 0 3px rgba(232,184,74,1)",
      duration: 0.12, yoyo: true, repeat: 1 });
    if (!f.reduced && c.piece) {
      const h = f.geo().hold;
      const r = b.rect();
      M.afterimage(f.pixi, b, { piece: c.piece, alpha: 1, scaleTo: 0.5, ms: 160, ease: "power2.in",
        to: { x: h.x + h.w / 2 - r.x, y: h.y + h.h / 2 - r.y } });
      const a = b.activeContainer;
      f.pixi.animate(80, (k) => { a.alpha = 0.3 + 0.7 * k; });
    }
    f.sound("SFX-06");
  },
  /** J-07b 홀드 거부 — 상자 x ±3px 100ms (투명도 0.4는 HUD 상태) */
  "J-07b"(f) {
    const box = f.hudEl("hold");
    if (box && !f.reduced) f.gsap.fromTo(box, { x: -3 }, { x: 3, duration: 0.025, yoyo: true, repeat: 3,
      onComplete: () => f.gsap.set(box, { x: 0 }) });
    f.sound("SFX-06", { rejected: true });
  },
  /** J-08 새 블록 등장 {preview?: PiecePreview, step?: px} — 다음 목록 y 120ms, 새 블록 투명도 0.3→1 80ms */
  "J-08"(f, c) {
    if (f.reduced) return;
    const a = f.me().activeContainer;
    f.pixi.animate(80, (k) => { a.alpha = 0.3 + 0.7 * k; });
    const root = c.preview?.root;
    if (root) f.pixi.animate(120, (k) => { root.y = (c.step ?? 52) * (1 - k); }, { ease: "power2.out" });
  },
  /** C-01~C-04 줄 삭제 {rows, combo, prevCells} */
  "C-01": (f, c) => clearLines(f, c, 1),
  "C-02": (f, c) => clearLines(f, c, 2),
  "C-03": (f, c) => clearLines(f, c, 3),
  "C-04"(f, c) {
    clearLines(f, c, 4);
    const b = f.board(c.side);
    const mid = b.cellCenter(4.5, (Math.min(...c.rows) + Math.max(...c.rows)) / 2);
    f.later(80, () => { // t = 80ms (HS-3 뒤)
      f.filters.shockwave(f.pixi.screenRoot, { x: mid.x, y: mid.y, amplitude: f.reduced ? 3 : 10, wavelength: 60,
        speed: 700, brightness: 1.2, radius: 420 }); // RTM §5 DCL-009 ① — 최대 변위 12.5px의 빛 고리, 0.6초
      f.filters.bloom(b.root, { threshold: 0.5, bloomScale: 1.6, durationMs: 300 });
      if (!f.reduced) f.filters.rgbSplit(b.root, { red: [-4, 0], green: [0, 0], blue: [4, 0], durationMs: 150 });
      if (!f.reduced) f.shk("SHK-4");
    });
    f.overlay.callout({ kind: "tetris", text: "TETRIS", delayMs: 80 });
  },
  /** C-05~C-08 콤보 단계 {combo} — 같은 행 함수가 단계를 고른다 */
  "C-05": combo, "C-06": combo, "C-07": combo, "C-08": combo,
  /** C-09 콤보 끊김 — 배경 밝기 원래대로 600ms, BGM 콤보 반응 1마디 안에 원래대로 */
  "C-09"(f) {
    f.background?.setCombo(0);
    f.bgm?.setCombo(0);
    if (f.me()) M.borderPulse(f.pixi, f.me(), "off");
  },
  /** C-10 T-Spin {lines 1~3, cells: T 칸, b2b?} */
  "C-10"(f, c) {
    const b = f.me();
    f.fl("FL-3", { board: b });
    if (c.piece) M.afterimage(f.pixi, b, { piece: c.piece, alpha: 1, scaleTo: 1, ms: 300, glow: (g) => f.filters.glow(g,
      { distance: 16, outerStrength: 4, innerStrength: 0.5, quality: 0.25, color: 0xe8b84a }) });
    const p = c.piece ? b.cellCenter(c.piece.x + 1, c.piece.y + 1) : b.cellCenter(4.5, 10);
    // 금 PT-spark 32 나선 (감소 모드: 방사)
    for (let i = 0; i < 8; i += 1) {
      const emit = () => f.particles.emit("PT-spark", { ...p, count: 4, dir: (i / 8) * Math.PI * 2, spread: 0.5 });
      if (f.reduced) emit();
      else f.later(i * 20, emit);
    }
    const name = ["T-SPIN", "T-SPIN SINGLE", "T-SPIN DOUBLE", "T-SPIN TRIPLE"][Math.min(3, c.lines ?? 0)];
    f.overlay.callout({ kind: "tspin", text: name, delayMs: 66 });
    f.hs("HS-2");
    if (!f.reduced) f.shk("SHK-2", b);
    f.sound("SFX-09", { b2b: !!c.b2b });
    f.haptic([25, 30, 25]);
  },
  /** C-11 백투백 {center?: 가상 좌표, tspin?} — 주 콜아웃 위 띠 + FL-3 + 두 번째 충격파 고리(120ms 뒤, amplitude 7 — DCL-009 ①) */
  "C-11"(f, c) {
    const b = f.me();
    f.overlay.b2bBand(80);
    f.fl("FL-3", { board: b });
    f.hs("HS-4");
    const mid = c.center ?? b.cellCenter(4.5, 17);
    if (!f.reduced) f.later(120, () => f.filters.shockwave(f.pixi.screenRoot, { x: mid.x, y: mid.y, amplitude: 7,
      wavelength: 60, speed: 700, brightness: 1.2, radius: 420 }));
    if (!c.tspin) f.sound("SFX-09", { b2b: true }); // T-Spin B2B는 C-10이 합창 찌르기까지 냄 (30ms 중복 생략 회피)
    f.haptic("HP-heavy");
  },
  /** C-12 니어미스 콤보 끊김형 {rows: nearMissRows 결과} */
  "C-12"(f, c) {
    M.highlight(f.pixi, f.me(), { rows: c.rows ?? [] }, false);
    f.overlay.callout({ kind: "nearmiss", text: "아깝다!" });
    f.sound("AUX-06");
    f.haptic([30, 30, 30]);
  },
  /** C-13 니어미스 1칸 차이 패배형 {cells: 겹친 칸, then?: "M-03"|"M-05"|"M-07", thenCtx?} — 강조 600ms 후 M-03 */
  "C-13"(f, c) {
    M.highlight(f.pixi, f.me(), { cells: c.cells ?? [] }, !f.reduced);
    f.overlay.callout({ kind: "nearmiss", text: "아깝다!" });
    f.sound("AUX-06");
    f.haptic([30, 30, 30]);
    if (c.then && CORE[c.then]) f.later(600, () => CORE[c.then](f, c.thenCtx ?? {}));
  },
};
