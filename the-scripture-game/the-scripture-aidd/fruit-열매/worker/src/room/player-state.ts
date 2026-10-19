// player-state.ts — 슬롯별 판정 상태 생성·게이지 증감·쿨다운·보유 갑주·`status` 페이로드 조립만
// TASK-013 | REQ-007 REQ-008 REQ-013 FR-032 FR-033 FR-062 | ARCH-011 | API-024 | TBL-018 `gauge`·`grace` | data-ark
// §8.2
// 판정 모듈(room/*)은 cloudflare:workers를 모른다 — DO 의존은 RoomContext로 주입받는다 (task-wall A-01, devguide §3.4).
import type { Rules, SpiritCategory } from "../content";
import type { HeroId, Slot } from "../storage/adapter";

/** 판정 모듈이 GameRoom(02 사마리아)에게서 주입받는 실행 환경 (task-wall A-01 RoomContext) */
export interface RoomContext {
  rules: Rules;
  /** 현재 시각 epoch ms */
  now(): number;
  /** [0, 1) 서버 무작위 (FR-026 후보 선택, OQ #13 보상, 구멍 열) */
  random(): number;
  /** uint32 서버 무작위 (architecture §9.8 라운드 시드 — crypto.getRandomValues, 아바돈 seed) */
  randomUint32(): number;
  /** 한 슬롯에만 WS 봉투 `{type, data}` 전송 (봇 슬롯이면 봇에게 전달) */
  send(slot: Slot, type: string, data: unknown): void;
  /** 양측 전송 */
  broadcast(type: string, data: unknown): void;
  /** 타이머 등록 → 취소 함수. 구현은 콜백 예외를 잡아 MATCH_ABORTED로 처리한다 (devguide §3.3 타이머 콜백) */
  schedule(delayMs: number, fn: () => void): () => void;
}

/** garbage.ts가 관리하는 대기 공격 1건 (data-ark §8.2 pending) */
export interface PendingEntry {
  id: number;
  fromSlot: Slot;
  lines: number;
  holeColumn: number;
  spiritId: string | null;
  /** FR-029 악 — 이 공격과 함께 오를 납 블록 줄 수 (API-022 설명) */
  leadRows: number;
  dueAt: number;
  cancel: (() => void) | null;
}

/** effects.ts가 관리하는 걸린 시간형 효과 1건 */
export interface ActiveEffect {
  spiritId: string;
  category: SpiritCategory;
  until: number;
}

/** TBL-003 통계 원천 (경기 누적) */
export interface SlotTotals {
  maxCombo: number;
  linesCleared: number;
  attackSent: number;
  tetrisCount: number;
  piecesPlaced: number;
  quizCorrect: number;
  quizAnswered: number;
}

/** FR-032 진행 불가능성 검사 원천 (라운드 누적 — 라운드마다 엔진·pieceCount가 새로 시작) */
export interface RoundCounters {
  linesCleared: number;
  garbageRows: number;
  leadCells: number;
}

/** data-ark §8.2 슬롯별 판정 상태 */
export interface SlotState {
  slot: Slot;
  heroId: HeroId;
  isBot: boolean;
  /** 내부 값은 실수(은혜 ×1.15), 표시·검증은 내림 정수 */
  gauge: number;
  /** 스킬·천사 id → 쿨다운 끝 시각 */
  cooldowns: Record<string, number>;
  armors: string[];
  armed: { shield: boolean; michael: boolean; breastplate: boolean; sword: boolean; nullify: Record<string,
    SpiritCategory[]> };
  activeEffects: ActiveEffect[];
  lastEffectEndAt: Record<string, number>;
  sealedUntil: number;
  pending: PendingEntry[];
  peterUntil: number;
  lastSeq: number;
  lastPieceCount: number;
  lastPieceAt: number;
  totals: SlotTotals;
  round: RoundCounters;
  b2bTetrisStreak: number;
  leadLinesLeft: number;
  claimedSpecials: Set<number>;
  crisis: boolean;
  /** FR-039 이번 경기 예수님 이벤트 횟수 (rules.jesus.perMatch) */
  jesusCount: number;
  jesusUsed: boolean;
  grace: boolean;
}

/** 경기 시작 시 슬롯 상태 */
export function createSlotState(slot: Slot, heroId: HeroId, isBot: boolean): SlotState {
  return {
    slot, heroId, isBot, gauge: 0, cooldowns: {}, armors: [],
    armed: { shield: false, michael: false, breastplate: false, sword: false, nullify: {} },
    activeEffects: [], lastEffectEndAt: {}, sealedUntil: 0, pending: [], peterUntil: 0,
    lastSeq: -1, lastPieceCount: 0, lastPieceAt: 0,
    totals: { maxCombo: 0, linesCleared: 0, attackSent: 0, tetrisCount: 0, piecesPlaced: 0, quizCorrect: 0,
      quizAnswered: 0 },
    round: { linesCleared: 0, garbageRows: 0, leadCells: 0 },
    b2bTetrisStreak: 0, leadLinesLeft: 0, claimedSpecials: new Set(), crisis: false,
    jesusCount: 0, jesusUsed: false, grace: false,
  };
}

/**
 * 라운드 시작 — 보드에 묶인 상태만 초기화 (새 시드·새 엔진). 게이지·보유 갑주·준비된 방어·쿨다운·예수님 사용 여부는
 * 경기(매치) 단위로 유지 (spec-tablet §9.8 #1 경기 = 매치). grace는 라운드마다 다시 판정 (FR-062 "다음 판").
 */
