// server-events.js — 방 소켓 수신 메시지 → apply-* 호출·juice 이벤트 발행만
// TASK-065 | REQ-001 REQ-007~REQ-012 FR-005 FR-006 FR-008 FR-014~FR-017 FR-025~FR-031 FR-034~FR-042 FR-053~FR-056
// FR-062 FR-064 NFR-002 C-002 | ARCH-003 | API-019~API-031 | design-vision §4.6·§4.8 서버 메시지 → 연출 | D-07 D-08
// 게임 효과(쓰레기 대기·영 효과·게이지)는 받은 즉시 적용하고 연출은 병렬로 시작한다(§4.8 — 연출이 반영을 늦추지 않음).
// HUD 수치는 `status`만(D-07). 예수님 이벤트는 by = null — 버튼·아이콘 없음, 실루엣은 holy-fx(C-002).
import { armorById, rules, spirits, spiritsById } from "../content.js";
import { decodeBoard } from "./board-codec.js";
import { applyAttack, applyGarbage, syncPending } from "./apply-attack.js";
import { applySpiritCurse, syncCursesWithStatus } from "./apply-spirit.js";
import { applyEffect } from "./apply-effect.js";

const W = rules.board.width;
const H = rules.board.height;
/** design-vision §4.6.4 S-01~S-14 = spirits.json 순서 (juice-table-powers와 같은 대응) */
const S_EVENT = new Map(spirits.map((s, i) => [s.id, `S-${String(i + 1).padStart(2, "0")}`]));
const G_EVENT = { michael: "G-01", gabriel: "G-02", cherubim: "G-03", seraphim: "G-04", ministering_spirits: "G-05" };
const R_EVENT = { belt_of_truth: "R-01", breastplate_of_righteousness: "R-02", gospel_shoes: "R-03",
  shield_of_faith: "R-04", helmet_of_salvation: "R-05", sword_of_the_spirit: "R-06" };
const H_EVENT = { sling_stone: "H-01", understanding_heart: "H-02", upon_this_rock: "H-03",
  prison_doors_opened: "H-04" };
const rowsOf = (events, type) => events.filter((e) => e.type === type).flatMap((e) => e.rows ?? []);
const STAGE_KO = { word: "말씀 블록", jericho: "여리고 나팔 블록", manna: "만나 블록" };

/**
 * @param {{ lp: any, juice: any, mySlot: number, versus: boolean, boards: () => { me: any, opp: any },
 *   oppPreview: () => any, hud: any, overlays: any, background: () => any, announce: (t: string, o?: any) => void,
 *   roundsPlayed: number, onRoundStart: (d: any) => number, onMatchEnd: (d: any) => void,
 *   onError: (e: { code: string, message: string }) => void }} deps
 * @returns {(type: string, data: any) => void}
 */
