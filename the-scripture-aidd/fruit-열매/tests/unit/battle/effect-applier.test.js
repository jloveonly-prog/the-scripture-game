// TASK-011-4 · FR-014~017 · FR-025 · FR-029 · FR-035 · FR-037 · FR-039 · FR-075 — attack·effect 보드 적용 단위 테스트.
import { describe, expect, it } from 'vitest';
import balance from '../../../content/balance.json';
import { applyAttack, applyEffect } from '../../../client/js/battle/effect-applier.js';
import { createInterference } from '../../../client/js/battle/interference-client.js';
import { createGame } from '../../../client/js/engine/game.js';
import { garbageRowIndices } from '../../../client/js/engine/board.js';

const MY = 1;
const OPP = 2;
const setup = () => {
  const game = createGame({ seed: 7, mode: 'random', stage: 0, rules: balance });
  game.start();
  const local = { hintUntil: 0, immuneUntil: 0, revealLeft: 0, revealHint: false };
  return { game, interference: createInterference(), mySlot: MY, now: 1000, local, wards: {} };
};
const effect = (kind, action, extra = {}) => ({ kind, id: 'x', bySlot: MY, targetSlot: MY, action, verseRef: null, durationMs: 0, ...extra });
const withGarbage = (ctx, rows) => {
  ctx.game.queueGarbage(rows, 0);
  ctx.game.hardDrop();
  ctx.game.drainEvents();
};

describe('effect-applier — attack (FR-025·FR-027~030)', () => {
  it('쓰레기는 대기 큐로, EVT-21', () => {
    const ctx = setup();
    const fx = applyAttack({ attackId: 1, fromSlot: OPP, spiritId: null, garbage: 3, holeColumn: 4, duration: 0, params: {}, reflected: false }, ctx);
    expect(ctx.game.pendingGarbage()).toBe(3);
    expect(fx).toEqual([{ evt: 'EVT-21', garbage: 3, fromSlot: OPP }]);
  });

  it('영 효과 → EVT-27, 아바돈은 열 최상단 제거, 악은 납 줄', () => {
    const ctx = setup();
    withGarbage(ctx, 2);
    const fx = applyAttack({ fromSlot: OPP, spiritId: 'abaddon', garbage: 0, holeColumn: 0, duration: 0, params: { columns: [1, 2] } }, ctx);
    expect(fx.map((f) => f.evt)).toEqual(['EVT-27']);
    const grid = ctx.game.snapshot().grid;
    const top = garbageRowIndices(grid).at(-1);
    expect(grid[top][1]).toBe('0');
    applyAttack({ fromSlot: OPP, spiritId: 'wickedness', garbage: 0, holeColumn: 0, duration: 0, params: { clearsToExpire: 4 } }, ctx);
    expect(ctx.game.snapshot().leadRows).toEqual([{ row: 19, clearsLeft: 4 }]);
  });

  it('방패 장전 중 빈 공격 → EVT-24, 흉배 장전 → EVT-26, 되돌아온 공격 → EVT-25', () => {
    const ctx = setup();
    ctx.wards = { shield: true, breastplate: false };
    expect(applyAttack({ fromSlot: OPP, spiritId: null, garbage: 0, holeColumn: 0 }, ctx)).toEqual([{ evt: 'EVT-24' }]);
    ctx.wards = { breastplate: true };
    const fx = applyAttack({ fromSlot: OPP, spiritId: null, garbage: 2, holeColumn: 0, reflected: true }, ctx);
    expect(fx.map((f) => f.evt)).toEqual(['EVT-21', 'EVT-26', 'EVT-25']);
  });
});

