// progress-service.ts — 진행 기록 갱신·성장 수치·업적 판정·해금 단계·은혜 여부 계산만
// TASK-020-3 | REQ-012 REQ-013 FR-047 FR-062 FR-065 FR-066 FR-067 | ARCH-014 | TBL-004 TBL-005
// TBL-018 `specials.unlockRounds`·`grace`·`achievements` | architecture §9.5 §9.10 | OQ #1 #12 #14
import type { Rules } from "../content";
import { log } from "../log";
import {
  StorageError, type AchievementGrant, type AchievementId, type HeroId, type ProgressRow, type ProgressUpdate,
  type StorageAdapter,
} from "../storage/adapter";

/** API-019 `start.stage` */
export interface Stage {
  word: boolean;
  jericho: boolean;
  manna: boolean;
}

/** FR-066 개인 기록 (경기 단위 — architecture §9.10) */
export interface PersonalRecord {
  maxCombo: number;
  attackPerMin: number;
  quizRate: number | null;
}

/** FR-066 직전 대전 경기 대비 성장 수치 (필드별 비교 불가면 null) */
export interface Growth {
  maxCombo: number | null;
  attackPerMin: number | null;
  quizRate: number | null;
}

/**
 * FR-047 단계적 해금 (OQ #12): 이번 판 번호 = 끝낸 라운드 누적 + 1. 판 번호 ≥ unlockRounds[종류]이면 열림
 * (1~3판 없음, 4판째 말씀, 5판째 여리고·만나).
 */
export function unlockStage(roundsPlayed: number, rules: Rules): Stage {
  const roundNo = roundsPlayed + 1;
  const u = rules.specials.unlockRounds;
  return { word: roundNo >= u.word, jericho: roundNo >= u.jericho, manna: roundNo >= u.manna };
}

/** OQ #12 대전에서 두 플레이어 단계가 다르면 낮은 쪽 (같은 시드 공정성) — 끝낸 라운드 수가 적은 쪽 */
export function stageForPlayers(roundsPlayedList: readonly number[], rules: Rules): Stage {
  return unlockStage(Math.min(...roundsPlayedList), rules);
}

/** FR-062 은혜: 연속으로 진 대전 라운드 ≥ grace.lossStreakRounds */
export function isGrace(consecutiveRoundLosses: number, rules: Rules): boolean {
  return consecutiveRoundLosses >= rules.grace.lossStreakRounds;
}

/** FR-066 개인 기록 계산 — 분당 공격 = 보낸 쓰레기 줄 / 경기 분, 퀴즈 정답률 = 정답 / 참여 (참여 0이면 null — TBL-004) */
export function personalRecord(
  stats: { maxCombo: number; attackSent: number; quizCorrect: number; quizAnswered: number }, durationMs: number,
): PersonalRecord {
  const minutes = durationMs / 60000;
  return {
    maxCombo: stats.maxCombo,
    attackPerMin: minutes > 0 ? stats.attackSent / minutes : 0,
    quizRate: stats.quizAnswered > 0 ? stats.quizCorrect / stats.quizAnswered : null,
  };
}

/** FR-066 성장 수치 — 직전 대전 경기 기록이 없으면(첫 경기) null (architecture §9.10) */
export function growthFrom(prev: ProgressRow | null, record: PersonalRecord): Growth | null {
  if (!prev || prev.lastMaxCombo === null) return null;
  const diff = (now: number | null, before: number | null) => (now === null || before === null ? null : now - before);
  return {
    maxCombo: diff(record.maxCombo, prev.lastMaxCombo),
    attackPerMin: diff(record.attackPerMin, prev.lastAttackPerMin),
    quizRate: diff(record.quizRate, prev.lastQuizRate),
  };
}

/**
 * FR-067 대전 경기 후 진행 기록 (TBL-004): 판 수 += 이번 경기 라운드 수, 연속 패배 = 라운드 결과 순서대로(승 → 0, 패 → +1),
 * last_* = 이번 경기 기록.
 */
export function progressAfterMatch(guestId: string, prev: ProgressRow | null,
  roundResults: readonly ("win" | "loss")[], record: PersonalRecord): ProgressUpdate {
  let losses = prev?.consecutiveRoundLosses ?? 0;
  for (const r of roundResults) losses = r === "win" ? 0 : losses + 1;
  return {
    guestId,
    roundsPlayed: (prev?.roundsPlayed ?? 0) + roundResults.length,
    consecutiveRoundLosses: losses,
    lastMaxCombo: record.maxCombo,
    lastAttackPerMin: record.attackPerMin,
    lastQuizRate: record.quizRate,
  };
}

/** FR-067 연습 세션 = 1판, 연속 패배 변화 없음, 직전 대전 기록 덮어쓰지 않음 (TBL-004, architecture §9.10) */
export function progressAfterPractice(guestId: string, prev: ProgressRow | null): ProgressUpdate {
  return {
    guestId,
    roundsPlayed: (prev?.roundsPlayed ?? 0) + 1,
    consecutiveRoundLosses: prev?.consecutiveRoundLosses ?? 0,
    lastMaxCombo: prev?.lastMaxCombo ?? null,
    lastAttackPerMin: prev?.lastAttackPerMin ?? null,
    lastQuizRate: prev?.lastQuizRate ?? null,
  };
}

/** FR-065 업적 판정 (OQ #14 정의된 1종 — 한 경기(매치 또는 연습 세션) 다윗으로 테트리스 tetrisInMatch회) */
export function earnedAchievements(heroId: HeroId, tetrisCount: number, rules: Rules): AchievementId[] {
  const g = rules.achievements.goliath_hunter;
  return heroId === g.heroId && tetrisCount >= g.tetrisInMatch ? ["goliath_hunter"] : [];
}

/** 연습 세션 기록 요청 (GameRoom → Matchmaker RPC recordPractice — architecture §9.5) */
export interface PracticeReport {
  guestId: string;
  heroId: HeroId;
  tetrisCount: number;
}

export interface PracticeOutcome {
  saved: boolean;
  achievements: AchievementId[];
}

/** 원장 진행 기록 서비스 */
export class ProgressService {
  constructor(private readonly storage: StorageAdapter, private readonly rules: Rules) {}

  /** 방 배정 시 진행 기록 1건 (FR-047·FR-062 — 없으면 0판으로 본다) */
  async getProgress(guestId: string): Promise<ProgressRow | null> {
    return this.storage.getProgress(guestId);
  }

  /** FR-067 연습 세션 종료 기록 (UC-006 E2 실패 → saved false, 예외를 던지지 않는다) */
  async recordPractice(report: PracticeReport): Promise<PracticeOutcome> {
    try {
      const prev = await this.storage.getProgress(report.guestId);
      const achievements: AchievementGrant[] = earnedAchievements(report.heroId, report.tetrisCount, this.rules)
        .map((achievementId) => ({ guestId: report.guestId, achievementId }));
      const result = await this.storage.recordPractice({ progress: progressAfterPractice(report.guestId, prev),
        achievements });
      return { saved: true, achievements: result.newAchievements.map((a) => a.achievementId) };
    } catch (err) {
      log.event("storage_fail", { gid: report.guestId, code: err instanceof StorageError
        ? err.code : "INTERNAL_ERROR" });
      return { saved: false, achievements: [] };
    }
  }
}
