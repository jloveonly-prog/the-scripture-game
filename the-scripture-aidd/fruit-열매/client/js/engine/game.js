// TASK-010-5 · FR-003 · FR-011 · FR-015 · FR-035 · FR-001 · FR-004 · FR-025 · FR-044~047 · D-11 — 낙하 블록 수명주기 상태 기계 (동형).
// 단일 책임: 출현·이동·회전·드롭·홀드·고스트·고정 지연·줄 삭제·쓰레기 삽입·Top-out. DOM·네트워크·시계 무의존 (시간은 tick(dtMs) 인자 — D-12).
// 클라이언트 battle-controller와 서버 봇(worker/src/room/bot)이 같은 모듈을 쓴다 (D-11). 사건은 drainEvents()로 꺼낸다.
import { BOARD_COLS } from './encode.js';
import { PIECES, PIECE_TYPES } from './pieces.js';
import { isInDanger, stackHeight } from './danger.js';
import { createBag } from './bag.js';
import { rotateLocalCell, tryRotate } from './srs.js';
import {
  blastArea, createEmptyGrid, createEmptyMeta, dropDistance, findBestPlacement, fits, fullRows, ghostOf,
  insertGarbage, insertLeadRow, leadRowIndices, placePiece, removeRows, singleGapRows,
} from './board.js';
import { addDropPoints, createScoringState, isTSpin, judgeLock } from './scoring.js';
import { createSpecialRoller, specialCellCode } from './specials.js';
import { effectiveCellsPerSecond } from './gravity.js';
import { LIMITS } from '../net/protocol.js';

/** D3-12 니어미스 — 빈칸 1개짜리 줄이 이 수 이상 (design-vision §7) */
export const NEAR_MISS_MIN_ROWS = 3;
/** 출현 위치가 막혔을 때 위로 올려 보는 칸 수 · 보드 변경으로 낙하 블록이 겹칠 때 밀어 올리는 칸 수 */
const SPAWN_LIFT = 1;
const OVERLAP_LIFT = 2;

const pieceOf = (type) => PIECES[PIECE_TYPES[type - 1]];

/**
 * FR-003 엔진 생성 — 라운드마다 1개.
 * @param {{seed:number, mode:string, stage:0|1|2, matchElapsedMs?:number, rules:object}} opts rules = balance.json 전체 (gravity·input·specials)
 */
