// index.js — Engine 퍼사드만 — 입력 명령 → 상태 전이 → 이벤트 배열 반환 (rules는 인자로 주입)
// TASK-010-4 | REQ-001 FR-001 FR-002 FR-003 FR-004 FR-010 FR-025 FR-029 FR-036 FR-044~FR-047 | ARCH-002 | D-12 |
// API-012 API-013
// 클라이언트 로컬 플레이어(ARCH-003)와 서버 봇(ARCH-013)이 같은 파일을 쓴다. 시간·시드·rules는 전부 인자 (D-12).
import { Bag } from "./bag.js";
import { mulberry32 } from "./rng.js";
import { spawnPiece } from "./piece.js";
import { tryRotate } from "./srs.js";
import * as B from "./board.js";
import { createScoreState, detectTSpin, applyLockResult, addDropPoints } from "./scoring.js";
import { gravityIntervalMs } from "./gravity.js";
import { assignSpecial } from "./specials.js";

export { CELL, PIECE_TYPES, pieceCells, spawnPiece } from "./piece.js";
export * as board from "./board.js";
export { gravityIntervalMs } from "./gravity.js";
export * as specials from "./specials.js";
// FR-015·FR-035 착지 힌트 + ARCH-013 봇 공용 착지 평가 (RTM §5 DCL-004)
export * as placement from "./placement.js";
export { sequenceFor } from "./bag.js";

/**
 * @typedef {{ type: string, x: number, y: number, rot: number }} Piece
 * @typedef {{ type: string, [key: string]: unknown }} EngineEvent
 * @typedef {{ word: boolean, jericho: boolean, manna: boolean }} Stage
 * @typedef {{ rules: any, seed: number, stage: Stage, versus: boolean, armorIds: readonly string[],
 *   previewCount: number, matchElapsedMs?: number }} EngineOptions
 */

/**
 * 특수 표식에 갑주 id가 있으면 붙인다 (CODE-013 armor).
 * @template T @param {T} mark @param {string | undefined} armorId
 */
function withArmor(mark, armorId) {
  return armorId ? { ...mark, armorId } : mark;
}

/** 순수 게임 엔진 상태기 (FR-001~FR-004). 명령마다 이벤트 배열을 돌려준다. */
export class Engine {
  /** @param {EngineOptions} options */
  constructor(options) {
    this.rules = options.rules;
    this.seed = options.seed >>> 0;
    this.stage = options.stage;
    this.versus = options.versus;
    this.armorIds = options.armorIds;
    this.previewCount = options.previewCount;
    this.elapsedMs = options.matchElapsedMs ?? 0;
    this.board = B.createBoard(this.rules.board.width, this.rules.board.height);
    this.bag = new Bag(this.seed);
    this.score = createScoreState();
    /** @type {Piece | null} */ this.active = null;
    /** @type {{ type: string, drawIndex: number, special: any } | null} */ this.hold = null;
    this.activeDrawIndex = 0;
    this.activeSpecial = null;
    this.drawCount = 0;
    this.pieceCount = 0;
    this.holdUsed = false;
    this.lastMoveRotation = false;
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.softDropping = false;
    this.gravityMultiplier = 1;
    this.leadLinesLeft = 0;
    this.crisis = false;
    this.topOut = false;
  }

  /** 첫 블록 스폰 (UC-007 1단계). @returns {EngineEvent[]} */
  start() {
    return this.spawnNext();
  }

  /** @param {Piece} piece @returns {boolean} */
  fits(piece) {
    return B.fits(this.board, piece);
  }

  /** 가방에서 다음 블록을 꺼내 특수 칸을 배정한다 (D-09 — 그리는 순번 = pieceIndex, 1부터). */
  draw() {
    this.drawCount += 1;
    const type = this.bag.next();
    const special = assignSpecial({
      seed: this.seed, pieceIndex: this.drawCount, stage: this.stage, versus: this.versus,
      combo: this.score.combo, crisis: this.crisis, specials: this.rules.specials, armor: this.rules.armor,
      armorIds: this.armorIds,
    });
    return { type, drawIndex: this.drawCount, special };
  }

