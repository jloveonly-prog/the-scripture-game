// TASK-034-1 · FR-008 · FR-018 · FR-019 · FR-021 · FR-023 · R-13 · devguide §7.6 — GameRoom ID 발급·명단 예약·init RPC·matched 본문 구성
// 순서: roomId = crypto.randomUUID() → GAME_ROOM.idFromName(roomId).init(roomInit) 완료 → 그다음 matched 송신 (API-153).
import { HERO_IDS } from '../../../client/js/net/protocol.js';
import type { Env, GameRoomRpc, RoomInit, RoomMode, RosterEntry } from '../env';
import type { BotLevel, HeroId } from '../store/store';

/** 명단에 올릴 사람 1명 (토큰 검증 + getPlayers 결과) */
export interface Participant {
  guestId: string; nickname: string; heroId: HeroId; rating: number; roundsPlayed: number; lossStreak: number;
}

// FR-008 방 ID 발급 (UUID v4)
export function createRoomId(): string {
  return crypto.randomUUID();
}

// FR-021 봇 위인 무작위 배정 (4명 중 1명)
export function pickBotHero(rand: () => number): HeroId {
  return HERO_IDS[Math.floor(rand() * HERO_IDS.length) % HERO_IDS.length] as HeroId;
}

const humanEntry = (slot: 1 | 2, p: Participant): RosterEntry => ({
  slot, guestId: p.guestId, nickname: p.nickname, heroId: p.heroId, isBot: false, botLevel: null,
  rating: p.rating, roundsPlayed: p.roundsPlayed, lossStreak: p.lossStreak,
});

// R-13 예약 명단 — 사람은 인자 순서대로 슬롯 1·2, 봇 경기는 사람 슬롯 1 + 봇 슬롯 2, 연습은 1명 (TBL-002 player1 = 사람)
export function buildRoster(humans: Participant[], bot?: { heroId: HeroId; botLevel: BotLevel }): RosterEntry[] {
  const roster = humans.map((p, i) => humanEntry((i + 1) as 1 | 2, p));
  if (bot) {
    roster.push({
      slot: 2, guestId: null, nickname: null, heroId: bot.heroId, isBot: true, botLevel: bot.botLevel,
      rating: null, roundsPlayed: 0, lossStreak: 0,
    });
  }
  return roster;
}

// FR-008 · devguide §7.6 GameRoom 초기화 RPC — 완료되어야 matched를 보낼 수 있다 (실패는 Error로 재던짐)
export async function initRoom(env: Pick<Env, 'GAME_ROOM'>, init: RoomInit): Promise<void> {
  try {
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(init.roomId)) as unknown as GameRoomRpc;
    await stub.init(init);
  } catch {
    throw new Error('ROOM_INIT_FAILED'); // 내부 사유는 싣지 않는다 (봉인 제1계명)
  }
}

// FR-008 RoomInit 구성
export function buildRoomInit(roomId: string, mode: RoomMode, roster: RosterEntry[], botLevel: BotLevel | null, now: number): RoomInit {
  return { roomId, mode, botLevel, roster, createdAt: now };
}

// FR-008 · API-153 matched data (슬롯 시점) — 상대 정보는 닉네임·위인·봇 여부만 (api-gate §5.2)
export function matchedPayload(init: RoomInit, mySlot: 1 | 2): Record<string, unknown> {
  const opp = init.roster.find((r) => r.slot !== mySlot) ?? null;
  return {
    roomId: init.roomId,
    mode: init.mode,
    slot: mySlot,
    opponent: opp ? { nickname: opp.nickname, heroId: opp.heroId, isBot: opp.isBot, botLevel: opp.botLevel } : null,
  };
}
