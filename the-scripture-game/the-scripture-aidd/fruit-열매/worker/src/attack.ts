// attack.ts — 공격력·악한 영 등급·소환 후보 계산 순수 함수만
// TASK-012 | REQ-007 FR-024 FR-026 FR-045 NFR-002 | ARCH-012 | TBL-013 TBL-018 `attack`·`spiritTier` | OQ #9 #10
// 사람의 `clear`와 봇의 줄 삭제가 같은 함수를 탄다 (architecture §9.4). 무작위(후보 중 1개)는 호출자가 주입한다.
import type { Rules, Spirit } from "./content";

/** API-013 `clear` 판정 입력 (검증 통과 후) */
export interface AttackInput {
  lines: number;
  /** 0 = 첫 삭제 (API-013) */
  combo: number;
  b2b: boolean;
  tspin: boolean;
  /** 검증된 여리고 나팔 칸 수 (FR-045 공격력 +1씩) */
  jericho: number;
  /** 이번 삭제를 포함한 연속 B2B 테트리스 횟수 (OQ #9 — player-state가 센다) */
  b2bTetrisStreak: number;
}

export interface AttackResult {
  /** 상쇄 전 공격력 (FR-024) */
  attackPower: number;
  /** 악한 영 등급 (CODE-006, 보스 = 6). 공격 없음·1줄(T-Spin 아님)이면 null */
  tier: number | null;
  /** 소환 후보 id (spirits.json) */
  candidates: string[];
  /** 서버 결정 악한 영 (FR-026) */
  spiritId: string | null;
}

/** FR-026 "등급 상승" 한 단계 */
const TIER_STEP = 1;

/**
 * FR-024 공격력: 2줄 1 · 3줄 2 · 4줄 4 (rules.attack.lines), T-Spin +tspinBonus, 콤보 +comboBonus(구간 최댓값),
 * B2B +b2bBonus, 여리고 +jerichoBonus×개수. 1줄(T-Spin 아님)은 줄 공격력 0 (OQ #10).
 */
export function computeAttackPower(input: AttackInput, rules: Rules): number {
  const a = rules.attack;
  const lineKey = String(input.lines) as keyof typeof a.lines;
  const jerichoBonus = a.jerichoBonus * Math.max(0, input.jericho);
  // OQ #10: 1줄 삭제는 공격·영 소환·상쇄 없음 — T-Spin 싱글만 예외 (spiritTier.byLines 주석)
  if (input.lines < 2 && !input.tspin) return jerichoBonus;
  let power = a.lines[lineKey] ?? 0;
  if (input.tspin) power += a.tspinBonus[String(input.lines) as keyof typeof a.tspinBonus] ?? 0;
  let comboBonus = 0;
  for (const step of a.comboBonus) if (input.combo >= step.from) comboBonus = Math.max(comboBonus, step.bonus);
  power += comboBonus;
  if (input.b2b) power += a.b2bBonus;
  return power + jerichoBonus;
}

/**
 * FR-026 악한 영 등급·후보:
 * - 연속 B2B 테트리스(bossConsecutiveB2BTetris회) → 보스(용) — 보스는 이 경우에만
 * - B2B 테트리스 → b2bTetrisTiers(4~5등급) 영 전부
 * - 4줄 → tetrisPool(공중 권세 잡은 자/아바돈), 콤보 tierUpComboFrom 이상이면 4등급 풀
 * - 1~3줄 → byLines 등급 + T-Spin(tierUpTspin)·콤보(tierUpComboFrom 이상) 상승, 최대 B2B 테트리스 등급까지
 */
export function spiritCandidates(input: AttackInput, rules: Rules,
  spirits: readonly Spirit[]): { tier: number | null; candidates: string[] } {
  const t = rules.spiritTier;
  const tierMax = Math.max(...t.b2bTetrisTiers);
  const ofTiers = (tiers: number[]) => spirits.filter((s) => tiers.includes(s.tier)).map((s) => s.id);
  const bossTier = Math.max(...spirits.map((s) => s.tier));
  if (input.lines === 4 && input.b2b && input.b2bTetrisStreak >= t.bossConsecutiveB2BTetris) {
    return { tier: bossTier, candidates: ofTiers([bossTier]) };
  }
  if (input.lines === 4 && input.b2b) return { tier: tierMax, candidates: ofTiers(t.b2bTetrisTiers) };
  if (input.lines === 4) {
    if (input.combo >= t.tierUpComboFrom) return { tier: t.b2bTetrisTiers[0],
      candidates: ofTiers([t.b2bTetrisTiers[0]]) };
    const pool = t.tetrisPool.filter((id) => spirits.some((s) => s.id === id));
    const tiers = pool.map((id) => spirits.find((s) => s.id === id)!.tier);
    return { tier: Math.max(...tiers), candidates: pool };
  }
  const base = t.byLines[String(input.lines) as keyof typeof t.byLines];
  if (base === undefined || (input.lines === 1 && !input.tspin)) return { tier: null, candidates: [] };
  let tier = base;
  if (input.tspin) tier += t.tierUpTspin;
  if (input.combo >= t.tierUpComboFrom) tier += TIER_STEP;
  tier = Math.min(tier, tierMax);
  return { tier, candidates: ofTiers([tier]) };
}

/**
 * 공격 판정 1회 (FR-024·FR-026). 용(보스)은 spirits.json `params.garbageMin` 이상 쓰레기 (FR-030 "쓰레기 줄 6").
 * @param random [0,1) — 후보 중 무작위 1개 (FR-026 "무작위")
 */
export function computeAttack(input: AttackInput, rules: Rules, spirits: readonly Spirit[],
  random: () => number): AttackResult {
  let attackPower = computeAttackPower(input, rules);
  if (attackPower <= 0) return { attackPower: 0, tier: null, candidates: [], spiritId: null };
  const { tier, candidates } = spiritCandidates(input, rules, spirits);
  // 여리고만으로 생긴 공격(1줄)은 쓰레기만 — 영 소환 없음 (OQ #10)
  if (tier === null || candidates.length === 0) return { attackPower, tier: null, candidates: [], spiritId: null };
  const spiritId = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  const garbageMin = Number(spirits.find((s) => s.id === spiritId)?.params.garbageMin ?? 0);
  attackPower = Math.max(attackPower, garbageMin);
  return { attackPower, tier, candidates, spiritId };
}
