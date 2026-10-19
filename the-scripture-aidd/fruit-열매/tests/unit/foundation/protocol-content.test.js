// TASK-007 · REQ-017 · FR-074 · FR-075 · FR-038 · FR-008 — 기반 스모크 테스트:
// 공용 프로토콜 상수(protocol.js)와 공용 콘텐츠(content/*.json)·서버 색인(content.ts)이 서로 같은 ID 체계를 쓰는지 검사한다.
import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_IDS, ANGEL_IDS, ARMOR_CELL_CODES, ARMOR_IDS, ERRORS, HERO_IDS, PATTERNS, ROOM_CODE_ALPHABET, SPIRIT_IDS,
  angelSkillId, encodeClientMessage, encodeErrorMessage, encodeServerMessage, heroSkillId,
} from '../../../client/js/net/protocol.js';
import { content, armorByCellCode } from '../../../client/js/content/content-loader.js';
import { balance, findSkill, spiritsById } from '../../../worker/src/content.ts';

describe('protocol.js ↔ content/*.json ID 일치 (CODE-003~006·014)', () => {
  it('위인·천사·악한 영·갑주·업적 ID 목록과 순서가 같다', () => {
    expect(content.heroes.map((h) => h.id)).toEqual([...HERO_IDS]);
    expect(content.angels.map((a) => a.id)).toEqual([...ANGEL_IDS]);
    expect(content.spirits.map((s) => s.id)).toEqual([...SPIRIT_IDS]);
    expect(content.armor.map((a) => a.id)).toEqual([...ARMOR_IDS]);
    expect(content.achievements.map((a) => a.id)).toEqual([...ACHIEVEMENT_IDS]);
  });

  it('갑주 셀 코드 d~i가 CODE-006 순서와 같다 (CODE-009)', () => {
    expect(content.armor.map((a) => a.cellCode)).toEqual([...ARMOR_CELL_CODES]);
    expect(armorByCellCode.get('g')?.id).toBe('shield_of_faith');
  });

  it('위인 스킬 ID는 hero_ 접두, 서버 findSkill로 위인·천사를 찾는다', () => {
    for (const hero of content.heroes) expect(hero.skill.id).toBe(heroSkillId(hero.id));
    expect(findSkill(heroSkillId('peter'))).toMatchObject({ kind: 'hero' });
    expect(findSkill(angelSkillId('michael'))).toMatchObject({ kind: 'angel' });
    expect(findSkill('angel_lilith')).toBeNull();
  });
});

describe('상성표·밸런스 기본 규칙 (FR-038, FR-031, D-14)', () => {
  it('상성표가 악한 영 14종을 1행씩 덮고 각 행 대응 수단이 1개 이상이다', () => {
    expect(content.counters.map((c) => c.spiritId)).toEqual([...SPIRIT_IDS]);
    for (const row of content.counters) expect(row.angels.length + row.armor.length).toBeGreaterThanOrEqual(1);
  });

  it('시간형 영 효과는 6000ms 이하 (봉인 예외), 특수 칸 시드 XOR = 0x5EEDC0DE', () => {
    for (const spirit of content.spirits) {
      if (balance.interference.timedLimitExempt.includes(spirit.id)) continue;
      expect(spirit.effect.durationMs).toBeLessThanOrEqual(balance.interference.maxTimedMs);
    }
    expect(spiritsById.get('prince_of_persia')?.effect.durationMs).toBe(21000);
    expect(balance.specials.seedXor).toBe(0x5eedc0de);
  });
});

describe('봉투·패턴 (D-30, api-gate §2.6)', () => {
  it('C→S·S→C 봉투 형식', () => {
    expect(JSON.parse(encodeClientMessage('ready'))).toEqual({ type: 'ready', data: {} });
    expect(JSON.parse(encodeServerMessage('queued', { mode: 'random' }))).toEqual({ type: 'queued', success: true, data: { mode: 'random' } });
  });

  it('에러 봉투는 정의된 사용자 문구만 싣고, 모르는 코드는 INTERNAL_ERROR로 바꾼다', () => {
    const cooldown = JSON.parse(encodeErrorMessage('COOLDOWN', 'skill', 8200));
    expect(cooldown).toEqual({ type: 'error', success: false, error: { code: 'COOLDOWN', message: ERRORS.COOLDOWN.message, ref: 'skill', retryAfterMs: 8200 } });
    expect(JSON.parse(encodeErrorMessage('SOMETHING_ELSE', 'clear')).error.code).toBe('INTERNAL_ERROR');
  });

  it('초대 코드 문자 집합 32종은 ROOM_CODE 패턴을 통과한다', () => {
    expect(ROOM_CODE_ALPHABET).toHaveLength(32);
    expect(PATTERNS.ROOM_CODE.test(ROOM_CODE_ALPHABET.slice(0, 6))).toBe(true);
    expect(PATTERNS.ROOM_CODE.test('K7PX0Q')).toBe(false);
  });
});
