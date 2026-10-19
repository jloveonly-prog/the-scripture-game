// adapter.ts — StorageAdapter 인터페이스·행 타입(ISO-8601 UTC 문자열 반환 규약) 정의만
// TASK-003 | REQ-014 REQ-015 REQ-016 FR-012 FR-067~FR-072 NFR-008 | TBL-001~TBL-006 | data-ark §1·§5·§6.2 | ARCH-014 | D-05
//
// 규약 (architecture D-05, devguide §3.1):
//  - 두 구현(DO SQLite / Supabase)은 같은 입력에 같은 결과·정렬을 돌려준다.
//  - 시간은 모두 ISO-8601 UTC 밀리초 문자열(`2026-10-19T14:30:00.000Z`)로 반환한다.
//  - 원장 컬럼은 snake_case, 이 인터페이스의 필드는 camelCase — 변환은 어댑터 경계에서만.
//  - 저장소 연결·쿼리 실패는 StorageError(STORAGE_UNAVAILABLE)로 던진다. 업무 결과(닉네임 중복)는 값으로 돌려준다.
//  - 토큰 원문·토큰 해시는 어떤 반환 행에도 담지 않는다 (봉인 제1계명). 이메일·실명·IP 필드 없음 (NFR-008).

/** CODE-003 위인 */
export type HeroId = "david" | "solomon" | "peter" | "paul";
/** CODE-001 경기 모드 (원장 저장 대상 — practice 제외) */
export type MatchMode = "random" | "invite" | "bot";
/** CODE-002 봇 난이도 */
export type BotLevel = "easy" | "normal" | "hard";
/** CODE-004 경기 종료 사유 */
export type EndReason = "topout" | "disconnect";
/** CODE-005 업적 */
export type AchievementId = "goliath_hunter";
/** 슬롯 번호 1 | 2 */
export type Slot = 1 | 2;