export function createServerEvents(deps) {
  const { lp, mySlot } = deps;
  const emit = (id, ctx) => deps.juice.emit(id, ctx);
  /** @type {number[] | null} */ let oppCells = null;
  let prevStatus = { grace: false, armed: /** @type {string[]} */ ([]) };
  /** @type {any} */ let prevStart = null;

  /** API-019 start — 카운트다운 M-01·은혜 D-03·해금 첫 등장 X-06 (엔진 초기화는 onRoundStart) @param {any} d */
  function start(d) {
    prevStatus = { grace: false, armed: [] };
    oppCells = null;
    deps.hud.setOpponent({ score: 0, combo: 0, pending: 0 }); // 새 라운드 — 상대 스냅샷이 오기 전 지난 값 지움
    deps.hud.setPending(0);
    const remain = deps.onRoundStart(d);
    emit("M-01", { countdownMs: remain, round: d.round });
    if (d.grace) emit("D-03", { on: true });
    // X-06 단계 해금 첫 등장 — 이 경기에서 새로 열린 특수 블록 (첫 라운드는 해금 경계 rules.specials.unlockRounds 이하일 때만)
    const fresh = Object.keys(STAGE_KO).filter((k) => d.stage?.[k] && !prevStart?.stage?.[k]
      && (prevStart || deps.roundsPlayed <= rules.specials.unlockRounds[k]));
    if (fresh.length) emit("X-06", { text: `새 축복: ${fresh.map((k) => STAGE_KO[k]).join(" · ")}` });
    prevStart = d;
    deps.announce(deps.versus ? `라운드 ${d.round} 시작` : "연습 시작");
  }

  /** API-029 roundEnd — M-02 / M-03 + 승수 + 다음 라운드 안내 @param {any} d */
  function roundEnd(d) {
    lp.stop();
    deps.overlays.closeQuiz();
    deps.hud.setWins(d.wins, mySlot);
    const won = d.winnerSlot === mySlot;
    emit(won ? "M-02" : "M-03", { round: d.round });
    deps.announce(`라운드 ${d.round} ${won ? "승리" : "패배"}`, { assertive: true });
    if (d.nextRoundInMs) deps.overlays.setPrep(`다음 라운드까지 ${Math.ceil(d.nextRoundInMs / 1000)}초`);
  }

  /** API-030 matchEnd — 저장(onMatchEnd) 후 M-04 승리 / M-05 패배 / M-06 이탈 승리 / M-07 연습 종료 @param {any} d */
  function matchEnd(d) {
    lp.stop();
    deps.overlays.closeQuiz();
    deps.overlays.closeMenu(false);
    deps.onMatchEnd(d);
    const win = d.you?.result === "win";
    emit(!deps.versus ? "M-07" : win ? (d.reason === "disconnect" ? "M-06" : "M-04") : "M-05", {});
    deps.announce(deps.versus ? (win ? "경기 승리" : "경기 패배") : "연습 종료", { assertive: true });
  }

  /** API-020 상대 보드·홀드·점수·콤보·받을 공격 — 수신마다 즉시 그리기 (§4.4) @param {any} d */
  function opponentState(d) {
    const opp = deps.boards().opp;
    if (!opp) return;
    try {
      oppCells = decodeBoard(d.board, W, H);
    } catch {
      return; // CODE-009 형식 오류 — 표시하지 않음
    }
    opp.setCells(oppCells);
    opp.setActive(d.active ?? null);
    deps.oppPreview()?.set(d.hold ? { type: d.hold } : null, true, []);
    deps.hud.setOpponent({ score: d.score, combo: Math.max(0, d.combo), pending: d.pending ?? 0 });
  }

  /** API-021 attack — 보낸 쪽: 빛의 화살·상쇄 / 받는 쪽: 대기 공격·악한 영 효과 적용 + 연출 @param {any} d */
  function attack(d) {
    const sp = d.spiritId ? spiritsById.get(d.spiritId) : null;
    const sEvent = sp ? S_EVENT.get(sp.id) : null;
    if (d.from === mySlot) {
      if (d.reflected) emit("A-07", { garbage: d.garbage });
      else if (d.canceled > 0) {
        emit("A-03", { n: d.canceled });
        emit("A-04", { canceled: d.canceled, garbage: d.garbage });
      } else if (d.garbage > 0) emit("A-01", { garbage: d.garbage, power: d.attackPower });
      if (d.blockedBy) emit("A-06", { side: "opp", by: d.blockedBy });
      else if (sEvent && d.spiritApplied) {
        emit(sEvent, { side: "opp", durationMs: d.duration });
        if (d.duration > 0) deps.hud.addOppChip(sp.id, d.duration); // 내가 보낸 영 + 남은 시간(클라이언트 계산)
      }
    }
    if (d.target !== mySlot || !lp.engine) return;
    // FR-025 대기 공격·FR-029 아바돈 구멍·악 납 블록 준비 (D-07 서버 판정 결과만)
    const events = applyAttack(lp.attack, lp.engine, d, mySlot);
    if (sp) applySpiritCurse(lp.curse, d, sp, mySlot, performance.now());
    deps.hud.setPending(d.pending);
    if (d.blockedBy) emit("A-06", { side: "me", by: d.blockedBy });
    else if (d.garbage > 0) emit("A-02", { garbage: d.garbage, power: d.attackPower });
    if (sEvent && !d.blockedBy) {
      const holes = events.find((e) => e.type === "holes");
      emit(sEvent, { side: "me", applied: d.spiritApplied, durationMs: d.duration, cells: holes?.cells,
        rows: d.params?.rows });
    }
    lp.boardChanged(events);
    if (d.garbage > 0) deps.announce(`공격 ${d.garbage}줄${sp ? ` — ${sp.name_ko}` : ""}`);
  }

  /** API-022 garbage — 내가 target이면 구멍 1칸 쓰레기 상승(+납 블록), voided면 A-05b (D-08 상승 시점 = 서버) @param {any} d */
  function garbage(d) {
    if (d.target !== mySlot || !lp.engine) return;
    const events = applyGarbage(lp.attack, lp.engine, d, mySlot);
    deps.hud.setPending(d.pending);
    if (d.rows > 0) emit("A-05", { rows: d.rows });
    else if (d.voided > 0) emit("A-05b", {});
    lp.boardChanged(events);
  }

  /** 상대 보드 가장 높은 열 꼭대기 (H-01 물맷돌 도착점) */
  function oppTopTarget() {
    const opp = deps.boards().opp;
    if (!opp || !oppCells) return undefined;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) if (oppCells[y * W + x] > 0) return opp.cellCenter(x, y);
    }
    return undefined;
  }

  /** API-023 effect — target 쪽이 자기 보드에 적용, 다른 쪽은 연출만 @param {any} d */
  function effect(d) {
    const toMe = d.target === mySlot;
    const side = d.by === mySlot ? "me" : "opp";
    const events = toMe && lp.engine ? applyEffect(lp.effects, d, { engine: lp.engine, curse: lp.curse,
      attack: lp.attack, mySlot, nowMs: performance.now(), rules, armorById }) : [];
    const p = d.params ?? {};
    const me = deps.boards().me;
    switch (d.source) {
      case "hero":
        if (d.id === "sling_stone") emit("H-01", { side, target: side === "me" ? oppTopTarget() : undefined,
          from: deps.hud.center("skill") });
        else if (d.id === "upon_this_rock") emit("H-03", { side, durationMs: p.durationMs });
        else if (d.id === "prison_doors_opened") emit("H-04", { side, rows: rowsOf(events, "garbageRemoved") });
        else emit(H_EVENT[d.id] ?? "H-02", { side, skillAt: deps.hud.center("skill") });
        break;
      case "angel": emit(G_EVENT[d.id], { side, params: p }); break;
      case "armor": emit(R_EVENT[d.id], { side, from: deps.hud.center(`armor:${d.id}`) }); break;
      case "jesus":
        // §4.6.8 예수님 "세상을 이기었노라" — 위기 + 게이지 가득에서 서버가 일으킴 (C-002)
        emit("JESUS", { side: toMe ? "me" : "opp", garbageRows: rowsOf(events, "garbageRemoved") });
        if (toMe) deps.announce("세상을 이기었노라 — John 16:33", { assertive: true });
        break;
      case "special": {
        const kind = d.id === "armor_acquired" ? "armor" : d.id;
        const cell = lp.specialCell(kind) ?? [4, H - 2];
        if (d.id === "jericho") emit("X-03", { cell, radius: rules.specials.jericho.radius });
        else if (d.id === "manna") emit("X-04", { cell, gauge: p.gauge });
        else if (d.id === "armor_acquired") {
          emit("X-05", { armorId: p.armorId, from: me?.cellCenter(cell[0], cell[1]), to: deps.hud.center(
            `armor:${p.armorId}`) });
          deps.announce(`전신갑주 획득 — ${armorById.get(p.armorId)?.name_ko ?? ""}`);
        }
        break;
      }
      case "grace": emit("D-03", { on: true }); break;
      default: break;
    }
    if (toMe) lp.boardChanged(events);
  }

  /** API-024 status — HUD의 유일한 원천 (게이지·쿨다운·봉인·갑주·준비·대기·효과·은혜·예수님 사용) @param {any} d */
  function status(d) {
    syncPending(lp.attack, d.pending);
    if (lp.engine) {
      const before = new Set(lp.curse.curses.keys());
      syncCursesWithStatus(lp.curse, lp.engine, d, performance.now());
      for (const id of before) if (!lp.curse.curses.has(id)) emit("S-END", { spiritId: id });
    }
    if (!!d.grace !== prevStatus.grace) emit("D-03", { on: !!d.grace });
    if (prevStatus.armed.includes("shield_of_faith") && !d.armed.includes("shield_of_faith")) emit("R-04off", {});
    prevStatus = { grace: !!d.grace, armed: d.armed ?? [] };
    const t = deps.hud.setStatus(d);
    if (t.skillReady) emit("H-05", {});
    if (t.gaugeFull) emit("H-06", {});
    deps.background()?.setPressure({ pending: d.pending, crisis: lp.crisis });
  }

  return (type, data) => {
    switch (type) {
      case "start": start(data); break;
      case "opponentState": opponentState(data); break;
      case "attack": attack(data); break;
      case "garbage": garbage(data); break;
      case "effect": effect(data); break;
      case "status": status(data); break;
      case "reject":
        if (data.action === "answer") deps.overlays.quizReject(data);
        else deps.hud.reject(data); // design-vision §4.5 매핑
        break;
      case "quiz":
        // FR-041 수신 즉시 보드·입력·낙하 정지 + Q-01 모달
        lp.setFrozen(true);
        deps.overlays.openQuiz(data);
        deps.announce(`말씀 대결 — ${data.question} 보기: ${data.choices.join(", ")}`, { assertive: true });
        break;
      case "quizResult":
        deps.overlays.quizResult(data, mySlot, () => lp.setFrozen(false));
        break;
      case "reaction": emit("RX-02", { reactionId: data.reactionId }); break;
      case "roundEnd": roundEnd(data); break;
      case "matchEnd": matchEnd(data); break;
      case "error": deps.onError(data); break;
      default: break;
    }
  };
}