export function createGame({ seed, mode, stage, matchElapsedMs = 0, rules }) {
  if (!rules || !rules.gravity || !rules.input || !rules.specials) throw new RangeError('createGame: rules(balance)가 필요합니다');
  const G = rules.gravity;
  const IN = rules.input;
  const bag = createBag(seed);
  const roller = createSpecialRoller({ seed, mode, stage, specials: rules.specials });
  let grid = createEmptyGrid();
  let meta = createEmptyMeta();
  let scoring = createScoringState();
  let current = null; // { type, n, special: {kind, armorId, local0}|null, local }
  let active = null;
  let hold = null;
  let holdUsed = false;
  let drawn = 0;
  let pieceCount = 0;
  let garbageIn = 0;
  const garbageQueue = [];
  let leadCounters = []; // 납 줄 남은 삭제 수 (아래 → 위, leadRowIndices 순서)
  let elapsed = 0;
  let fallAcc = 0;
  let lockMs = 0;
  let lockResets = 0;
  let lowestY = 0;
  let softDrop = false;
  let lastRotate = false;
  let toppedOut = false;
  let garbageBlocked = false;
  let version = 0;
  let hintCache = null;
  let events = [];
  const emit = (e) => events.push(e);

  const specialAbs = () => (current?.special && active
    ? { kind: current.special.kind, armorId: current.special.armorId ?? null, cell: [active.y + current.local[0], active.x + current.local[1]] }
    : null);

  function topOut() {
    if (toppedOut) return;
    toppedOut = true;
    active = null;
    emit({ type: 'topout', pieceCount });
  }

  function drawNext() {
    const type = bag.next();
    const n = drawn;
    drawn += 1;
    const rolled = roller.roll({
      n, combo: Math.max(scoring.combo, 0), stackHeight: stackHeight(grid), inDanger: isInDanger(grid, IN.dangerRows),
    });
    const special = rolled
      ? { kind: rolled.kind, armorId: rolled.armorId ?? null, local0: pieceOf(type).cells[0][rolled.cellIndex].slice() }
      : null;
    return { type, n, special };
  }

  function spawn(piece) {
    const box = pieceOf(piece.type);
    const topRow = Math.min(...box.cells[0].map(([r]) => r));
    let cand = { type: piece.type, rot: 0, x: Math.floor((BOARD_COLS - box.box) / 2), y: -topRow };
    if (!fits(grid, cand)) cand = { ...cand, y: cand.y - SPAWN_LIFT };
    current = { ...piece, local: piece.special ? piece.special.local0.slice() : null };
    if (!fits(grid, cand)) { topOut(); return; }
    active = cand;
    lockMs = 0; lockResets = 0; fallAcc = 0; lastRotate = false; lowestY = active.y; version += 1;
    emit({ type: 'spawn', active: { ...active }, special: specialAbs(), n: piece.n });
  }

  function syncLeadCounters() {
    const count = leadRowIndices(grid).length;
    while (leadCounters.length > count) leadCounters.pop();
    while (leadCounters.length < count) leadCounters.push(0);
  }

  function fixActiveOverlap() {
    if (!active || fits(grid, active)) return;
    for (let lift = 1; lift <= OVERLAP_LIFT; lift += 1) {
      const cand = { ...active, y: active.y - lift };
      if (fits(grid, cand)) { active = cand; return; }
    }
    topOut();
  }

  function insertPendingGarbage() {
    if (garbageBlocked || garbageQueue.length === 0) return;
    let total = 0;
    while (garbageQueue.length > 0) {
      const g = garbageQueue.shift();
      const r = insertGarbage(grid, meta, g.rows, g.holeColumn);
      grid = r.grid; meta = r.meta; garbageIn += g.rows; total += g.rows;
      if (r.overflow) { version += 1; emit({ type: 'garbageInserted', rows: total }); topOut(); return; }
    }
    version += 1;
    emit({ type: 'garbageInserted', rows: total });
  }

  function lock(hard) {
    const tspin = isTSpin(grid, active, lastRotate);
    const sp = specialAbs();
    const placed = placePiece(grid, meta, active, sp
      ? { cell: sp.cell, code: specialCellCode(sp.kind, sp.armorId), info: { kind: sp.kind, armorId: sp.armorId, pieceIndex: current.n } }
      : null);
    grid = placed.grid; meta = placed.meta; version += 1;
    pieceCount = Math.min(pieceCount + 1, LIMITS.PIECE_COUNT_MAX);
    emit({ type: 'lock', cells: placed.cells, hard });
    if (placed.lockOut) { topOut(); return; }
    const rows = fullRows(grid);
    const judged = judgeLock(scoring, { lines: rows.length, tspin });
    scoring = judged.state;
    if (rows.length > 0) {
      const specials = [];
      for (const r of rows) {
        for (let c = 0; c < BOARD_COLS; c += 1) {
          const m = meta[r][c];
          if (m && specials.length < LIMITS.SPECIALS_MAX) specials.push({ ...m, cell: [r, c] });
        }
      }
      for (const s of specials) {
        if (s.kind === 'jericho') {
          const b = blastArea(grid, meta, s.cell, rules.specials.jericho.blastSize);
          grid = b.grid; meta = b.meta;
          emit({ type: 'jericho', center: s.cell, cells: b.cells });
        } else if (s.kind === 'manna') emit({ type: 'manna', cell: s.cell });
      }
      const cleared = removeRows(grid, meta, rows);
      grid = cleared.grid; meta = cleared.meta;
      syncLeadCounters();
      leadCounters = leadCounters.map((left) => left - rows.length);
      const leads = leadRowIndices(grid);
      const expired = leads.filter((_, i) => leadCounters[i] <= 0);
      if (expired.length) {
        const r = removeRows(grid, meta, expired);
        grid = r.grid; meta = r.meta;
        leadCounters = leadCounters.filter((left) => left > 0);
      }
      emit({
        type: 'clear', lines: rows.length, rows, combo: judged.combo, b2b: judged.b2b, tspin: judged.tspin, pieceCount,
        specials: specials.map(({ kind, pieceIndex, armorId, cell }) => (kind === 'armor' ? { kind, pieceIndex, armorId, cell } : { kind, pieceIndex, cell })),
      });
    } else {
      if (judged.comboBroken) {
        const near = singleGapRows(grid);
        if (near.length >= NEAR_MISS_MIN_ROWS) emit({ type: 'nearMiss', rows: near });
      }
      insertPendingGarbage();
    }
    holdUsed = false;
    active = null;
    if (!toppedOut) spawn(drawNext());
  }

  function afterMove() {
    lastRotate = false;
    if (dropDistance(grid, active) === 0 && lockResets < IN.lockResetsMax) { lockMs = 0; lockResets += 1; }
  }

  const canAct = () => active !== null && !toppedOut;

  return {
    // FR-003 첫 블록 출현 (카운트다운 종료 시 1회)
    start() {
      if (!active && !toppedOut && drawn === 0) spawn(drawNext());
    },
    // FR-003 좌우 이동 (dx = −1 | +1). 성공 여부
    move(dx) {
      if (!canAct()) return false;
      const cand = { ...active, x: active.x + dx };
      if (!fits(grid, cand)) return false;
      active = cand;
      afterMove();
      emit({ type: 'move', active: { ...active } });
      return true;
    },
    // FR-002 회전 (dir = +1 오른쪽 | −1 왼쪽). 실패(EVT-03)는 사건 없음
    rotate(dir) {
      if (!canAct()) return false;
      const r = tryRotate(grid, active, dir);
      if (!r) return false;
      const from = { ...active };
      active = r.active;
      if (current.local) current.local = rotateLocalCell(active.type, current.local, dir);
      afterMove();
      lastRotate = true;
      emit({ type: 'rotate', from, to: { ...active } });
      return true;
    },
    // FR-003 소프트 드롭 켜기·끄기 (중력 ×softDropMultiplier)
    setSoftDrop(on) { softDrop = Boolean(on); },
    // FR-003 하드 드롭 → 즉시 고정
    hardDrop() {
      if (!canAct()) return false;
      const distance = dropDistance(grid, active);
      active = { ...active, y: active.y + distance };
      scoring = addDropPoints(scoring, distance, true);
      emit({ type: 'hardDrop', active: { ...active }, distance });
      lock(true);
      return true;
    },
    // FR-003 홀드 — 낙하당 1회 (2번째는 무시 — EVT-08)
    hold() {
      if (!canAct() || holdUsed) return false;
      const cur = { type: current.type, n: current.n, special: current.special };
      emit({ type: 'hold', holdType: cur.type });
      const from = hold;
      hold = cur;
      active = null;
      spawn(from ?? drawNext());
      holdUsed = true;
      return true;
    },
    // FR-010 시간 진행 — 중력·고정 지연. gravityMultiplier = 바람(×2) 등
    tick(dtMs, { gravityMultiplier = 1 } = {}) {
      if (!canAct() || !(dtMs > 0)) return;
      elapsed += dtMs;
      const cps = effectiveCellsPerSecond(matchElapsedMs + elapsed, G, { multiplier: gravityMultiplier, softDrop });
      fallAcc += (cps * dtMs) / 1000;
      while (fallAcc >= 1) {
        const cand = { ...active, y: active.y + 1 };
        if (!fits(grid, cand)) { fallAcc = 0; break; }
        active = cand; fallAcc -= 1;
        if (active.y > lowestY) { lowestY = active.y; lockResets = 0; }
        if (softDrop) { scoring = addDropPoints(scoring, 1, false); emit({ type: 'softDrop' }); }
      }
      if (dropDistance(grid, active) === 0) {
        lockMs += dtMs;
        if (lockMs >= IN.lockDelayMs) lock(false);
      } else lockMs = 0;
    },
    // FR-025 받은 쓰레기를 대기 큐에 (다음 비삭제 고정 때 삽입)
    queueGarbage(rows, holeColumn) {
      if (Number.isInteger(rows) && rows > 0) garbageQueue.push({ rows, holeColumn });
    },
    // FR-025·FR-035 대기 쓰레기 줄 감소 (상쇄·서버 장부 맞춤). 줄인 줄 수
    reducePending(rows) {
      let left = Math.max(0, Math.trunc(rows) || 0);
      const before = this.pendingGarbage();
      while (left > 0 && garbageQueue.length > 0) {
        const take = Math.min(left, garbageQueue[0].rows);
        garbageQueue[0].rows -= take; left -= take;
        if (garbageQueue[0].rows === 0) garbageQueue.shift();
      }
      return before - this.pendingGarbage();
    },
    pendingGarbage() { return garbageQueue.reduce((sum, g) => sum + g.rows, 0); },
    // FR-016 베드로 — 쓰레기 줄 상승 보류 (무효 시간 동안 삽입하지 않음)
    setGarbageBlocked(blocked) { garbageBlocked = Boolean(blocked); },
    // FR-014·FR-017·FR-029·FR-035·FR-039 외부 보드 조작 — fn(grid, meta) → {grid, meta, overflow?}
    applyBoardOp(fn) {
      const r = fn(grid, meta);
      grid = r.grid; meta = r.meta ?? meta; version += 1;
      if (r.overflow) topOut();
      syncLeadCounters();
      fixActiveOverlap();
      return r;
    },
    // FR-029 악 — 납 줄 삽입 (clearsToExpire줄 삭제 후 소멸)
    insertLeadRow(clearsToExpire) {
      leadCounters.unshift(clearsToExpire); // 새 납 줄은 맨 아래 = 순서 0
      return this.applyBoardOp((g, m) => insertLeadRow(g, m));
    },
    // FR-035 스랍·FR-039 예수님 — 납 줄 전부 제거
    removeLeadRows() {
      const leads = leadRowIndices(grid);
      if (leads.length) this.applyBoardOp((g, m) => removeRows(g, m, leads));
      leadCounters = [];
      return leads.length;
    },
    // FR-015 솔로몬·FR-035 가브리엘 착지 힌트 (보드·블록이 바뀔 때만 다시 계산)
    landingHint() {
      if (!canAct()) return null;
      if (!hintCache || hintCache.version !== version) hintCache = { version, hint: findBestPlacement(grid, active.type) };
      return hintCache.hint;
    },
    // FR-001·FR-015 미리보기 count개
    peekNext(count) { return bag.peek(Math.max(0, count)); },
    // FR-003·FR-006 현재 상태 (state 송신·렌더 입력)
    snapshot() {
      const leads = leadRowIndices(grid);
      return {
        grid, active: active ? { ...active } : null, ghost: ghostOf(grid, active), hold: hold ? hold.type : null, holdUsed,
        score: scoring.score, combo: Math.max(scoring.combo, 0), b2b: scoring.b2bReady, pieceCount, garbageIn,
        pendingGarbage: this.pendingGarbage(), toppedOut, inDanger: isInDanger(grid, IN.dangerRows),
        leadRows: leads.map((row, i) => ({ row, clearsLeft: leadCounters[i] ?? 0 })), activeSpecial: specialAbs(),
      };
    },
    // 엔진 사건 꺼내기 (컨트롤러가 EVT·clear·topout으로 바꾼다)
    drainEvents() {
      const out = events;
      events = [];
      return out;
    },
    get toppedOut() { return toppedOut; },
  };
}