export function resetForRound(state: SlotState, grace: boolean): void {
  for (const entry of state.pending) entry.cancel?.();
  state.pending = [];
  state.activeEffects = [];
  state.sealedUntil = 0;
  state.peterUntil = 0;
  state.lastPieceCount = 0;
  state.round = { linesCleared: 0, garbageRows: 0, leadCells: 0 };
  state.b2bTetrisStreak = 0;
  state.leadLinesLeft = 0;
  state.claimedSpecials = new Set();
  state.crisis = false;
  state.grace = grace;
}

/** FR-033 줄 삭제 게이지: perLine×줄 + 테트리스 tetrisBonus + T-Spin tspinBonus (테트리스 = 30) */
export function gaugeForClear(lines: number, tspin: boolean, rules: Rules): number {
  const g = rules.gauge;
  return g.perLine * lines + (lines === 4 ? g.tetrisBonus : 0) + (tspin ? g.tspinBonus : 0);
}

/**
 * 게이지 충전 (FR-033). 은혜면 ×gaugeMultiplier (FR-062 "믿음 게이지 충전 +15%"), 최대 gauge.max에서 멈춤 (UC-014 E2).
 * @returns 실제 증가량
 */
export function addGauge(state: SlotState, amount: number, rules: Rules): number {
  const before = state.gauge;
  const scaled = state.grace ? amount * rules.grace.gaugeMultiplier : amount;
  state.gauge = Math.min(rules.gauge.max, state.gauge + Math.max(0, scaled));
  return state.gauge - before;
}

/** 표시·검증용 게이지 (내림 정수) */
export function gaugeValue(state: SlotState): number {
  return Math.floor(state.gauge);
}

/** FR-034 게이지 차감 — 부족하면 false (GAUGE_LOW) */
export function spendGauge(state: SlotState, cost: number): boolean {
  if (gaugeValue(state) < cost) return false;
  state.gauge -= cost;
  return true;
}

/** 남은 쿨다운 ms (0 = 사용 가능) */
export function cooldownRemaining(state: SlotState, id: string, now: number): number {
  return Math.max(0, (state.cooldowns[id] ?? 0) - now);
}

/** FR-034 쿨다운 시작 (rules.heroSkills·angels `cooldownMs`) */
export function startCooldown(state: SlotState, id: string, cooldownMs: number, now: number): void {
  state.cooldowns[id] = now + cooldownMs;
}

/** FR-036 갑주 획득 (말씀 대결 보상 포함 — UC-011 3a) */
export function addArmor(state: SlotState, armorId: string): void {
  state.armors.push(armorId);
}

/** FR-037 갑주 1개 소모 — 없으면 false (NO_ARMOR) */
export function takeArmor(state: SlotState, armorId: string): boolean {
  const i = state.armors.indexOf(armorId);
  if (i < 0) return false;
  state.armors.splice(i, 1);
  return true;
}

/** 놓은 블록 수 갱신 (API-012·API-013·API-018 pieceCount) — 경기 통계 piecesPlaced 누적 */
export function notePieceCount(state: SlotState, pieceCount: number, now: number): void {
  if (pieceCount > state.lastPieceCount) {
    state.totals.piecesPlaced += pieceCount - state.lastPieceCount;
    state.lastPieceCount = pieceCount;
    state.lastPieceAt = now;
  }
}

/**
 * 검증된 줄 삭제 1회를 통계·연속 B2B 테트리스·납 블록 남은 줄에 반영 (TBL-003, OQ #9, FR-029).
 * @returns 이번 삭제를 포함한 연속 B2B 테트리스 횟수 (attack.ts 입력)
 */
export function noteClear(state: SlotState, clear: { lines: number; combo: number; b2b: boolean }): number {
  state.totals.linesCleared += clear.lines;
  state.round.linesCleared += clear.lines;
  state.totals.maxCombo = Math.max(state.totals.maxCombo, clear.combo);
  if (clear.lines === 4) state.totals.tetrisCount += 1;
  state.b2bTetrisStreak = clear.lines === 4 && clear.b2b ? state.b2bTetrisStreak + 1 : 0;
  if (state.leadLinesLeft > 0) state.leadLinesLeft = Math.max(0, state.leadLinesLeft - clear.lines);
  return state.b2bTetrisStreak;
}

/** 대기 공격 합계 (API-021·API-024 `pending`) */
export function pendingTotal(state: SlotState): number {
  return state.pending.reduce((sum, e) => sum + e.lines, 0);
}

/** 준비된 방어 id 목록 (API-024 `armed`) */
export function armedList(state: SlotState): string[] {
  const list: string[] = [];
  if (state.armed.michael) list.push("michael");
  if (state.armed.shield) list.push("shield_of_faith");
  if (state.armed.breastplate) list.push("breastplate_of_righteousness");
  if (state.armed.sword) list.push("sword_of_the_spirit");
  list.push(...Object.keys(state.armed.nullify));
  return list;
}

/** API-024 `status` 페이로드 — HUD의 유일한 원천 (D-07) */
export function statusPayload(state: SlotState, now: number, rules: Rules) {
  const cooldowns: Record<string, number> = {};
  for (const id of Object.keys(state.cooldowns)) cooldowns[id] = cooldownRemaining(state, id, now);
  return {
    gauge: gaugeValue(state),
    gaugeMax: rules.gauge.max,
    cooldowns,
    armors: state.armors.slice(),
    armed: armedList(state),
    sealedMs: Math.max(0, state.sealedUntil - now),
    pending: pendingTotal(state),
    effects: state.activeEffects
      .filter((e) => e.category !== "seal" && e.until > now)
      .map((e) => ({ spiritId: e.spiritId, remainingMs: e.until - now })),
    grace: state.grace,
    jesusUsed: state.jesusUsed,
  };
}

/** API-024 `status`를 그 슬롯에만 전송 */
export function sendStatus(ctx: RoomContext, state: SlotState): void {
  ctx.send(state.slot, "status", statusPayload(state, ctx.now(), ctx.rules));
}
