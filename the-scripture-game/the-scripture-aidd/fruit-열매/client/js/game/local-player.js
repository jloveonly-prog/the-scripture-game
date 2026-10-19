// local-player.js — 엔진 루프·입력 적용·`state`/`clear`/`topout` 송신만
// TASK-065 | REQ-001 REQ-007~REQ-012 FR-001~FR-006 FR-008 FR-010 FR-015 FR-034 FR-035 FR-044 FR-055 NFR-002 |
// ARCH-003 |
// API-012 API-013 API-018 API-019 | design-vision §4.6.1 J·§4.6.2 C·§4.6.10 X-02·§4.6.11 D | D-07 D-12 | RTM §5 DCL-004
// 보드·점수·콤보·홀드·다음 블록은 로컬 엔진이 원천(D-07). 엔진 틱은 Pixi onTick dtMs로 돌린다(히트스톱에 함께 멈춤).
// `state`는 rules.net.stateHz로 꾸준히 보낸다(서버 진행 검사 근거 — W-02 인계). seq는 방 소켓이 연결 전체에서 증가.
import { Engine, pieceCells, placement } from "../engine/index.js";
import { cellCode } from "../engine/piece.js";
import { armor, rules } from "../content.js";
import { encodeBoard } from "./board-codec.js";
import { createAttackState } from "./apply-attack.js";
import { createCurseState, curseView, displayGhost, tickCurses, transformCommand } from "./apply-spirit.js";
import { createEffectState, hintActive, onPieceLocked } from "./apply-effect.js";
import { nearMissRows } from "../fx/juice-table-core.js";

const ARMOR_IDS = armor.map((a) => a.id); // 서버 room/specials ARMOR_IDS와 같은 순서 (D-09 재계산)
const W = rules.board.width;
const now = () => performance.now();
/** 위기 심한 단계 — 블록이 위 2줄 안 (§4.6.11 D-01 심장박동 650ms) */
const SEVERE_ROWS = 2;

/**
 * @param {{ room: any, juice: any, boards: () => { me: any, opp: any }, preview: () => any, mySlot: number,
 *   versus: boolean, onStats: (s: any) => void, onCrisis: (on: boolean) => void, onTopout: () => void }} deps
 */
