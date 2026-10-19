// TASK-021-3 · FR-035 · FR-028 · REQ-008 · R-10 · OQ #4 — 천사 5종 소환 판정 (봉인·연습 모드 거부·게이지·쿨다운) 과 서버 측 효과.
// 단일 책임: 천사 소환 가능 여부 → 차감 → 서버 장부 효과(미가엘 상쇄 장전·그룹 대기 쓰레기 감소·스랍 저주 해제·섬기는 영들) → effect 데이터.
import { CELL } from '../../../client/js/net/protocol.js';
import { balance, findSkill, type AngelDef } from '../content';
import { checkSpend, spendFaith } from './faith';
import { clearCategories, clearSpirits, sealedRemainingMs, type ActiveEffect } from './interference';
import type { EffectData, PlayerState } from './room-state';

export type AngelResult =
  | { ok: true; effect: EffectData; ended: ActiveEffect[]; offsetRows: number }
  | { ok: false; code: 'INVALID_SKILL' | 'FAITH_INSUFFICIENT' | 'NOT_ALLOWED_IN_MODE' }
  | { ok: false; code: 'COOLDOWN' | 'ANGEL_SEALED'; retryAfterMs: number };

const ANGEL_KIND = 'angel';

// FR-035 skillId(angel_*) → 천사 정의
export function resolveAngel(skillId: string): AngelDef | null {
  const found = findSkill(skillId);
  return found && found.kind === ANGEL_KIND ? found.angel : null;
}

// FR-035·OQ #4 연습 모드는 위인 스킬만 (balance.faith.practiceAllows)
export function angelsAllowed(practice: boolean): boolean {
  return !practice || balance.faith.practiceAllows.includes(ANGEL_KIND);
}

/** 서버 장부에 미치는 효과 (클라이언트 전용 효과 — 가브리엘 — 는 effect 지시만) */
function applyServerSide(user: PlayerState, angel: AngelDef, now: number): { ended: ActiveEffect[]; offsetRows: number } {
  const action = angel.action;
  switch (action.type) {
    case 'negateSpirits': {
      // FR-035 미가엘: 진행 중인 대상 영 해제 + 다음 1회 상쇄 장전 (api-gate API-205 "대기·다음 1회")
      const ids = (action.spiritIds as string[]) ?? [];
      user.armor.wards.michael += Number(action.charges ?? 0);
      return { ended: clearSpirits(user.interference, ids, now), offsetRows: 0 };
    }
    case 'burnIncoming': {
      // FR-035 그룹: 서버가 내 대기 쓰레기를 rows만큼 감소 (offset)
      const rows = Math.min(user.pendingGarbage, Number(action.rows ?? 0));
      user.pendingGarbage -= rows;
      return { ended: [], offsetRows: rows };
    }
    case 'cleanseCurses':
      return { ended: clearCategories(user.interference, (action.categories as string[]) ?? [], now), offsetRows: 0 };
    case 'removeGarbageRow': {
      // FR-035 섬기는 영들: 보드 맨 아래 쓰레기 줄 1줄 (보드에 없으면 대기 큐 1줄 — architecture §11 #11, 보드는 클라이언트 보고값 R-15)
      const onBoard = user.lastBoard !== null && user.lastBoard.includes(CELL.GARBAGE);
      if (onBoard) return { ended: [], offsetRows: 0 };
      const rows = Math.min(user.pendingGarbage, Number(action.rows ?? 0));
      user.pendingGarbage -= rows;
      return { ended: [], offsetRows: rows };
    }
    default:
      return { ended: [], offsetRows: 0 };
  }
}

// FR-035·FR-028 천사 소환 (검증 실패 시 상태 불변): 모드 → 봉인 → 쿨다운 → 게이지
export function performAngel(user: PlayerState, skillId: string, practice: boolean, now: number): AngelResult {
  const angel = resolveAngel(skillId);
  if (!angel) return { ok: false, code: 'INVALID_SKILL' };
  if (!angelsAllowed(practice)) return { ok: false, code: 'NOT_ALLOWED_IN_MODE' };
  const sealedMs = sealedRemainingMs(user.interference, now);
  if (sealedMs > 0) return { ok: false, code: 'ANGEL_SEALED', retryAfterMs: sealedMs };
  const check = checkSpend(user.faith, skillId, angel.cost, now);
  if (!check.ok) return check;
  spendFaith(user.faith, skillId, angel.cost, angel.cooldownMs, now);
  const { ended, offsetRows } = applyServerSide(user, angel, now);
  const durationMs = typeof angel.action.durationMs === 'number' ? angel.action.durationMs : 0;
  return {
    ok: true, ended, offsetRows,
    effect: { kind: ANGEL_KIND, id: angel.id, bySlot: user.slot, targetSlot: user.slot, action: { ...angel.action }, verseRef: angel.verseRef, durationMs },
  };
}
