// TASK-030-3 · FR-072 · C-004 · D-04 — 로컬 모드 Store 프록시: Worker·GameRoom → Matchmaker DO('global') RPC → DoSqliteStore
// RPC 경계를 넘으면 StoreError 클래스가 사라지므로 메시지(= 코드)로 StoreError를 복원한다 (devguide §3.6 DO RPC 규칙).
import { StoreError } from './store';
import type { StoreErrorCode, Store } from './store';
import type { Env, MatchmakerRpc } from '../env';

/** Matchmaker 싱글턴 이름 (D-04, devguide §7.6) */
export const MATCHMAKER_NAME = 'global';

const CODES: readonly StoreErrorCode[] = ['NICKNAME_TAKEN', 'RATING_CHANGED', 'STORE_UNAVAILABLE'];

/** RPC로 넘어온 오류 → StoreError (알 수 없는 오류는 STORE_UNAVAILABLE) */
export function toStoreError(err: unknown): StoreError {
  if (err instanceof StoreError) return err;
  const text = err instanceof Error ? `${(err as { code?: unknown }).code ?? ''} ${err.message}` : String(err);
  const code = CODES.find((c) => text.includes(c)) ?? 'STORE_UNAVAILABLE';
  return new StoreError(code);
}

// FR-072 Matchmaker RPC 프록시 Store
export class DoStoreClient implements Store {
  constructor(private readonly env: Pick<Env, 'MATCHMAKER'>) {}

  // DO 스텁은 만든 요청(I/O 컨텍스트)에 묶인다 — isolate 캐시(selectStore)된 이 객체가 스텁을 요청 간에 재사용하면
  // "다른 요청의 I/O" 오류로 한 번 걸러 503이 난다 (여호수아 통합 스모크에서 발견). 호출마다 새 스텁을 얻는다 (get은 네트워크 없음).
  private stub(): MatchmakerRpc {
    const ns = this.env.MATCHMAKER;
    return ns.get(ns.idFromName(MATCHMAKER_NAME)) as unknown as MatchmakerRpc;
  }

  private async call<T>(fn: (rpc: MatchmakerRpc) => Promise<T>): Promise<T> {
    try {
      return await fn(this.stub());
    } catch (err) {
      throw toStoreError(err);
    }
  }

  createProfile(input: Parameters<Store['createProfile']>[0]) { return this.call((r) => r.createProfile(input)); }
  getProfileByTokenHash(tokenHash: string) { return this.call((r) => r.getProfileByTokenHash(tokenHash)); }
  touchProfile(guestId: string) { return this.call((r) => r.touchProfile(guestId)); }
  getPlayers(guestIds: string[]) { return this.call((r) => r.getPlayers(guestIds)); }
  recordMatch(input: Parameters<Store['recordMatch']>[0]) { return this.call((r) => r.recordMatch(input)); }
  recordPractice(input: Parameters<Store['recordPractice']>[0]) { return this.call((r) => r.recordPractice(input)); }
  listMatches(guestId: string, page: number, size: number) { return this.call((r) => r.listMatches(guestId, page, size)); }
  getLeaderboard() { return this.call((r) => r.getLeaderboard()); }
  getRank(guestId: string) { return this.call((r) => r.getRank(guestId)); }
}
