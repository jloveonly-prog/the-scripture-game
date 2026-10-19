// TASK-023-3 · FR-006 · FR-008 · FR-064 · NFR-002 · NFR-003 · R-14 · API-202~210 — 검증된 수신 메시지 → 서비스 분배.
// 단일 책임: 메시지 종류별 분배와 clear 처리 순서 ①~⑧(API-204), opponentState 화이트리스트 중계, 리액션 중계, 봇 구동·영 종료 타이머.
import { JESUS_EFFECT_ID, REACTION_IDS } from '../../../client/js/net/protocol.js';
import { computeAttack, isB2bTetris, offsetAttack, rollHoleColumn, rollSpiritParams, selectSpirit, spiritGarbage, type AttackInput } from '../attack';
import { armorById, balance, spiritsById } from '../content';
import { performAngel } from './angels';
import { acquireArmor, applyIncomingDefenses, consumeCategoryWard, useArmor } from './armor';
import { addFaith, faithGainForClear } from './faith';
import { performHeroSkill } from './hero-skills';
import { clearCategories, expireEffects, noteLinesCleared, tryApplySpirit, type ActiveEffect } from './interference';
import { buildJesusAction, JESUS_EFFECT_MS, JESUS_VERSE_REF, jesusClearedCategories, shouldTriggerJesus } from './jesus-event';
import { checkClear, checkState, checkTopout, noteGarbageSent } from './progress-guard';
import { startQuiz, submitQuizAnswer } from './quiz-duel';
import { usageKey } from './representative-verse';
import {
  BOT_TICK_MS, isPractice, noteUsage, opponentOf, playerAt, scheduleSpiritExpiry, sendEffect, sendError, sendMessage, sendStatus,
  type PlayerState, type RoomContext, type SlotNo,
} from './room-state';
import { abortRoom, endPractice, handleReady, handleTopout } from './round-flow';
import { verifySpecial, type SpecialClaim } from './specials';

type Data = Record<string, unknown>;
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const TETRIS_LINES = 4;

/** R-14 opponentState 화이트리스트 재직렬화 (garbageIn 제외) */
function whitelistActive(active: unknown): Data | null {
  if (!active || typeof active !== 'object') return null;
  const a = active as Data;
  return { type: num(a.type), rot: num(a.rot), x: num(a.x), y: num(a.y) };
}

function notifySpiritEnds(ctx: RoomContext, owner: PlayerState, ended: ActiveEffect[]): void {
  for (const e of ended) {
    sendEffect(ctx, { kind: 'spiritEnd', id: e.spiritId, bySlot: e.fromSlot, targetSlot: owner.slot, action: { type: 'spiritEnd' }, verseRef: null, durationMs: 0 });
  }
}

// FR-039 예수님 이벤트 감지 (게이지 100 + 최신 보드 위험선, 경기당 1회 — 사람 플레이어)
function maybeJesus(ctx: RoomContext, p: PlayerState, now: number): void {
  if (p.isBot || ctx.room.phase !== 'playing') return;
  if (!shouldTriggerJesus({ mode: ctx.room.mode, faith: p.faith.faith, jesusUsed: p.jesusUsed, board: p.lastBoard })) return;
  p.jesusUsed = true;
  p.stats.jesusEvent = true;
  const ended = clearCategories(p.interference, jesusClearedCategories(), now);
  sendEffect(ctx, {
    kind: 'jesus', id: JESUS_EFFECT_ID, bySlot: p.slot, targetSlot: p.slot, action: buildJesusAction(p.lastBoard),
    verseRef: JESUS_VERSE_REF, durationMs: JESUS_EFFECT_MS,
  });
  notifySpiritEnds(ctx, p, ended);
  sendStatus(ctx, p, now);
  scheduleSpiritExpiry(ctx);
}

