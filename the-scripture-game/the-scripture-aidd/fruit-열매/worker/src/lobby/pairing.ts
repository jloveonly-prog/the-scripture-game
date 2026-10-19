// pairing.ts — 대기열 Elo 근접 짝짓기·초대 코드 발급/조회/만료·입장 티켓·방 설정(config) 조립만
// TASK-032 | REQ-004 REQ-005 REQ-006 FR-018 FR-019 FR-020 FR-021 FR-023 | ARCH-010 | API-009 API-010 | data-ark
// §8.1·§8.2
// D-19 | UC-003 UC-004 UC-005 UC-006 | devguide §2.2 L-02 (Matchmaker 셸에서 매칭 논리 분리 — cloudflare:workers 비의존)
import { heroes, type Rules } from "../content";
import type { MatchConfig, MatchModeAll, SlotConfig } from "../room/match-flow";
import type { BotLevel, HeroId, Slot } from "../storage/adapter";

/** data-ark §8.1 Matchmaker 소켓 첨부 (`ws.serializeAttachment`) — join 전이면 첨부 없음(null) */
export interface LobbyAttachment {
  guestId: string;
  nickname: string;
  rating: number;
  heroId: HeroId;
  mode: MatchModeAll;
  inviteCode: string | null;
  inviteRoomId: string | null;
  /** epoch ms (발급 + invite.ttlMs) */
  inviteExpiresAt: number | null;
  /** 대기 시작 epoch ms (동률 시 먼저 온 순) */
  queuedAt: number;
}

/** 방 배정에 필요한 사람 1명 (TBL-001 프로필 + TBL-004 진행 기록 — FR-047 해금·FR-062 은혜 원천) */
export interface Seat {
  guestId: string;
  nickname: string;
  rating: number;
  heroId: HeroId;
  roundsPlayed: number;
  consecutiveRoundLosses: number;
}

/** GameRoom `setup` RPC 입력 — data-ark §8.2 config (티켓은 SHA-256 hex만 — api-gate §5 방 입장 인가) */
export interface RoomSetup {
  config: MatchConfig;
  /** 슬롯별 티켓 해시 (봇 슬롯 없음) */
  ticketHashes: Partial<Record<Slot, string>>;
  createdAt: number;
}

/** API-010 `matched.opponent` */
export interface OpponentView {
  nickname: string | null;
  heroId: HeroId;
  rating: number | null;
  isBot: boolean;
  botLevel: BotLevel | null;
}

/** api-gate API-010 입장 티켓 24자 = 18바이트 base64url (validate.ts TICKET_PATTERN) */
const TICKET_BYTES = 18;

/**
 * FR-018 Elo 근접 짝짓기: 레이팅 차이가 가장 작은 대기자, 동률이면 먼저 온 순(queuedAt).
 * 대기자가 1명뿐이면 차이와 관계없이 그 사람 (UC-003 3a). 같은 게스트는 제외.
 * @returns 고른 대기자 (없으면 null)
 */
export function pickOpponent<T extends { att: LobbyAttachment }>(me: { guestId: string; rating: number },
  waiting: readonly T[]): T | null {
  let best: T | null = null;
  for (const w of waiting) {
    if (w.att.guestId === me.guestId) continue;
    if (!best) {
      best = w;
      continue;
    }
    const d = Math.abs(w.att.rating - me.rating);
    const bd = Math.abs(best.att.rating - me.rating);
    if (d < bd || (d === bd && w.att.queuedAt < best.att.queuedAt)) best = w;
  }
  return best;
}

/**
 * FR-019·D-19 초대 코드 발급: invite.length자, invite.alphabet(혼동 문자 제외 32자)에서 서버 무작위, 사용 중인 코드와 겹치지 않게.
 * @param random [0,1) 서버 무작위
 */