/** TBL-001 profiles 행 (token_hash 제외) */
export interface ProfileRow {
  guestId: string;
  nickname: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

/** TBL-004 player_progress 행 */
export interface ProgressRow {
  guestId: string;
  roundsPlayed: number;
  consecutiveRoundLosses: number;
  lastMaxCombo: number | null;
  lastAttackPerMin: number | null;
  lastQuizRate: number | null;
  updatedAt: string;
}

/** FR-012 게스트 생성 입력 — guestId·tokenHash는 서비스가 만든다 (crypto.randomUUID, SHA-256 hex) */
export interface NewGuest {
  guestId: string;
  nickname: string;
  tokenHash: string;
}

/** 게스트 생성 결과 — 닉네임 중복(UNIQUE NOCASE 위반)은 예외가 아닌 값 (data-ark §5 "NICKNAME_TAKEN으로 변환") */
export type CreateGuestResult = { ok: true; profile: ProfileRow } | { ok: false; code: "NICKNAME_TAKEN" };

/** TBL-003 match_players 1행 입력 */
export interface MatchPlayerInput {
  slot: Slot;
  /** 봇이면 null */
  guestId: string | null;
  isBot: boolean;
  heroId: HeroId;
  roundsWon: number;
  /** 사람 대 사람일 때만 (봇·연습 null — OQ #5) */
  ratingBefore: number | null;
  ratingAfter: number | null;
  maxCombo: number;
  linesCleared: number;
  attackSent: number;
  tetrisCount: number;
  piecesPlaced: number;
  quizCorrect: number;
  quizAnswered: number;
}

/** TBL-004 진행 기록 갱신값 — 서비스가 계산한 절대값을 그대로 저장 (FR-067) */
export interface ProgressUpdate {
  guestId: string;
  roundsPlayed: number;
  consecutiveRoundLosses: number;
  lastMaxCombo: number | null;
  lastAttackPerMin: number | null;
  lastQuizRate: number | null;
}

/** TBL-005 업적 1건 */
export interface AchievementGrant {
  guestId: string;
  achievementId: AchievementId;
}

/** FR-068 경기 1건 기록 입력 — 트랜잭션 1회: matches 1 + match_players 2 + profiles 레이팅 ≤2 + player_progress ≤2 + achievements ≤2 (data-ark §5) */
export interface MatchRecordInput {
  /** GameRoom roomId (UUID) */
  matchId: string;
  mode: MatchMode;
  botLevel: BotLevel | null;
  winnerSlot: Slot;
  endReason: EndReason;
  roundsPlayed: number;
  durationMs: number;
  /** FR-063 말씀 카드 대표 구절 (verses.json ref — 서비스가 존재 검증) */
  verseRef: string;
  players: readonly [MatchPlayerInput, MatchPlayerInput];
  progress: readonly ProgressUpdate[];
  achievements: readonly AchievementGrant[];
}

/** 경기 기록 결과 — 이번에 처음 달성한 업적만 돌려준다 (중복 달성 행 없음 — TBL-005) */
export interface MatchRecordResult {
  createdAt: string;
  newAchievements: AchievementGrant[];
}

/** 연습 세션 종료 기록 입력 (architecture §9.5 — matches에는 저장하지 않음) */
export interface PracticeRecordInput {
  progress: ProgressUpdate;
  achievements: readonly AchievementGrant[];
}

/** 연습 기록 결과 */
export interface PracticeRecordResult {
  newAchievements: AchievementGrant[];
}

/** FR-069 전적 1행 — 요청자 시점(me / opponent)으로 조립된 원장 값 */
export interface MatchHistoryRow {
  matchId: string;
  mode: MatchMode;
  botLevel: BotLevel | null;
  winnerSlot: Slot;
  endReason: EndReason;
  durationMs: number;
  playedAt: string;
  me: { slot: Slot; heroId: HeroId; roundsWon: number; ratingBefore: number | null; ratingAfter: number | null };
  opponent: { nickname: string | null; isBot: boolean; heroId: HeroId; roundsWon: number };
}

/** FR-069 전적 키셋 페이지 조건 (api-gate §2 페이징) */
export interface MatchHistoryQuery {
  limit: number;
  /** ISO-8601 UTC — 이 시각보다 이전 기록만 (없으면 최신부터) */
  before: string | null;
}

/** TBL-006 leaderboard 행 — guestId는 내 행 판정용, API 응답에는 노출하지 않는다 (봉인 제1계명) */
export interface LeaderboardRow {
  guestId: string;
  nickname: string;
  rating: number;
  rank: number;
}

/** 원장 저장소 불가 — 서비스가 STORAGE_UNAVAILABLE(503)로 변환 (api-gate §4.1, UC-021 E2) */
export class StorageError extends Error {
  readonly code = "STORAGE_UNAVAILABLE" as const;
  constructor(operation: string, cause?: unknown) {
    super(`storage ${operation} failed${cause instanceof Error ? `: ${cause.message}` : ""}`);
    this.name = "StorageError";
  }
}

/** ARCH-014 원장 접근의 유일한 통로 — 호출자는 Matchmaker 안의 services/ 모듈뿐 (data-ark §1) */
export interface StorageAdapter {
  /** 어댑터 종류 (로그·진단용) */
  readonly kind: "sqlite" | "supabase";
  /** FR-012 닉네임 사전 중복 조회 (대소문자 무시, trim된 값으로 호출) */
  nicknameExists(nickname: string): Promise<boolean>;
  /** FR-012 프로필 + 진행 기록을 한 트랜잭션에서 생성 (API-001) */
  createGuest(guest: NewGuest): Promise<CreateGuestResult>;
  /** NFR-003 토큰 검증 — SHA-256 hex로 프로필 조회 (API-002, 모든 인증) */
  findProfileByTokenHash(tokenHash: string): Promise<ProfileRow | null>;
  /** FR-047·FR-062 방 배정 시 진행 기록 1건 */
  getProgress(guestId: string): Promise<ProgressRow | null>;
  /** FR-068 경기 1건 원자 기록 (GameRoom → Matchmaker RPC recordMatch) */
  recordMatch(input: MatchRecordInput): Promise<MatchRecordResult>;
  /** FR-067 연습 세션 진행 기록 (RPC recordPractice) */
  recordPractice(input: PracticeRecordInput): Promise<PracticeRecordResult>;
  /** FR-069 내 전적 최신순 키셋 페이지 */
  listMatches(guestId: string, query: MatchHistoryQuery): Promise<MatchHistoryRow[]>;
  /** FR-071 랭킹 상위 N (ORDER BY rank, created_at) */
  getLeaderboardTop(limit: number): Promise<LeaderboardRow[]>;
  /** FR-071 내 순위 (뷰 RANK와 같은 값 — COUNT(rating > 내 rating) + 1) */
  getRank(guestId: string): Promise<LeaderboardRow | null>;
}
