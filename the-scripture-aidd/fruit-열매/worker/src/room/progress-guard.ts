// TASK-020-3 · FR-032 · REQ-007 · api-gate R-02~R-07 — 불가능한 진행 거부 (seq·pieceCount·칸 보존·속도·콤보·B2B 일관성, garbageIn 단조).
// 단일 책임: 소켓(플레이어)별 진행 장부를 유지하고 state·clear·topout 보고를 검사한다. 판정 실패 시 아무것도 바꾸지 않는다.
import { BOARD_COLS } from '../../../client/js/engine/encode.js';
import { PIECES } from '../../../client/js/engine/pieces.js';

/** R-04 블록 1개의 칸 수 (테트로미노 = 4칸 — pieces.js 정의에서 읽음) */
const CELLS_PER_PIECE: number = PIECES.T.cells[0].length;
/** R-04 쓰레기 줄 1줄의 채워진 칸 수 (구멍 1칸) */
const CELLS_PER_GARBAGE_ROW = BOARD_COLS - 1;
/** R-05 블록 속도 창 (api-gate §2.8 R-05 "최근 5초 ≤ 100" — balance.json·protocol.js에 해당 키가 없어 규칙 원문 값을 이름 있는 상수로 둔다) */
const SPEED_WINDOW_MS = 5000;
const SPEED_MAX_PIECES = 100;
/** R-04·R-07 테트리스 줄 수 */
const TETRIS_LINES = 4;

export type GuardCode = 'SEQ_REJECTED' | 'PROGRESS_REJECTED';
export type GuardResult = { ok: true } | { ok: false; code: GuardCode; rule: string };

export interface ProgressLedger {
  /** 소켓별 공유 seq (state·clear·topout — 라운드가 바뀌어도 유지) */
  lastSeq: number;
  lastClearPieceCount: number;
  lastCombo: number;
  /** 직전 삭제가 테트리스 또는 T-Spin이었는가 (R-07) */
  lastDifficult: boolean;
  totalLines: number;
  garbageIn: number;
  /** R-05 표본 (시각, pieceCount) */
  samples: Array<{ at: number; pieceCount: number }>;
}

export interface ClearReport { seq: number; lines: number; combo: number; b2b: boolean; tspin: boolean; pieceCount: number }

const fail = (code: GuardCode, rule: string): GuardResult => ({ ok: false, code, rule });

// FR-032 라운드 시작 시 장부 초기화 (seq는 소켓 단위라 이어받는다)
export function createProgressLedger(roundStartAt: number, lastSeq = 0): ProgressLedger {
  return {
    lastSeq, lastClearPieceCount: -1, lastCombo: 0, lastDifficult: false, totalLines: 0, garbageIn: 0,
    samples: [{ at: roundStartAt, pieceCount: 0 }],
  };
}

/** R-05 창 안 증가량 (창 시작 직전 표본을 기준으로) */
function piecesInWindow(ledger: ProgressLedger, pieceCount: number, now: number): number {
  const from = now - SPEED_WINDOW_MS;
  let baseline = ledger.samples[0];
  for (const s of ledger.samples) if (s.at <= from) baseline = s;
  return pieceCount - baseline.pieceCount;
}

function pushSample(ledger: ProgressLedger, pieceCount: number, now: number): void {
  ledger.samples.push({ at: now, pieceCount });
  const from = now - SPEED_WINDOW_MS;
  // 창 시작 직전 표본 1개는 기준선으로 남긴다
  while (ledger.samples.length > 1 && ledger.samples[1].at <= from) ledger.samples.shift();
}

// FR-032 R-02~R-07 clear 검사 — 통과하면 장부를 갱신한다
export function checkClear(ledger: ProgressLedger, c: ClearReport, now: number): GuardResult {
  if (c.seq <= ledger.lastSeq) return fail('SEQ_REJECTED', 'R-02');
  if (c.pieceCount <= ledger.lastClearPieceCount) return fail('PROGRESS_REJECTED', 'R-03');
  const lines = ledger.totalLines + c.lines;
  if (lines * BOARD_COLS > c.pieceCount * CELLS_PER_PIECE + ledger.garbageIn * CELLS_PER_GARBAGE_ROW) {
    return fail('PROGRESS_REJECTED', 'R-04');
  }
  if (piecesInWindow(ledger, c.pieceCount, now) > SPEED_MAX_PIECES) return fail('PROGRESS_REJECTED', 'R-05');
  const consecutive = c.pieceCount === ledger.lastClearPieceCount + 1;
  const expectedCombo = consecutive ? ledger.lastCombo + 1 : 0;
  if (c.combo !== expectedCombo) return fail('PROGRESS_REJECTED', 'R-06');
  if (c.b2b && !ledger.lastDifficult) return fail('PROGRESS_REJECTED', 'R-07');

  ledger.lastSeq = c.seq;
  ledger.lastClearPieceCount = c.pieceCount;
  ledger.lastCombo = c.combo;
  ledger.lastDifficult = c.lines === TETRIS_LINES || c.tspin;
  ledger.totalLines = lines;
  pushSample(ledger, c.pieceCount, now);
  return { ok: true };
}

// FR-032 R-02 state 검사 (역행·중복 seq와 garbageIn 역행은 조용히 버린다 — 호출 측은 응답하지 않음)
export function checkState(ledger: ProgressLedger, seq: number, garbageIn: number): { ok: true; garbageDelta: number } | { ok: false } {
  if (seq <= ledger.lastSeq || garbageIn < ledger.garbageIn) return { ok: false };
  const garbageDelta = garbageIn - ledger.garbageIn;
  ledger.lastSeq = seq;
  ledger.garbageIn = garbageIn;
  return { ok: true, garbageDelta };
}

// FR-032 R-02 topout 검사 (pieceCount는 직전 clear 이상)
export function checkTopout(ledger: ProgressLedger, seq: number, pieceCount: number): GuardResult {
  if (seq <= ledger.lastSeq) return fail('SEQ_REJECTED', 'R-02');
  if (pieceCount < ledger.lastClearPieceCount) return fail('PROGRESS_REJECTED', 'R-03');
  ledger.lastSeq = seq;
  return { ok: true };
}