export function issueInviteCode(random: () => number, rules: Rules, taken: ReadonlySet<string>): string {
  const { alphabet, length } = rules.invite;
  for (;;) {
    let code = "";
    for (let i = 0; i < length; i += 1) {
      code += alphabet[Math.min(alphabet.length - 1, Math.floor(random() * alphabet.length))];
    }
    if (!taken.has(code)) return code;
  }
}

/** OQ #15 초대 코드 만료 (발급 + invite.ttlMs) */
export function inviteExpired(att: LobbyAttachment, now: number): boolean {
  return att.inviteExpiresAt !== null && now >= att.inviteExpiresAt;
}

/** api-gate §5 슬롯별 1회용 입장 티켓 (crypto.getRandomValues → base64url 24자) */
export function generateTicket(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TICKET_BYTES));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** FR-021 봇에게 위인 4명 중 1명 무작위 배정 */
export function randomBotHero(random: () => number): HeroId {
  return heroes[Math.min(heroes.length - 1, Math.floor(random() * heroes.length))].id;
}

function slotOf(slot: Slot, seat: Seat): SlotConfig {
  return { slot, guestId: seat.guestId, nickname: seat.nickname, heroId: seat.heroId, isBot: false,
    roundsPlayed: seat.roundsPlayed, consecutiveRoundLosses: seat.consecutiveRoundLosses };
}

/** 사람 대 사람 방 (FR-018 랜덤 / FR-019 초대) — a = 슬롯 1, b = 슬롯 2 */
export function versusSetup(roomId: string, mode: "random" | "invite", a: Seat, b: Seat,
  ticketHashes: [string, string], now: number): RoomSetup {
  return { config: { roomId, mode, botLevel: null, slots: [slotOf(1, a), slotOf(2, b)] },
    ticketHashes: { 1: ticketHashes[0], 2: ticketHashes[1] }, createdAt: now };
}

/** FR-021 봇 방 — 사람 슬롯 1, 봇 슬롯 2 (봇은 진행 기록 없음 — 해금은 사람 기준, OQ #12) */
export function botSetup(roomId: string, human: Seat, botLevel: BotLevel, botHero: HeroId, ticketHash: string,
  now: number): RoomSetup {
  const bot: SlotConfig = { slot: 2, guestId: null, nickname: null, heroId: botHero, isBot: true, roundsPlayed: 0,
    consecutiveRoundLosses: 0 };
  return { config: { roomId, mode: "bot", botLevel, slots: [slotOf(1, human), bot] }, ticketHashes: { 1: ticketHash },
    createdAt: now };
}

/** FR-023 연습 방 — 1인 (architecture §9.5) */
export function practiceSetup(roomId: string, human: Seat, ticketHash: string, now: number): RoomSetup {
  return { config: { roomId, mode: "practice", botLevel: null, slots: [slotOf(1, human)] },
    ticketHashes: { 1: ticketHash }, createdAt: now };
}

/** API-010 상대 표시 — 사람: 닉네임·위인·레이팅 / 봇: 닉네임 null·레이팅 null·난이도 */
export function humanView(seat: Seat): OpponentView {
  return { nickname: seat.nickname, heroId: seat.heroId, rating: seat.rating, isBot: false, botLevel: null };
}
export function botView(heroId: HeroId, botLevel: BotLevel): OpponentView {
  return { nickname: null, heroId, rating: null, isBot: true, botLevel };
}

/** API-010 `matched` 데이터 (protocol 1, 연습이면 opponent null) */
export function matchedData(protocol: number, roomId: string, ticket: string, slot: Slot, mode: MatchModeAll,
  opponent: OpponentView | null) {
  return { protocol, roomId, ticket, slot, mode, opponent };
}

/** API-009 `waiting` 데이터 — inviteExpiresAt은 ISO-8601 UTC (api-gate §2 시간 표기) */
export function waitingData(att: LobbyAttachment) {
  return {
    mode: att.mode,
    inviteCode: att.inviteCode,
    inviteExpiresAt: att.inviteExpiresAt === null ? null : new Date(att.inviteExpiresAt).toISOString(),
  };
}
