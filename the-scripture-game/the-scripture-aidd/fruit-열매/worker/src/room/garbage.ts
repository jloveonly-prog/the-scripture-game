// garbage.ts — 대기 공격 상쇄·감경·상승 시점 결정 논리만 (타이머는 주입된 schedule로)
// TASK-014 | REQ-007 FR-016 FR-025 FR-031 FR-037 FR-062 | ARCH-011 | API-021 `attack` · API-022 `garbage` | TBL-018
// `garbage`·`grace`·`armor`
// architecture §9.2: `attack` 도착 즉시 받는 쪽 pending에 쌓이고, garbage.delayMs 안에 받는 쪽이 줄을 지우면 먼저 상쇄,
// 만료 시 서버가 `garbage`로 상승 지시. 베드로 스킬 중 만료된 상승은 무효로 버린다.
// 받는 쪽 준비된 방어(방패·미가엘·검·흉배 — armor.ts·angels.ts가 세운 플래그)와 은혜 −1을 여기서 소모·적용한다.
import { spiritsById } from "../content";
import type { Slot } from "../storage/adapter";
import { tryApplySpirit } from "./effects";
import { pendingTotal, sendStatus, type PendingEntry, type RoomContext, type SlotState } from "./player-state";

let nextEntryId = 1;

/** API-021 `attack` 페이로드 */
export interface AttackPayload {
  from: Slot;
  target: Slot;
  linesCleared: number;
  attackPower: number;
  canceled: number;
  garbage: number;
  blockedBy: "shield_of_faith" | "michael" | null;
  reflected: boolean;
  spiritId: string | null;
  duration: number;
  spiritApplied: boolean;
  holeColumn: number;
  params: Record<string, number | string>;
  pending: number;
  verseRef: string | null;
}

/** 공격 1회 입력 (attack.ts 결과 + 출처) */
export interface DeliverInput {
  linesCleared: number;
  attackPower: number;
  spiritId: string | null;
  /** 성령의 검이 되돌린 공격 — 다시 되돌리지 않고 보낸 쪽 상쇄도 하지 않는다 */
  reflected: boolean;
}

/**
 * FR-025 상쇄: 내가 줄을 지워 만든 공격력으로 내 대기 공격(오래된 것부터)을 먼저 줄인다.
 * 줄 수가 0이 된 항목은 납 블록을 싣고 있지 않으면 타이머까지 취소한다.
 * @returns 상쇄된 양
 */
export function offsetPending(state: SlotState, power: number): number {
  let left = power;
  for (const entry of state.pending) {
    if (left <= 0) break;
    const used = Math.min(entry.lines, left);
    entry.lines -= used;
    left -= used;
  }
  dropEmpty(state);
  return power - left;
}

/** 줄 0·납 0 항목 제거 */
function dropEmpty(state: SlotState): void {
  state.pending = state.pending.filter((e) => {
    if (e.lines > 0 || e.leadRows > 0) return true;
    e.cancel?.();
    return false;
  });
}

/**
 * 대기 공격에서 n줄 덜어 낸다 (FR-035 그룹 burnPending, FR-037 흉배 — 오래된 것부터).
 * @returns 실제로 덜어 낸 줄 수
 */
export function reducePending(state: SlotState, n: number): number {
  let left = n;
  for (const entry of state.pending) {
    if (left <= 0) break;
    const used = Math.min(entry.lines, left);
    entry.lines -= used;
    left -= used;
  }
  dropEmpty(state);
  return n - left;
}

/** 대기 공격 1건을 꺼낸다 (FR-035 미가엘 상쇄 · FR-037 성령의 검 되돌림). 타이머 취소. */
export function takePendingEntry(state: SlotState, match: (entry: PendingEntry) => boolean): PendingEntry | null {
  const i = state.pending.findIndex(match);
  if (i < 0) return null;
  const [entry] = state.pending.splice(i, 1);
  entry.cancel?.();
  return entry;
}

/** 모든 대기 공격 취소 (라운드 종료·경기 종료) */
export function cancelAllPending(state: SlotState): void {
  for (const entry of state.pending) entry.cancel?.();
  state.pending = [];
}

/**
 * 공격 전달 (UC-008 3~6단계, architecture §8.2):
 * ① 보낸 쪽 대기 공격 상쇄 → ② 받는 쪽 방패(1회 완전 차단)·미가엘(용·사탄 계열 차단) → ③ 성령의 검(되돌림)
 * → ④ 흉배 −breastplateReduce · 은혜 −garbageReduce → ⑤ 악한 영 상한 판정(effects.ts) → ⑥ 대기열 + 상승 타이머.
 * 상쇄 후 남은 공격이 0이면 `attack`을 보내지 않는다 (API-021 발생 조건 "상쇄 후 공격 > 0").
 * @returns 전송한 `attack` 페이로드 목록 (되돌림 포함)
 */
