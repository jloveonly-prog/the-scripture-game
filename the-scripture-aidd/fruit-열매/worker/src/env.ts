// TASK-003 · REQ-016 · FR-072 · NFR-004 · D-02 · D-04 · D-08 · ARCH-019·021
// 단일 책임: Worker 환경 바인딩(Env) 타입과 Durable Object 간 RPC 계약 타입 정의 (런타임 코드 없음).
// 구현: Matchmaker = 베냐민 지파(worker/src/matchmaker.ts), GameRoom = 에브라임 지파(worker/src/game-room.ts).
import type { BotLevel, HeroId, Store } from './store/store';

/** wrangler.toml 바인딩 + `.dev.vars`(git 제외) 비밀. 비밀은 이 Env로만 읽는다 (봉인 제2계명). */
export interface Env {
  /** Matchmaker DO — 싱글턴 이름 "global" (D-04) */
  MATCHMAKER: DurableObjectNamespace;
  /** GameRoom DO — idFromName(roomId) (D-02) */
  GAME_ROOM: DurableObjectNamespace;
  /** WebSocket Origin 허용 목록, 쉼표 구분 (api-gate API-005) */
  ALLOWED_ORIGINS: string;
  /** 두 값이 모두 비어 있지 않을 때만 Supabase 모드 (FR-072) */
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export type RoomMode = 'random' | 'invite' | 'bot' | 'practice';

/** Matchmaker가 예약한 방 명단 1명 (R-13: GameRoom은 이 명단과 일치하는 join만 수락) */
export interface RosterEntry {
  slot: 1 | 2;
  /** 봇은 null */
  guestId: string | null;
  /** 봇은 null */
  nickname: string | null;
  heroId: HeroId;
  isBot: boolean;
  botLevel: BotLevel | null;
  /** 경기 시작 시 레이팅 (봇은 null) */
  rating: number | null;
  /** 경기 시작 시 TBL-003 값 — 라운드별 해금 단계·은혜 계산의 출발점 (D-22) */
  roundsPlayed: number;
  lossStreak: number;
}

/** Matchmaker → GameRoom `init` RPC 입력 (api-gate API-153: matched 직전에 완료) */
export interface RoomInit {
  roomId: string;
  mode: RoomMode;
  botLevel: BotLevel | null;
  roster: RosterEntry[];
  /** 서버 epoch ms */
  createdAt: number;
}

/** GameRoom DO가 공개하는 RPC (호출: 베냐민 matchmaking/room-factory.ts) */
export interface GameRoomRpc {
  init(init: RoomInit): Promise<void>;
}

/** Matchmaker DO가 공개하는 RPC — 로컬 모드 저장소(DoSqliteStore 위임, D-04) + 방 종료 통지 */
export interface MatchmakerRpc extends Store {
  /** GameRoom 종료 시 그 방의 초대 코드를 즉시 무효화한다 (TBL-005 idx_invite_codes_room_id) */
  roomClosed(roomId: string): Promise<void>;
}