  /** @param {{ type: string, drawIndex: number, special: any }} next @returns {EngineEvent[]} */
  placeActive(next) {
    this.active = spawnPiece(next.type, this.board.width);
    this.activeDrawIndex = next.drawIndex;
    this.activeSpecial = next.special;
    this.lastMoveRotation = false;
    this.gravityAcc = 0;
    this.lockTimer = 0;
    // UC-007 E3 새 블록이 나올 자리가 막힘 → Top-out
    if (!this.fits(this.active)) return this.setTopOut("block_out");
    return [{ type: "spawn", piece: { ...this.active }, special: this.activeSpecial }];
  }

  /** @returns {EngineEvent[]} */
  spawnNext() {
    return this.placeActive(this.draw());
  }

  /** @param {string} reason @returns {EngineEvent[]} */
  setTopOut(reason) {
    this.topOut = true;
    this.active = null;
    return [{ type: "topout", reason, pieceCount: this.pieceCount }];
  }

  /** @param {number} dx @param {number} dy @returns {boolean} */
  shift(dx, dy) {
    if (!this.active) return false;
    const moved = { ...this.active, x: this.active.x + dx, y: this.active.y + dy };
    if (!this.fits(moved)) return false;
    this.active = moved;
    return true;
  }

  /** @returns {boolean} 바닥·블록 위에 닿아 더 내려갈 수 없는가 */
  grounded() {
    return !!this.active && !this.fits({ ...this.active, y: this.active.y + 1 });
  }

  /** 입력 명령 (FR-003): left·right·rotateCW·rotateCCW·softDropStart·softDropEnd·hardDrop·hold. @param {string} command */
  input(command) {
    if (this.topOut || !this.active) return [];
    switch (command) {
      case "left":
      case "right": {
        if (!this.shift(command === "left" ? -1 : 1, 0)) return [];
        this.lastMoveRotation = false;
        this.lockTimer = 0;
        return [{ type: "move", dir: command }];
      }
      case "rotateCW":
      case "rotateCCW": {
        // FR-002 SRS 벽차기, UC-007 E1 전부 막히면 회전 없음
        const result = tryRotate(this.active, command === "rotateCW" ? 1 : -1, (p) => this.fits(p));
        if (!result) return [];
        this.active = result.piece;
        this.lastMoveRotation = true;
        this.lockTimer = 0;
        return [{ type: "rotate", dir: command, kickIndex: result.kickIndex }];
      }
      case "softDropStart":
        this.softDropping = true;
        return [];
      case "softDropEnd":
        this.softDropping = false;
        return [];
      case "hardDrop": {
        let distance = 0;
        while (this.shift(0, 1)) distance += 1;
        if (distance > 0) this.lastMoveRotation = false;
        const points = addDropPoints(this.score, distance, "hard", this.rules.scoring);
        return [{ type: "hardDrop", distance, points }, ...this.lock()];
      }
      case "hold":
        return this.holdActive();
      default:
        return [];
    }
  }

  /** FR-003 홀드 — 낙하당 1회 (UC-007 E2 두 번째 시도 무시). @returns {EngineEvent[]} */
  holdActive() {
    if (this.holdUsed || !this.active) return [];
    const current = { type: this.active.type, drawIndex: this.activeDrawIndex, special: this.activeSpecial };
    const next = this.hold ?? this.draw();
    this.hold = current;
    this.holdUsed = true;
    return [{ type: "hold", hold: current.type }, ...this.placeActive(next)];
  }