export function createLocalPlayer(deps) {
  /** @type {Engine | null} */ let engine = null;
  let attack = createAttackState();
  let curse = createCurseState();
  let effects = createEffectState(rules.board.preview, false);
  let running = false;
  let frozen = false;
  let paused = false;
  let countdownEnd = 0;
  let stateTimer = 0;
  let lastActiveKey = "";
  let hintKey = "";
  let crisis = { active: false, severe: false };
  /** 지운 특수 칸 위치 (서버 effect special의 X-03·X-04·R-07 기준점) @type {Record<string, [number, number]>} */
  const lastSpecialCells = {};
  const stats = { lines: 0, maxCombo: 0, tetris: 0, attack: 0, startedAt: 0 };
  const emit = (id, ctx) => deps.juice.emit(id, ctx);
  const me = () => deps.boards().me;

  /** 그리기 — 칸·활성·고스트(저주 표시 위치)·힌트·홀드/다음 (바뀐 것만 — board-view가 칸 단위 비교) */
  function render() {
    const b = me();
    if (!engine || !b) return;
    const snap = engine.snapshot();
    b.setCells(snap.cells, snap.marks);
    const a = snap.active;
    const key = a ? `${a.type}${a.x},${a.y},${a.rot}:${engine.activeDrawIndex}` : "";
    if (key !== lastActiveKey) {
      lastActiveKey = key;
      b.setActive(a, snap.activeSpecial);
      b.setGhost(displayGhost(curse, engine.getGhost(), W)); // FR-027 S-04·S-05 가짜·틀린 고스트
    }
    // FR-015·FR-035 착지 힌트 (rules.placement.weights — DCL-004), 블록·보드가 바뀔 때만 다시 계산
    const hk = a && hintActive(effects, now()) ? `${a.type}:${engine.activeDrawIndex}:${snap.pieceCount}` : "";
    if (hk !== hintKey) {
      hintKey = hk;
      const best = hk ? placement.bestPlacement(engine.board, a.type, rules.placement.weights) : null;
      b.setHint(best ? { type: a.type, x: best.x, y: best.y, rot: best.rot } : null);
    }
    const view = curseView(curse, now());
    let next = engine.getNext().map((type) => ({ type }));
    // S-04 거짓말하는 영: 가짜 다음 블록 목록 (표시만 — 03-A 인계 "컨트롤러가 넘김")
    if (view.fakeNext) next = next.map((n, i) => ({ type: next[(i + 3) % next.length].type }));
    deps.preview()?.set(engine.hold ? { type: engine.hold.type, special: engine.hold.special } : null, !engine.holdUsed,
      next);
    deps.onStats({ score: snap.score, lines: stats.lines, combo: Math.max(0, snap.combo), maxCombo: stats.maxCombo,
      tetris: stats.tetris, attackPerMin: stats.attack / Math.max(1 / 60, (now() - stats.startedAt) / 60000) });
  }

  /** §4.6.11 D-01·D-02 위기 (로컬 엔진 crisis — severe = 위 2줄 안) */
  function refreshCrisis() {
    const on = !!engine?.crisis;
    let severe = false;
    if (on && engine) for (let i = 0; i < SEVERE_ROWS * W; i += 1) if (engine.board.cells[i] > 0) severe = true;
    if (on === crisis.active && severe === crisis.severe) return;
    const enter = on && !crisis.active;
    crisis = { active: on, severe };
    me()?.setCrisis(crisis);
    emit(on ? "D-01" : "D-02", { severe, enter });
    deps.onCrisis(on);
  }

  /** 엔진 이벤트 → 연출·송신 (게임 반영이 먼저, 연출은 병렬 — NFR-002) @param {any[]} events @param {any} [pre] */
  function handle(events, pre = {}) {
    let cleared = false;
    let hard = null;
    for (const ev of events) {
      switch (ev.type) {
        case "move": emit("J-01", { dx: ev.dir === "left" ? -1 : 1 }); break;
        case "rotate": {
          const cw = ev.dir === "rotateCW";
          emit("J-02", { prev: pre.active, dir: cw ? "cw" : "ccw", kick: ev.kickIndex > 0, kickDir: cw ? 1 : -1 });
          break;
        }
        case "fall": if (ev.soft) emit("J-04", { piece: engine?.active }); break;
        case "hardDrop": hard = { from: pre.active }; break;
        case "hold": emit("J-07", { piece: pre.active }); break;
        case "spawn": emit("J-08", { preview: deps.preview(), step: 52 }); break;
        case "lock": {
          const cells = pieceCells(ev.piece);
          if (pre.cells) for (const [x, y] of cells) if (y >= 0) pre.cells[y * W + x] = cellCode(ev.piece.type);
          if (hard) emit("J-05", { from: hard.from, to: ev.piece, cells });
          else emit("J-06", { cells });
          pre.locked = ev.piece;
          if (engine) onPieceLocked(effects, engine);
          break;
        }
        case "clear": cleared = true; onClear(ev, pre); break;
        case "tspinNoLines": emit("C-10", { lines: 0, piece: pre.locked }); break;
        case "topout": topout(); break;
        case "curseEnd": emit("S-END", { spiritId: ev.spiritId }); break;
        default: break;
      }
    }
    // C-09 콤보 끊김 (+ C-12 니어미스: 콤보 3 이상이 끊긴 순간 한 칸만 빈 줄 3줄 이상)
    if (pre.locked && !cleared && (pre.combo ?? -1) >= 1 && engine) {
      emit("C-09", {});
      const rows = pre.combo >= 3 ? nearMissRows(engine.board.cells, W) : [];
      if (rows.length >= 3) emit("C-12", { rows });
    }
    refreshCrisis();
    render();
  }

  /** FR-004·API-013 줄 삭제 → 연출 + `clear` 송신 (연습도 — 게이지 충전) @param {any} ev @param {any} pre */
  function onClear(ev, pre) {
    stats.lines += ev.lines;
    stats.maxCombo = Math.max(stats.maxCombo, ev.combo);
    if (ev.lines === 4) stats.tetris += 1;
    // UC-006 6단계 "분당 공격력 환산" — 표시 전용 (rules.attack 표, 서버 판정과 무관)
    const a = rules.attack;
    const combo = [...a.comboBonus].reverse().find((c) => ev.combo >= c.from)?.bonus ?? 0;
    // FR-024 1줄(T-Spin 아님)은 공격 0 — 서버 attack.ts와 같은 표 읽기 (OQ #10)
    if (ev.lines >= 2 || ev.tspin) {
      const tspin = ev.tspin ? a.tspinBonus[ev.lines] ?? 0 : 0;
      stats.attack += a.lines[ev.lines] + tspin + combo + (ev.b2b ? a.b2bBonus : 0);
    }
    emit(`C-0${Math.min(4, ev.lines)}`, { rows: ev.rows, combo: ev.combo, prevCells: pre.cells });
    if (ev.combo >= 1) emit("C-05", { combo: ev.combo });
    if (ev.tspin) emit("C-10", { lines: ev.lines, piece: pre.locked, b2b: ev.b2b });
    if (ev.b2b) emit("C-11", { tspin: ev.tspin });
    for (const s of ev.specials) {
      lastSpecialCells[s.kind] = [s.x, s.y];
      if (s.kind === "word") emit("X-02", { from: me()?.cellCenter(s.x, s.y), cell: [s.x, s.y] });
    }
    deps.room.clear({ lines: ev.lines, combo: ev.combo, b2b: ev.b2b, tspin: ev.tspin, pieceCount: ev.pieceCount,
      specials: ev.specials.map((s) => (s.armorId ? { kind: s.kind, pieceIndex: s.pieceIndex, armorId: s.armorId }
        : { kind: s.kind, pieceIndex: s.pieceIndex })) });
  }

  /** UC-007 E3 Top-out → `topout` (voluntary=false) */
  function topout() {
    if (!running || !engine) return;
    running = false;
    deps.room.topout(engine.pieceCount, false);
    deps.onTopout();
  }

  /** API-012 내 보드 스냅샷 (12Hz) */
  function sendState() {
    if (!engine || !running || paused) return;
    const s = engine.snapshot();
    deps.room.state({ board: encodeBoard(s.cells), active: s.active, hold: s.hold, score: s.score, combo: s.combo,
      pieceCount: s.pieceCount });
  }

  return {
    get engine() { return engine; },
    get attack() { return attack; },
    get curse() { return curse; },
    get effects() { return effects; },
    get running() { return running; },
    get countingDown() { return countdownEnd > 0; },
    get crisis() { return crisis.active; },
    specialCell: (kind) => lastSpecialCells[kind] ?? null,
    /** API-019 start → 엔진·저주·효과 초기화, 카운트다운 뒤 첫 블록 @param {any} st @param {number} remainMs */
    startRound(st, remainMs) {
      engine = new Engine({ rules, seed: st.seed, stage: st.stage, versus: deps.versus, armorIds: ARMOR_IDS,
        previewCount: st.preview, matchElapsedMs: st.matchElapsedMs });
      attack = createAttackState();
      curse = createCurseState();
      effects = createEffectState(st.preview, !!st.grace);
      Object.assign(stats, { lines: 0, maxCombo: 0, tetris: 0, attack: 0, startedAt: now() });
      running = false;
      frozen = false;
      lastActiveKey = "\u0000";
      hintKey = "";
      if (crisis.active) emit("D-02", {}); // 지난 라운드 위기(비네트·심장박동·BGM 위기 층) 해제
      crisis = { active: false, severe: false };
      me()?.setCrisis(crisis);
      deps.boards().opp?.setCells(new Array(W * rules.board.height).fill(0));
      deps.boards().opp?.setActive(null);
      countdownEnd = now() + Math.max(1, remainMs); // 벽시계 기준 — 양측이 같은 시각에 시작 (API-019 countdownMs)
      clearInterval(stateTimer);
      stateTimer = window.setInterval(sendState, 1000 / rules.net.stateHz); // FR-006 rules.net.stateHz
      render();
    },
    /** 매 프레임 (Pixi onTick dtMs) @param {number} dtMs */
    tick(dtMs) {
      if (!engine || paused) return;
      if (countdownEnd > 0) {
        if (now() >= countdownEnd) {
          countdownEnd = 0;
          running = true;
          stats.startedAt = now();
          handle(engine.start());
        }
        return;
      }
      if (!running || frozen) return;
      const pre = { cells: engine.board.cells.slice(), active: engine.active && { ...engine.active },
        combo: engine.score.combo };
      const evs = engine.tick(dtMs).concat(tickCurses(curse, engine, now()));
      if (evs.length) handle(evs, pre);
    },
    /** 입력 명령 (keyboard·touch) @param {string} cmd */
    command(cmd) {
      if (!engine || !running || frozen || paused) return;
      const c = transformCommand(curse, cmd); // FR-029 이세벨 좌우 반전
      const pre = { cells: engine.board.cells.slice(), active: engine.active && { ...engine.active },
        combo: engine.score.combo };
      if (c === "softStep") {
        if (engine.shift(0, 1)) handle([{ type: "fall", rows: 1, soft: true }], pre);
        return;
      }
      const evs = engine.input(c);
      if (!evs.length) {
        if (c === "left" || c === "right") emit("J-01b", { dir: c === "left" ? -1 : 1 });
        else if (c === "rotateCW" || c === "rotateCCW") {
          emit("J-03", { cells: pre.active ? pieceCells(pre.active) : [] });
        }
        else if (c === "hold") emit("J-07b", {});
        return;
      }
      handle(evs, pre);
    },
    /** 서버 메시지가 보드를 바꾼 뒤 (apply-* 결과 이벤트 — topout 포함) @param {any[]} events */
    boardChanged(events = []) {
      lastActiveKey = "\u0000";
      hintKey = "";
      if (events.some((e) => e.type === "topout")) topout();
      refreshCrisis();
      render();
    },
    /** FR-041 말씀 대결 정지 / 재개 @param {boolean} on */
    setFrozen(on) { frozen = on; },
    /** UC-006 6a 연습 일시정지 — 엔진·낙하·입력·state 송신 정지 @param {boolean} on */
    setPaused(on) { paused = on; },
    get paused() { return paused; },
    /** UC-006 6a [그만하기] → topout voluntary=true */
    quit() {
      if (!engine) return;
      running = false;
      deps.room.topout(engine.pieceCount, true);
    },
    /** 라운드 종료 (roundEnd·matchEnd) */
    stop() {
      running = false;
      clearInterval(stateTimer);
    },
    render,
    destroy() {
      running = false;
      clearInterval(stateTimer);
    },
  };
}
