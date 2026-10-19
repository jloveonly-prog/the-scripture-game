// ranking-service.ts — 랭킹 상위 100 캐시·무효화·내 순위만
// TASK-020-2 | REQ-015 FR-071 | ARCH-014 | API-004 | TBL-006 TBL-018 `ledger` | data-ark §5 (메모리 5초 TTL 캐시, 경기 기록 시
// 무효화)
// 봉인 제1계명: 응답에 guestId를 넣지 않는다 (isMe 판정에만 쓴다).
import type { Rules } from "../content";
import type { LeaderboardRow, StorageAdapter } from "../storage/adapter";

export interface LeaderboardView {
  top: Array<{ rank: number; nickname: string; rating: number; isMe: boolean }>;
  /** 내 순위 (UC-019 3a 100위 밖이어도 표시) — 프로필이 없으면 null */
  me: { rank: number; nickname: string; rating: number } | null;
}

export class RankingService {
  private cached: { rows: LeaderboardRow[]; at: number } | null = null;

  /** @param now epoch ms 시계 (DO에서는 Date.now — 테스트 주입 가능) */
  constructor(private readonly storage: StorageAdapter, private readonly rules: Rules,
    private readonly now: () => number) {}

  /** API-004: 상위 rules.ledger.leaderboardTop명(캐시 leaderboardCacheMs) + 내 순위. 저장소 실패는 StorageError로 던진다 (호출자 → 503) */
  async getLeaderboard(guestId: string): Promise<LeaderboardView> {
    const rows = await this.topRows();
    const me = await this.storage.getRank(guestId);
    return {
      top: rows.map((r) => ({ rank: r.rank, nickname: r.nickname, rating: r.rating, isMe: r.guestId === guestId })),
      me: me ? { rank: me.rank, nickname: me.nickname, rating: me.rating } : null,
    };
  }

  /** 경기 기록으로 레이팅이 바뀌면 캐시 무효화 (data-ark §5) */
  invalidate(): void {
    this.cached = null;
  }

  private async topRows(): Promise<LeaderboardRow[]> {
    const now = this.now();
    if (this.cached && now - this.cached.at < this.rules.ledger.leaderboardCacheMs) return this.cached.rows;
    const rows = await this.storage.getLeaderboardTop(this.rules.ledger.leaderboardTop);
    this.cached = { rows, at: now };
    return rows;
  }
}