// FR-025~031·FR-037 받는 쪽 방어 → 영 적용(범주 무효·방해 상한) → API-254 송신 (검 되돌림은 1회만)
function receiveAttack(
  ctx: RoomContext, from: PlayerState, target: PlayerState, atk: { garbage: number; spiritId: string | null; holeColumn: number },
  reflected: boolean, now: number,
): void {
  const def = applyIncomingDefenses(atk, {
    armor: target.armor, garbageImmuneUntil: target.garbageImmuneUntil, grace: target.grace, now, allowReflect: !reflected,
  });
  if (def.outcome === 'reflected') {
    const sword = armorById.get('sword_of_the_spirit');
    sendEffect(ctx, {
      kind: 'reflect', id: 'sword_of_the_spirit', bySlot: target.slot, targetSlot: from.slot,
      action: { type: 'reflectNextAttack' }, verseRef: sword?.verseRef ?? null, durationMs: 0,
    });
    sendStatus(ctx, target, now);
    receiveAttack(ctx, target, from, atk, true, now);
    return;
  }
  let spiritId = def.spiritId;
  let duration = 0;
  let params: Data = {};
  const spirit = spiritId ? spiritsById.get(spiritId) : undefined;
  if (spirit) {
    const applied = consumeCategoryWard(target.armor, spirit.category) ? null : tryApplySpirit(target.interference, spirit, from.slot, now);
    if (applied && applied.applied) {
      duration = applied.durationMs;
      params = rollSpiritParams(spirit, ctx.deps.rand);
    } else spiritId = null;
  }
  target.pendingGarbage += def.garbage;
  noteGarbageSent(target.progress, def.garbage); // R-04 garbageIn 상한
  ctx.room.attackSeq += 1;
  const attack = { attackId: ctx.room.attackSeq, fromSlot: from.slot, spiritId, garbage: def.garbage, holeColumn: atk.holeColumn, duration, params, reflected };
  if (target.isBot) ctx.room.bot?.receiveAttack({ garbage: def.garbage, holeColumn: atk.holeColumn, spiritId, duration, params });
  else sendMessage(ctx, target.slot, 'attack', attack);
  if (!from.isBot) {
    sendMessage(ctx, from.slot, 'effect', {
      kind: 'attackSent', id: String(attack.attackId), bySlot: from.slot, targetSlot: target.slot,
      action: { type: 'attackSent', garbage: def.garbage, spiritId }, verseRef: spirit && spiritId ? spirit.verseRef : null, durationMs: duration,
    });
  }
  sendStatus(ctx, target, now);
  scheduleSpiritExpiry(ctx);
}

// FR-004·FR-024~026·FR-031~033·FR-036·FR-044~046 API-204 clear 처리 순서 ①~⑧
async function handleClear(ctx: RoomContext, p: PlayerState, d: Data, now: number): Promise<void> {
  const { room, deps } = ctx;
  const c = { seq: num(d.seq), lines: num(d.lines), combo: num(d.combo), b2b: d.b2b === true, tspin: d.tspin === true, pieceCount: num(d.pieceCount) };
  if (room.phase !== 'playing') {
    // 말씀 대결 정지 직전에 보낸 정상 clear: 판정·공격은 하지 않지만 진행 장부는 맞춘다 (이후 콤보·B2B R-06·R-07 연쇄 오거부 방지 — 여호수아 조정)
    if (room.phase === 'quiz') checkClear(p.progress, c, now);
    return void (p.isBot || sendError(ctx, p.slot, 'GAME_NOT_RUNNING', 'clear'));
  }
  // ① 진행 검증 (R-02~R-07)
  const guard = checkClear(p.progress, c, now);
  if (!guard.ok) {
    deps.log('clear-rejected', { guest: (p.guestId ?? 'bot').slice(0, 8), roomId: room.roomId, rule: guard.rule });
    if (!p.isBot) sendError(ctx, p.slot, guard.code, 'clear');
    return;
  }
  notifySpiritEnds(ctx, p, noteLinesCleared(p.interference, c.lines, now));
  p.stats.linesCleared += c.lines;
  p.stats.maxCombo = Math.max(p.stats.maxCombo, c.combo);
  if (c.lines === TETRIS_LINES) p.stats.tetrises += 1;
  p.roundStats.linesCleared += c.lines;
  p.roundStats.maxCombo = Math.max(p.roundStats.maxCombo, c.combo);
  // ② 게이지 충전 (은혜 ×1.15)
  addFaith(p.faith, faithGainForClear(c.lines, c.tspin, p.grace));
  // ③ 특수 칸 (R-09 — 거부된 칸만 무효, 줄 삭제 공격은 정상 처리)
  let jerichoCells = 0;
  let word = false;
  let rejected = false;
  const claims = Array.isArray(d.specials) ? (d.specials as SpecialClaim[]) : [];
  for (const claim of claims) {
    const v = p.specials && claim.pieceIndex <= c.pieceCount ? verifySpecial(p.specials, claim) : { ok: false as const, reason: 'index' };
    if (!v.ok) { rejected = true; continue; }
    if (v.kind === 'word') word = true;
    else if (v.kind === 'jericho') {
      jerichoCells += 1;
      sendEffect(ctx, { kind: 'special', id: 'jericho', bySlot: p.slot, targetSlot: p.slot, action: { type: 'jerichoBlast', size: balance.specials.jericho.blastSize }, verseRef: null, durationMs: 0 });
    } else if (v.kind === 'manna') {
      addFaith(p.faith, balance.faith.mannaGain);
      sendEffect(ctx, { kind: 'special', id: 'manna', bySlot: p.slot, targetSlot: p.slot, action: { type: 'mannaFaith', amount: balance.faith.mannaGain }, verseRef: null, durationMs: 0 });
    } else if (v.armorId) acquireArmor(p.armor, v.armorId);
  }
  if (rejected) {
    deps.log('clear-rejected', { guest: (p.guestId ?? 'bot').slice(0, 8), roomId: room.roomId, rule: 'R-09' });
    if (!p.isBot) sendError(ctx, p.slot, 'PROGRESS_REJECTED', 'clear');
  }
  // ④~⑦ 공격 (연습 모드 없음)
  const opp = opponentOf(room, p.slot);
  if (!isPractice(room) && opp) {
    const input: AttackInput = { lines: c.lines, combo: c.combo, b2b: c.b2b, tspin: c.tspin, jerichoCells };
    const prevB2bTetris = p.lastB2bTetris;
    p.lastB2bTetris = isB2bTetris(input);
    const power = computeAttack(input);
    p.stats.attackSent += power;
    p.roundStats.attackSent += power;
    const off = offsetAttack(power, p.pendingGarbage);
    p.pendingGarbage = off.pending;
    if (off.used > 0 && !p.isBot) {
      sendMessage(ctx, p.slot, 'effect', { kind: 'offset', id: 'offset', bySlot: p.slot, targetSlot: p.slot, action: { type: 'offset', rows: off.used }, verseRef: null, durationMs: 0 });
    }
    if (off.residual > 0) {
      const holeColumn = rollHoleColumn(deps.rand);
      const spiritId = selectSpirit(input, prevB2bTetris, deps.rand);
      receiveAttack(ctx, p, opp, { garbage: spiritGarbage(spiritId, off.residual), spiritId, holeColumn }, false, now);
    }
  }
  // ⑧ 내 상태
  sendStatus(ctx, p, now);
  if (word) startQuiz(ctx, 'wordBlock', now);
  maybeJesus(ctx, p, now);
}