  /** 시간 진행 (FR-010 낙하 곡선, rules.engine.lockDelayMs 잠금 지연, softDropMultiplier). @param {number} dtMs */
  tick(dtMs) {
    if (this.topOut || !this.active) return [];
    this.elapsedMs += dtMs;
    let interval = gravityIntervalMs(this.elapsedMs, this.rules.gravity) / this.gravityMultiplier;
    if (this.softDropping) interval /= this.rules.engine.softDropMultiplier;
    const events = [];
    if (this.grounded()) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= this.rules.engine.lockDelayMs) return this.lock();
      return events;
    }
    this.gravityAcc += dtMs;
    let fell = 0;
    while (this.gravityAcc >= interval && !this.grounded()) {
      this.gravityAcc -= interval;
      this.shift(0, 1);
      fell += 1;
    }
    if (fell > 0) {
      this.lastMoveRotation = false;
      this.lockTimer = 0;
      if (this.softDropping) addDropPoints(this.score, fell, "soft", this.rules.scoring);
      events.push({ type: "fall", rows: fell, soft: this.softDropping });
    }
    if (this.grounded()) this.gravityAcc = 0;
    return events;
  }

  /** 활성 블록 고정 → 줄 삭제·판정·점수 → 다음 블록 (FR-004). @returns {EngineEvent[]} */
  lock() {
    if (!this.active) return [];
    const piece = this.active;
    const tspin = detectTSpin(this.board, piece, this.lastMoveRotation);
    const s = this.activeSpecial;
    const mark = s ? withArmor({ kind: s.kind, pieceIndex: this.activeDrawIndex }, s.armorId) : null;
    const special = s && mark ? { cellIndex: s.cellIndex, mark } : null;
    const { lockOut } = B.lockPiece(this.board, piece, special);
    this.pieceCount += 1;
    this.holdUsed = false;
    this.active = null;
    const events = [{ type: "lock", piece: { ...piece }, tspin, pieceCount: this.pieceCount }];
    const rows = B.findFullRows(this.board);
    const cleared = B.marksInRows(this.board, rows);
    // FR-045 여리고 나팔: 지운 줄의 여리고 칸 주변 (2r+1)² 폭파 (rules.specials.jericho.radius)
    const blasts = cleared.filter((m) => m.kind === "jericho")
      .map((m) => ({ x: m.x, y: m.y, radius: this.rules.specials.jericho.radius }));
    const lines = B.clearRows(this.board, rows, blasts);
    const result = applyLockResult(this.score, { lines, tspin }, this.rules.scoring);
    if (lines > 0) {
      events.push({
        type: "clear", lines, combo: result.combo, b2b: result.b2b, tspin, pieceCount: this.pieceCount,
        points: result.points, rows,
        specials: cleared.map((m) => ({
          ...withArmor({ kind: m.kind, pieceIndex: m.pieceIndex }, m.armorId), x: m.x, y: m.y,
        })),
      });
      events.push(...this.countLeadLines(lines));
    } else if (tspin) {
      events.push({ type: "tspinNoLines", points: result.points });
    }
    this.refreshCrisis();
    if (lockOut) return events.concat(this.setTopOut("lock_out"));
    return events.concat(this.spawnNext());
  }

  /** FR-029 납 블록: 내가 줄을 지울 때마다 남은 줄 수 감소, 0이면 납 줄 제거. @param {number} lines */
  countLeadLines(lines) {
    if (this.leadLinesLeft <= 0) return [];
    this.leadLinesLeft = Math.max(0, this.leadLinesLeft - lines);
    if (this.leadLinesLeft > 0) return [{ type: "leadCount", left: this.leadLinesLeft }];
    return [{ type: "leadCleared", rows: B.removeLeadRows(this.board) }];
  }

  /** 보드 변경 후 활성 블록이 겹치면 위로 밀어 올린다 (API-022 "활성 블록이 겹치면 위로 밀어 올림"). */
  liftActive() {
    if (!this.active) return;
    let lifted = this.active;
    for (let i = 0; i <= this.board.height && !this.fits(lifted); i += 1) lifted = { ...lifted, y: lifted.y - 1 };
    this.active = lifted;
  }

  /** @param {boolean} overflow @param {EngineEvent} event @returns {EngineEvent[]} */
  afterRise(overflow, event) {
    this.liftActive();
    this.refreshCrisis();
    return overflow ? [event, ...this.setTopOut("garbage_overflow")] : [event];
  }

  /** FR-025 구멍 1칸 쓰레기 상승 (API-022). @param {number} rows @param {number} holeColumn */
  applyGarbage(rows, holeColumn) {
    if (this.topOut || rows <= 0) return [];
    return this.afterRise(B.insertGarbage(this.board, rows, holeColumn), { type: "garbage", rows, holeColumn });
  }

  /** FR-029 납 블록 줄 (wickedness `params.rows`, `linesToClear`). @param {number} rows @param {number} linesToClear */
  addLeadRows(rows, linesToClear) {
    if (this.topOut || rows <= 0) return [];
    this.leadLinesLeft = Math.max(this.leadLinesLeft, linesToClear);
    return this.afterRise(B.insertLeadRows(this.board, rows), { type: "lead", rows, linesToClear });
  }

  /** FR-035 스랍·FR-039 예수님: 납 블록 해제. */
  removeLeadRows() {
    this.leadLinesLeft = 0;
    return [{ type: "leadCleared", rows: B.removeLeadRows(this.board) }];
  }

  /** FR-029 아바돈 구멍 (`attack.params.holes`·`seed` — 같은 seed → 같은 위치). @param {number} count @param {number} seed */
  punchHoles(count, seed) {
    return [{ type: "holes", cells: B.punchHoles(this.board, count, mulberry32(seed)) }];
  }

  /** FR-014 물맷돌: 가장 높은 열 꼭대기 블록 count개. @param {number} count */
  removeTopBlocks(count) {
    const cells = B.removeTopBlocks(this.board, count);
    this.refreshCrisis();
    return [{ type: "blocksRemoved", cells }];
  }

  /** FR-017·FR-035·FR-039 맨 아래 쓰레기 줄 제거. @param {number} rows */
  removeGarbageRows(rows) {
    const removed = B.removeGarbageRows(this.board, rows);
    this.refreshCrisis();
    return [{ type: "garbageRemoved", rows: removed }];
  }

  /** FR-055 위기(위험선 진입) 갱신 — 만나 확률(FR-046) 입력 */
  refreshCrisis() {
    this.crisis = B.isInDanger(this.board, this.rules.board.dangerRows);
  }

  /** @returns {number} 보드의 쓰레기 줄 수 (FR-039 절반 계산용) */
  garbageRowCount() {
    return B.countGarbageRows(this.board);
  }

  /** FR-028 공중 권세 잡은 자: 블록이 한쪽으로 밀림 (막히면 그대로). @param {1 | -1} dir */
  nudge(dir) {
    return this.shift(dir, 0) ? [{ type: "nudge", dir }] : [];
  }

  /** FR-028 낙하 속도 배수 (spirits.json `gravityMultiplier`, 해제 시 1). @param {number} multiplier */
  setGravityMultiplier(multiplier) {
    this.gravityMultiplier = multiplier > 0 ? multiplier : 1;
  }

  /** FR-015·FR-035 미리보기 개수 (rules.board.preview / previewSolomon / previewGabriel). @param {number} n */
  setPreviewCount(n) {
    this.previewCount = n;
  }

  /** FR-003 고스트 피스 — 하드 드롭 착지 위치. @returns {Piece | null} */
  getGhost() {
    if (!this.active) return null;
    let ghost = { ...this.active };
    while (this.fits({ ...ghost, y: ghost.y + 1 })) ghost = { ...ghost, y: ghost.y + 1 };
    return ghost;
  }

  /** @param {number} [n] @returns {string[]} 다음 블록 미리보기 */
  getNext(n = this.previewCount) {
    return this.bag.peek(n);
  }

  /** 스냅샷 — API-012 `state`의 원천(board는 CODE-009 칸 배열 — 문자열 변환은 호출자) + 렌더용 표식. */
  snapshot() {
    return {
      cells: this.board.cells.slice(), marks: this.board.marks.slice(),
      active: this.active ? { ...this.active } : null, activeSpecial: this.activeSpecial,
      hold: this.hold ? this.hold.type : null, next: this.getNext(), score: this.score.score, combo: this.score.combo,
      pieceCount: this.pieceCount, leadLinesLeft: this.leadLinesLeft, crisis: this.crisis, topOut: this.topOut,
      elapsedMs: this.elapsedMs,
    };
  }
}
