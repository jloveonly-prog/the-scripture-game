// TASK-020-4 · FR-075 · FR-031 · D-17 — 방해 상한: 6초·동시 2개·비중첩·1.5초 재적용 금지·봉인 예외·줄 단위·해제 검사.
import { describe, expect, it } from 'vitest';
import {
  clearCategories, clearSpirits, createInterferenceLedger, expireEffects, nextExpiryAt, noteLinesCleared, sealedRemainingMs,
  shiftEffects, tryApplySpirit,
} from '../../../worker/src/room/interference.ts';
import { spiritsById, type SpiritDef } from '../../../worker/src/content.ts';

const spirit = (id: string): SpiritDef => spiritsById.get(id)!;
const longSpirit: SpiritDef = { ...spirit('jezebel'), id: 'test_long', effect: { kinds: ['reverseLR'], durationMs: 9000, params: {} } };

describe('tryApplySpirit (FR-031)', () => {
  it('시간형 효과는 최대 6000ms로 자른다', () => {
    const l = createInterferenceLedger();
    const r = tryApplySpirit(l, longSpirit, 1, 1000);
    expect(r).toEqual({ applied: true, durationMs: 6000, tracked: true });
    expect(l.active[0].endsAt).toBe(7000);
  });

  it('봉인(prince_of_persia)은 상한 예외 21000ms, 남은 봉인 시간 계산', () => {
    const l = createInterferenceLedger();
    expect(tryApplySpirit(l, spirit('prince_of_persia'), 1, 0)).toMatchObject({ applied: true, durationMs: 21000 });
    expect(sealedRemainingMs(l, 5000)).toBe(16000);
    expect(sealedRemainingMs(l, 22000)).toBe(0);
  });

  it('동시 적용 최대 2개 — 세 번째는 미적용, 즉시형도 적용 순간 검사', () => {
    const l = createInterferenceLedger();
    expect(tryApplySpirit(l, spirit('unclean_spirit'), 1, 0).applied).toBe(true);
    expect(tryApplySpirit(l, spirit('jezebel'), 1, 0).applied).toBe(true);
    expect(tryApplySpirit(l, spirit('babylon'), 1, 0)).toEqual({ applied: false, reason: 'concurrent' });
    expect(tryApplySpirit(l, spirit('abaddon'), 1, 0)).toEqual({ applied: false, reason: 'concurrent' });
    const fresh = createInterferenceLedger();
    expect(tryApplySpirit(fresh, spirit('abaddon'), 1, 0)).toEqual({ applied: true, durationMs: 0, tracked: false });
    expect(fresh.active).toHaveLength(0);
  });

  it('같은 효과는 겹치지 않는다', () => {
    const l = createInterferenceLedger();
    tryApplySpirit(l, spirit('jezebel'), 1, 0);
    expect(tryApplySpirit(l, spirit('jezebel'), 1, 1000)).toEqual({ applied: false, reason: 'stacking' });
  });

  it('같은 영 효과 종료 후 1500ms 재적용 금지', () => {
    const l = createInterferenceLedger();
    tryApplySpirit(l, spirit('unclean_spirit'), 1, 0); // 3000ms
    expect(tryApplySpirit(l, spirit('unclean_spirit'), 1, 4000)).toEqual({ applied: false, reason: 'reapply' });
    expect(tryApplySpirit(l, spirit('unclean_spirit'), 1, 4500).applied).toBe(true);
  });

  it('줄 단위형(납 줄)은 4줄 삭제 후 소멸하고 동시 개수에 포함된다', () => {
    const l = createInterferenceLedger();
    expect(tryApplySpirit(l, spirit('wickedness'), 2, 0)).toEqual({ applied: true, durationMs: 0, tracked: true });
    expect(l.active[0]).toMatchObject({ endsAt: null, clearsLeft: 4, fromSlot: 2 });
    expect(noteLinesCleared(l, 2, 100)).toHaveLength(0);
    expect(noteLinesCleared(l, 2, 200).map((e) => e.spiritId)).toEqual(['wickedness']);
    expect(l.active).toHaveLength(0);
  });
});

describe('종료·해제', () => {
  it('expireEffects는 만료된 효과를 돌려주고 nextExpiryAt은 가장 이른 만료', () => {
    const l = createInterferenceLedger();
    tryApplySpirit(l, spirit('unclean_spirit'), 1, 0);
    tryApplySpirit(l, spirit('deaf_dumb_spirit'), 1, 0);
    expect(nextExpiryAt(l)).toBe(3000);
    expect(expireEffects(l, 3000).map((e) => e.spiritId)).toEqual(['unclean_spirit']);
    expect(l.endedAt.unclean_spirit).toBe(3000);
    expect(nextExpiryAt(l)).toBe(5000);
  });

  it('범주 해제(스랍·갑주·예수님)와 지정 영 해제(미가엘)', () => {
    const l = createInterferenceLedger();
    tryApplySpirit(l, spirit('jezebel'), 1, 0);
    tryApplySpirit(l, spirit('unclean_spirit'), 1, 0);
    expect(clearCategories(l, ['control'], 10).map((e) => e.spiritId)).toEqual(['jezebel']);
    expect(clearSpirits(l, ['unclean_spirit'], 20).map((e) => e.spiritId)).toEqual(['unclean_spirit']);
    expect(l.active).toHaveLength(0);
  });

  it('말씀 대결 정지 시간만큼 진행 중 효과를 미룬다', () => {
    const l = createInterferenceLedger();
    tryApplySpirit(l, spirit('jezebel'), 1, 0);
    shiftEffects(l, 13000, 2000);
    expect(l.active[0].endsAt).toBe(19000);
  });
});