// FR-006·R-14 API-203 state — 검증 후 상대에게 화이트리스트 중계, 대기 쓰레기 장부(D-16)·위기 판정(D-18) 입력
function handleState(ctx: RoomContext, p: PlayerState, d: Data, now: number): void {
  if (ctx.room.phase === 'waiting' || ctx.room.phase === 'ended') return;
  const r = checkState(p.progress, num(d.seq), num(d.garbageIn));
  if (!r.ok || typeof d.board !== 'string') return;
  p.lastBoard = d.board;
  if (r.garbageDelta > 0) {
    p.pendingGarbage = Math.max(0, p.pendingGarbage - r.garbageDelta);
    sendStatus(ctx, p, now);
  }
  const opp = opponentOf(ctx.room, p.slot);
  if (opp && !opp.isBot) {
    sendMessage(ctx, opp.slot, 'opponentState', { slot: p.slot, seq: num(d.seq), board: d.board, active: whitelistActive(d.active), score: num(d.score) });
  }
  maybeJesus(ctx, p, now);
}

// FR-034·FR-035 API-205 skill
function handleSkill(ctx: RoomContext, p: PlayerState, d: Data, now: number): void {
  if (ctx.room.phase !== 'playing') return sendError(ctx, p.slot, 'GAME_NOT_RUNNING', 'skill');
  const skillId = String(d.skillId ?? '');
  const isHero = skillId.startsWith('hero_');
  const opp = opponentOf(ctx.room, p.slot);
  const r = isHero ? performHeroSkill(p, skillId, opp?.slot ?? null, now) : performAngel(p, skillId, isPractice(ctx.room), now);
  if (!r.ok) return sendError(ctx, p.slot, r.code, 'skill', 'retryAfterMs' in r ? r.retryAfterMs : undefined);
  if (isHero) p.stats.skillsUsed += 1;
  else p.stats.angelsUsed += 1;
  noteUsage(ctx.room, isHero ? usageKey('hero', p.heroId) : usageKey('angel', r.effect.id));
  sendEffect(ctx, r.effect);
  const ended: ActiveEffect[] = 'ended' in r ? (r.ended as ActiveEffect[]) : [];
  notifySpiritEnds(ctx, p, ended);
  sendStatus(ctx, p, now);
  scheduleSpiritExpiry(ctx);
}

// FR-037 API-206 armor
function handleArmor(ctx: RoomContext, p: PlayerState, d: Data, now: number): void {
  if (ctx.room.phase !== 'playing') return sendError(ctx, p.slot, 'GAME_NOT_RUNNING', 'armor');
  const r = useArmor(p.armor, String(d.armorId ?? ''), isPractice(ctx.room));
  if (!r.ok) return sendError(ctx, p.slot, r.code, 'armor');
  p.stats.armorUsed += 1;
  noteUsage(ctx.room, usageKey('armor', r.armor.id));
  sendEffect(ctx, { kind: 'armor', id: r.armor.id, bySlot: p.slot, targetSlot: p.slot, action: { ...r.armor.action }, verseRef: r.armor.verseRef, durationMs: 0 });
  notifySpiritEnds(ctx, p, clearCategories(p.interference, r.clearCategories, now));
  sendStatus(ctx, p, now);
  scheduleSpiritExpiry(ctx);
}

