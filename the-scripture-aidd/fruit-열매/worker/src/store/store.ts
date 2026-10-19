// TASK-005 · REQ-014 · REQ-015 · REQ-016 · FR-067 · FR-068 · FR-069 · FR-071 · FR-072 · D-05 · data-ark §1.3
// 단일 책임: 저장소 어댑터 2종(DoSqliteStore·SupabaseStore)이 함께 구현하는 `Store` 인터페이스와 저장 도메인 타입 정의.
// 구현은 베냐민 지파(worker/src/store/*), 호출은 베냐민(HTTP·Matchmaker·results)과 에브라임(GameRoom) 지파.

export type HeroId = 'david' | 'solomon' | 'peter' | 'paul';
export type BotLevel = 'easy' | 'normal' | 'hard';
/** matches.mode — 연습(practice)은 경기 결과가 아니므로 저장 모드에 없다 (TBL-002) */
export type MatchMode = 'random' | 'invite' | 'bot';
export type EndReason = 'topout' | 'disconnect';
export type Slot = 1 | 2;

/** TBL-001 profiles (token_hash는 저장소 내부 전용 — 반환 타입에 싣지 않는다, 봉인 제1·3계명) */
export interface Profile {
  id: string;
  nickname: string;
  rating: number;
  createdAt: string;
  lastSeenAt: string;
}

/** TBL-003 last_record / API-262 record — 개인 기록 (연습은 playTimeMs 포함) */
export interface PersonalRecord {
  maxCombo: number;
  attackPerMin: number;
  quizAccuracy: number;
  mode: MatchMode | 'practice';
  playTimeMs?: number;
}

/** TBL-003 player_progress */
export interface Progress {
  guestId: string;
  roundsPlayed: number;
  lossStreak: number;
  lastRecord: PersonalRecord | null;
}

/** getPlayers 결과 1행 — 매칭(레이팅)·라운드 시작(해금 단계·은혜) 입력 */
export interface PlayerSnapshot {
  profile: Profile;
  progress: Progress;
}

/** TBL-002 stats.p1/p2 */
export interface SlotStats {
  maxCombo: number;
  linesCleared: number;
  tetrises: number;
  attackSent: number;
  attackPerMin: number;
  quizCorrect: number;
  quizAnswered: number;
  skillsUsed: number;
  angelsUsed: number;
  armorUsed: number;
  jesusEvent: boolean;
}

/** TBL-002 stats */
export interface MatchStats {
  p1: SlotStats;
  p2: SlotStats;
  rounds: Array<{ round: number; winnerSlot: Slot; durationMs: number }>;
  quizCount: number;
  verseRef: string;
}

/** 사람 플레이어 1명의 진행 기록 갱신분 (data-ark §7.3 4단계) */
export interface ProgressUpdate {
  guestId: string;
  roundsDelta: number;
  lossStreak: number;
  record: PersonalRecord;
}

/** recordMatch 입력 — 레이팅 계산(elo.ts)은 호출 전에 끝나 있다 (data-ark §7.3 1단계 기대 레이팅 비교) */
export interface RecordMatchInput {
  matchId: string;
  roomId: string;
  mode: MatchMode;
  player1Id: string;
  player2Id: string | null;
  botLevel: BotLevel | null;
  hero1: HeroId;
  hero2: HeroId;
  winnerSlot: Slot;
  rounds1: number;
  rounds2: number;
  endReason: EndReason;
  durationMs: number;
  stats: MatchStats;
  /** 사람 대 사람만 값, 봇 경기는 null (OQ #5) */
  rating: null | {
    /** 계산에 쓴 현재 레이팅 (data-ark §7.3 p.expectedRating1·2 — 다르면 StoreError('RATING_CHANGED')) */
    expectedRating1: number;
    expectedRating2: number;
    newRating1: number;
    newRating2: number;
  };
  progress: ProgressUpdate[];
  achievements: Array<{ guestId: string; achievementId: string }>;
}

/** recordMatch 결과 — 실제로 새로 삽입된 업적과 갱신 전 직전 기록(성장 수치용) */
export interface RecordMatchResult {
  ratingDelta1: number | null;
  ratingDelta2: number | null;
  newAchievements: Array<{ guestId: string; achievementId: string }>;
  previousRecords: Record<string, PersonalRecord | null>;
}

/** recordPractice 입력 (연습은 matches 미기록 — TBL-003만) */
export interface RecordPracticeInput {
  guestId: string;
  roundsDelta: number;
  record: PersonalRecord;
}

/** API-003 data 1행 (내 관점으로 변환된 전적) */
export interface MatchListItem {
  matchId: string;
  mode: MatchMode;
  opponent: { nickname: string | null; isBot: boolean; botLevel: BotLevel | null };
  myHero: HeroId;
  opponentHero: HeroId;
  result: 'win' | 'loss';
  endReason: EndReason;
  rounds: [number, number];
  durationMs: number;
  ratingDelta: number | null;
  createdAt: string;
}

/** TBL-006 leaderboard 1행 (guestId는 서버 내부 isMe 계산용 — 응답에 싣지 않는다, api-gate §5.3) */
export interface LeaderboardRow {
  rank: number;
  guestId: string;
  nickname: string;
  rating: number;
}

/** 저장소 거부 사유 — 호출 측이 api-gate 에러 코드로 옮긴다 */
export type StoreErrorCode = 'NICKNAME_TAKEN' | 'RATING_CHANGED' | 'STORE_UNAVAILABLE';

export class StoreError extends Error {
  readonly code: StoreErrorCode;
  constructor(code: StoreErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'StoreError';
    this.code = code;
  }
}

/** FR-072 공통 저장 인터페이스 — 두 구현은 같은 의미론(원자적 경기 기록·같은 정렬)을 보장한다 (D-05) */
export interface Store {
  /** API-001: 프로필 + 진행 기록(0) 동시 생성. 닉네임 충돌은 StoreError('NICKNAME_TAKEN') */
  createProfile(input: { id: string; nickname: string; nicknameKey: string; tokenHash: string }): Promise<Profile>;
  /** API-002~006 토큰 검증 */
  getProfileByTokenHash(tokenHash: string): Promise<Profile | null>;
  /** API-002: last_seen_at 갱신 */
  touchProfile(guestId: string): Promise<void>;
  /** 매칭·라운드 시작 입력 (없는 ID는 결과에서 빠진다) */
  getPlayers(guestIds: string[]): Promise<PlayerSnapshot[]>;
  /** 경기 종료 1트랜잭션 (경기·레이팅·진행·업적 — D-20). 같은 roomId 재시도는 멱등 */
  recordMatch(input: RecordMatchInput): Promise<RecordMatchResult>;
  /** 연습 종료 — 진행 기록만, 갱신 전 직전 기록 반환 */
  recordPractice(input: RecordPracticeInput): Promise<{ previousRecord: PersonalRecord | null }>;
  /** API-003: 최신순 페이지 */
  listMatches(guestId: string, page: number, size: number): Promise<{ items: MatchListItem[]; totalCount: number }>;
  /** API-004: 상위 100 */
  getLeaderboard(): Promise<LeaderboardRow[]>;
  /** API-004: 내 순위 (100위 밖 포함) */
  getRank(guestId: string): Promise<{ rank: number; nickname: string; rating: number } | null>;
}