export function deliverAttack(ctx: RoomContext, sender: SlotState, receiver: SlotState,
  input: DeliverInput): AttackPayload[] {
  const rules = ctx.rules;
  const canceled = input.reflected ? 0 : offsetPending(sender, input.attackPower);
  const remaining = input.attackPower - canceled;
  if (remaining <= 0) {
    sendStatus(ctx, sender);
    return [];
  }
  const spirit = input.spiritId ? spiritsById.get(input.spiritId) ?? null : null;
  const base: AttackPayload = {
    from: sender.slot, target: receiver.slot, linesCleared: input.linesCleared, attackPower: input.attackPower,
    canceled, garbage: 0, blockedBy: null, reflected: input.reflected, spiritId: spirit?.id ?? null, duration: 0,
    spiritApplied: false, holeColumn: Math.floor(ctx.random() * rules.board.width), params: {}, pending: 0,
    verseRef: spirit?.verse_ref ?? null,
  };
  // ② FR-037 믿음의 방패 / FR-035 미가엘 — 완전 차단 (garbage 0, spiritApplied false)
  const michaelFamily = !!spirit && rules.angels.michael.families.includes(spirit.id);
  const blockedBy = receiver.armed.shield
    ? "shield_of_faith"
    : receiver.armed.michael && michaelFamily ? "michael" : null;
  if (blockedBy) {
    if (blockedBy === "shield_of_faith") receiver.armed.shield = false;
    else receiver.armed.michael = false;
    return finish(ctx, sender, receiver, { ...base, blockedBy, pending: pendingTotal(receiver) });
  }
  // ③ FR-037 성령의 검 — 받은 공격 1회를 상대에게 되돌림 (되돌린 공격은 다시 되돌리지 않음)
  if (receiver.armed.sword && !input.reflected) {
    receiver.armed.sword = false;
    sendStatus(ctx, sender);
    return deliverAttack(ctx, receiver, sender, { ...input, attackPower: remaining, reflected: true });
  }
  // ④ FR-037 흉배 rules.armor.breastplateReduce, FR-062 은혜 rules.grace.garbageReduce
  let garbage = remaining;
  if (receiver.armed.breastplate) {
    receiver.armed.breastplate = false;
    garbage -= rules.armor.breastplateReduce;
  }
  if (receiver.grace) garbage -= rules.grace.garbageReduce;
  garbage = Math.max(0, garbage);
  // ⑤ FR-031 방해 상한 — 넘으면 효과만 빠지고 쓰레기는 적용
  const payload: AttackPayload = { ...base, garbage };
  let leadRows = 0;
  if (spirit) {
    const result = tryApplySpirit(receiver, spirit, ctx.now(), rules, rules.board.width);
    payload.spiritApplied = result.applied;
    payload.duration = result.durationMs;
    if (result.applied) {
      payload.params = { ...spirit.params, ...serverParams(ctx, spirit.effect) };
      if (spirit.effect === "lead_row") leadRows = Number(spirit.params.rows ?? 0);
    }
  }
  // ⑥ 대기열 + 상승 타이머 (rules.garbage.delayMs)
  if (garbage > 0 || leadRows > 0) enqueue(ctx, receiver, sender.slot, garbage, payload.holeColumn, payload.spiritId,
    leadRows);
  sender.totals.attackSent += garbage;
  return finish(ctx, sender, receiver, { ...payload, pending: pendingTotal(receiver) });
}

/** 서버가 정하는 효과 세부 (API-021 params: abaddon `seed`, prince_of_the_air `pushDir` ±1) */
function serverParams(ctx: RoomContext, effect: string): Record<string, number> {
  if (effect === "gnaw_holes") return { seed: ctx.randomUint32() };
  if (effect === "wind") return { pushDir: ctx.random() < 0.5 ? -1 : 1 };
  return {};
}

/** 양측에 `attack`, 양측 `status` 갱신 */
function finish(ctx: RoomContext, sender: SlotState, receiver: SlotState, payload: AttackPayload): AttackPayload[] {
  ctx.broadcast("attack", payload);
  sendStatus(ctx, sender);
  sendStatus(ctx, receiver);
  return [payload];
}

/** 받는 쪽 대기열에 넣고 상승 타이머를 건다 */
function enqueue(ctx: RoomContext, receiver: SlotState, fromSlot: Slot, lines: number, holeColumn: number,
  spiritId: string | null, leadRows: number): void {
  const entry: PendingEntry = {
    id: nextEntryId++, fromSlot, lines, holeColumn, spiritId, leadRows,
    dueAt: ctx.now() + ctx.rules.garbage.delayMs, cancel: null,
  };
  entry.cancel = ctx.schedule(ctx.rules.garbage.delayMs, () => rise(ctx, receiver, entry.id));
  receiver.pending.push(entry);
}

/**
 * 상승 타이머 만료 (API-022). 베드로 스킬(peterUntil) 중이면 상승 무효(voided). 납 블록 줄은 이 메시지와 함께 오른다.
 * @returns 보낸 `garbage` 페이로드 (항목이 이미 상쇄·제거됐으면 null)
 */
export function rise(ctx: RoomContext, receiver: SlotState, entryId: number) {
  const i = receiver.pending.findIndex((e) => e.id === entryId);
  if (i < 0) return null;
  const [entry] = receiver.pending.splice(i, 1);
  // FR-016 베드로 "10초 동안 쓰레기 줄 상승 무효"
  const voided = ctx.now() < receiver.peterUntil ? entry.lines : 0;
  const rows = entry.lines - voided;
  receiver.round.garbageRows += rows;
  const payload = { target: receiver.slot, rows, holeColumn: entry.holeColumn, voided,
    pending: pendingTotal(receiver) };
  ctx.broadcast("garbage", payload);
  sendStatus(ctx, receiver);
  return payload;
}

/**
 * 말씀 대결 정지 동안 상승 타이머 멈춤 (FR-041 "두 플레이어 화면이 동시에 멈추고") — 남은 시간은 dueAt에 보관.
 */
export function pausePending(state: SlotState, now: number): void {
  for (const entry of state.pending) {
    entry.cancel?.();
    entry.cancel = null;
    entry.dueAt = Math.max(0, entry.dueAt - now);
  }
}

/** 재개 — 멈출 때 남은 시간만큼 다시 건다 (pausePending 짝) */
export function resumePending(ctx: RoomContext, state: SlotState): void {
  const now = ctx.now();
  for (const entry of state.pending) {
    const remaining = entry.dueAt;
    entry.dueAt = now + remaining;
    entry.cancel = ctx.schedule(remaining, () => rise(ctx, state, entry.id));
  }
}