// FR-007 API-207 topout
async function handleTopoutMessage(ctx: RoomContext, p: PlayerState, d: Data, now: number): Promise<void> {
  if (ctx.room.phase !== 'playing' && ctx.room.phase !== 'quiz') return void (p.isBot || sendError(ctx, p.slot, 'GAME_NOT_RUNNING', 'topout'));
  const guard = checkTopout(p.progress, num(d.seq), num(d.pieceCount));
  if (!guard.ok) return void (p.isBot || sendError(ctx, p.slot, guard.code, 'topout'));
  await handleTopout(ctx, p.slot, now);
}

// FR-064·C-009 API-209 reaction — 사람 대 사람만 중계 (봇·연습은 중계 없음 — UC-017 1a)
function handleReaction(ctx: RoomContext, p: PlayerState, d: Data): void {
  const reactionId = String(d.reactionId ?? '');
  if (!REACTION_IDS.includes(reactionId)) return sendError(ctx, p.slot, 'INVALID_REACTION', 'reaction');
  const opp = opponentOf(ctx.room, p.slot);
  if (opp && !opp.isBot && opp.connected) sendMessage(ctx, opp.slot, 'reaction', { fromSlot: p.slot, reactionId });
}

// FR-008 검증된 메시지 1건 분배 (예외는 INTERNAL_ERROR로 응답 — 한 메시지 실패가 방을 멈추지 않게, devguide §3.6)
export async function routeMessage(ctx: RoomContext, slot: SlotNo, type: string, data: Data, now: number): Promise<void> {
  const p = playerAt(ctx.room, slot);
  try {
    if (!p) return sendError(ctx, slot, 'NOT_IN_ROOM', type);
    switch (type) {
      case 'ready': return handleReady(ctx, slot, now);
      case 'state': return handleState(ctx, p, data, now);
      case 'clear': return await handleClear(ctx, p, data, now);
      case 'skill': return handleSkill(ctx, p, data, now);
      case 'armor': return handleArmor(ctx, p, data, now);
      case 'topout': return await handleTopoutMessage(ctx, p, data, now);
      case 'quizAnswer': return submitQuizAnswer(ctx, slot, String(data.quizId ?? ''), num(data.choice), now);
      case 'reaction': return handleReaction(ctx, p, data);
      case 'quit':
        if (!isPractice(ctx.room)) return sendError(ctx, slot, 'NOT_ALLOWED_IN_MODE', 'quit');
        return await endPractice(ctx, 'practiceEnd', now);
      default: return sendError(ctx, slot, 'INVALID_MESSAGE', type);
    }
  } catch (err) {
    ctx.deps.log('room-message-error', { roomId: ctx.room.roomId, type, error: err instanceof Error ? err.name : 'unknown' });
    if (p && !p.isBot) sendError(ctx, slot, 'INTERNAL_ERROR', type);
  }
}

// FR-021 봇 구동 (≤ 50ms) — 봇 출력도 사람과 같은 판정 파이프라인 (devguide §7.4)
export async function onBotTick(ctx: RoomContext, now: number): Promise<void> {
  const { room } = ctx;
  const botPlayer = room.players.find((p) => p.isBot);
  const running = (): boolean => room.phase !== 'ended' && room.phase !== 'roundEnd' && room.phase !== 'waiting';
  if (!room.bot || !botPlayer || !running()) return;
  let outputs;
  try {
    outputs = room.bot.tick(now);
  } catch (err) {
    ctx.deps.log('bot-failure', { roomId: room.roomId, error: err instanceof Error ? err.name : 'unknown' });
    return abortRoom(ctx, 'BOT_FAILURE', 'bot');
  }
  for (const out of outputs) {
    if (!running()) break;
    await routeMessage(ctx, botPlayer.slot, out.type, out.data, now);
  }
  if (room.bot && running()) ctx.deps.timers.schedule('botTick', now + BOT_TICK_MS);
}

// FR-031 영 효과 시간 만료 → spiritEnd 통지 + 상태 갱신
export function onSpiritsTimer(ctx: RoomContext, now: number): void {
  if (ctx.room.phase === 'quiz' || ctx.room.phase === 'ended') return;
  for (const p of ctx.room.players) {
    const ended = expireEffects(p.interference, now);
    if (ended.length === 0) continue;
    notifySpiritEnds(ctx, p, ended);
    sendStatus(ctx, p, now);
  }
  scheduleSpiritExpiry(ctx);
}