describe('effect-applier — effect action.type (FR-014~017·FR-035·FR-037·FR-039)', () => {
  it('다윗 물맷돌이 나를 겨누면 내 보드 꼭대기 3칸 제거', () => {
    const ctx = setup();
    withGarbage(ctx, 1);
    const before = ctx.game.snapshot().grid.flat().filter((c) => c !== '0').length;
    const fx = applyEffect(effect('hero', { type: 'destroyTopBlocks', count: 3 }, { bySlot: OPP, id: 'hero_david' }), ctx);
    expect(fx[0]).toMatchObject({ evt: 'EVT-29', kind: 'hero', target: 'me' });
    expect(ctx.game.snapshot().grid.flat().filter((c) => c !== '0').length).toBe(before - 3);
  });

  it('상대 보드가 대상이면 내 보드는 그대로', () => {
    const ctx = setup();
    withGarbage(ctx, 1);
    const before = ctx.game.snapshot().grid;
    const fx = applyEffect(effect('hero', { type: 'destroyTopBlocks', count: 3 }, { targetSlot: OPP }), ctx);
    expect(fx).toEqual([{ evt: 'EVT-29', kind: 'hero', id: 'x', target: 'opponent', action: { type: 'destroyTopBlocks', count: 3 } }]);
    expect(ctx.game.snapshot().grid).toEqual(before);
  });

  it('바울·섬기는 영들: 맨 아래 쓰레기 줄 제거 (부족하면 있는 만큼)', () => {
    const ctx = setup();
    withGarbage(ctx, 2);
    applyEffect(effect('hero', { type: 'removeBottomGarbage', rows: 3 }), ctx);
    expect(garbageRowIndices(ctx.game.snapshot().grid)).toEqual([]);
  });

  it('솔로몬·베드로·가브리엘은 시간 상태를 갱신', () => {
    const ctx = setup();
    applyEffect(effect('hero', { type: 'landingHint', durationMs: 10000 }), ctx);
    applyEffect(effect('hero', { type: 'garbageImmune', durationMs: 10000 }), ctx);
    applyEffect(effect('angel', { type: 'revealQueue', count: 7, landingHint: true }), ctx);
    expect(ctx.local).toEqual({ hintUntil: 11000, immuneUntil: 11000, revealLeft: 7, revealHint: true });
  });

  it('스랍·허리띠 해제 → EVT-28, 납 줄 녹음', () => {
    const ctx = setup();
    ctx.interference.applySpirit({ spiritId: 'jezebel', duration: 6000, params: {} }, 1000);
    ctx.game.insertLeadRow(4);
    const fx = applyEffect(effect('angel', { type: 'cleanseCurses', categories: ['deception', 'control', 'speed', 'board'] }), ctx);
    expect(fx.filter((f) => f.evt === 'EVT-28')).toEqual([{ evt: 'EVT-28', spiritId: 'jezebel', target: 'me' }]);
    expect(ctx.game.snapshot().leadRows).toEqual([]);
    ctx.interference.applySpirit({ spiritId: 'prince_of_the_air', duration: 6000, params: {} }, 1000);
    const armorFx = applyEffect(effect('armor', { type: 'wardCategories', categories: ['speed'], charges: 1, clearActive: true }, { id: 'gospel_shoes' }), ctx);
    expect(armorFx.map((f) => f.evt)).toEqual(['EVT-31', 'EVT-28']);
  });

  it('예수님: 저주·시야 해제 + 쓰레기 줄 제거 → EVT-32', () => {
    const ctx = setup();
    withGarbage(ctx, 4);
    ctx.interference.applySpirit({ spiritId: 'dragon', duration: 4000, params: {} }, 1000);
    const fx = applyEffect(effect('jesus', { type: 'overcome', clearCurses: true, clearVision: true, removeGarbageRows: 2 }, { id: 'overcome_the_world' }), ctx);
    expect(fx[0]).toEqual({ evt: 'EVT-32', target: 'me' });
    expect(fx.some((f) => f.evt === 'EVT-28' && f.spiritId === 'dragon')).toBe(true);
    expect(garbageRowIndices(ctx.game.snapshot().grid)).toHaveLength(2);
  });

  it('상쇄·공격 발사·되돌림·영 종료 연출, 서버 전용 지시는 보드 무변화', () => {
    const ctx = setup();
    expect(applyEffect(effect('offset', { type: 'offset', rows: 2 }), ctx)).toEqual([{ evt: 'EVT-22', rows: 2 }]);
    expect(applyEffect(effect('attackSent', { type: 'attackSent', garbage: 4 }), ctx)).toEqual([{ evt: 'EVT-20', garbage: 4 }]);
    expect(applyEffect(effect('reflect', {}, { bySlot: OPP }), ctx)).toEqual([{ evt: 'EVT-25', side: 'opponent' }]);
    expect(applyEffect(effect('spiritEnd', {}, { id: 'legion', targetSlot: OPP }), ctx)).toEqual([{ evt: 'EVT-28', spiritId: 'legion', target: 'opponent' }]);
    const before = ctx.game.snapshot().grid;
    applyEffect(effect('angel', { type: 'burnIncoming', rows: 2 }), ctx);
    applyEffect(effect('special', { type: 'jerichoBlast', center: [19, 0], size: 3 }), ctx);
    expect(ctx.game.snapshot().grid).toEqual(before);
    expect(applyEffect(null, ctx)).toEqual([]);
  });
});
