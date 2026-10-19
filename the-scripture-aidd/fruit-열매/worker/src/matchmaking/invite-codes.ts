// TASK-034-1 · FR-019 · D-09 · TBL-005 · UC-004 — 친구 초대 코드 수명주기 (발급·재발급·입장 검증·닫기·만료 정리)
// 6자·문자 집합·유효 시간·재발급 횟수는 content/balance.json `invite`에서만 읽는다. SQL은 저장 계층(InviteCodeRepo 구현)에 있다.
import { balance } from '../content';
import { PATTERNS } from '../../../client/js/net/protocol.js';

export type InviteStatus = 'open' | 'full' | 'closed';
export interface InviteRow { code: string; roomId: string; hostId: string; status: InviteStatus; expiresAt: number }

/** 저장 포트 — store/do-sqlite-store.ts DoSqliteInviteRepo가 구현 (시각 = epoch ms) */
export interface InviteCodeRepo {
  insert(row: { code: string; roomId: string; hostId: string; createdAt: number; expiresAt: number }): boolean;
  find(code: string): InviteRow | null;
  setStatus(code: string, status: InviteStatus): void;
  closeByRoom(roomId: string): void;
  listExpiredOpen(now: number): InviteRow[];
  purge(now: number): void;
  nextExpiry(): number | null;
}

/** 암호학적 난수 [0, 1) — 코드 추측 방지 (Math.random 미사용) */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

// D-09 6자 코드 생성 (ABCDEFGHJKLMNPQRSTUVWXYZ23456789 — 0·O·1·I 제외)
export function generateInviteCode(rand: () => number = secureRandom): string {
  const { alphabet, length } = balance.invite;
  let code = '';
  for (let i = 0; i < length; i += 1) code += alphabet[Math.floor(rand() * alphabet.length) % alphabet.length];
  return code;
}

export type IssueResult = { ok: true; code: string; expiresAt: number } | { ok: false; code: 'CODE_EXHAUSTED' };

// FR-019 · API-102 코드 발급 — 충돌 시 재발급 최대 maxReissue회, 모두 충돌하면 CODE_EXHAUSTED
export function issueInviteCode(
  repo: InviteCodeRepo,
  req: { hostId: string; roomId: string; now: number; rand?: () => number },
): IssueResult {
  const expiresAt = req.now + balance.invite.ttlMs;
  for (let attempt = 0; attempt <= balance.invite.maxReissue; attempt += 1) {
    const code = generateInviteCode(req.rand);
    if (repo.insert({ code, roomId: req.roomId, hostId: req.hostId, createdAt: req.now, expiresAt })) return { ok: true, code, expiresAt };
  }
  return { ok: false, code: 'CODE_EXHAUSTED' };
}

export type RedeemResult =
  | { ok: true; code: string; roomId: string; hostId: string }
  | { ok: false; code: 'INVITE_NOT_FOUND' | 'ROOM_FULL' | 'OWN_INVITE' };

// FR-019 · API-101 invite 입장 검증 — 대문자 정규화 후 조회. 없음·닫힘·만료 → INVITE_NOT_FOUND, 방장 본인 → OWN_INVITE, 가득 참 → ROOM_FULL
// 성공하면 즉시 status = full (같은 코드 두 번째 입장 차단)
export function redeemInviteCode(repo: InviteCodeRepo, rawCode: string, guestId: string, now: number): RedeemResult {
  const code = rawCode.trim().toUpperCase();
  if (!PATTERNS.ROOM_CODE.test(code)) return { ok: false, code: 'INVITE_NOT_FOUND' };
  const row = repo.find(code);
  if (!row || row.status === 'closed' || row.expiresAt <= now) return { ok: false, code: 'INVITE_NOT_FOUND' };
  if (row.hostId === guestId) return { ok: false, code: 'OWN_INVITE' };
  if (row.status === 'full') return { ok: false, code: 'ROOM_FULL' };
  repo.setStatus(code, 'full');
  return { ok: true, code, roomId: row.roomId, hostId: row.hostId };
}

// FR-019 방 생성 실패 시 입장 취소 — full → open 복원
export function reopenInviteCode(repo: InviteCodeRepo, code: string): void {
  repo.setStatus(code, 'open');
}

// FR-019 · FR-020 방장 취소·이탈 — closed 후 즉시 정리 (UC-004 2a·E3, 봉인 제4계명)
export function closeInviteCode(repo: InviteCodeRepo, code: string, now: number): void {
  repo.setStatus(code, 'closed');
  repo.purge(now);
}

// FR-019 GameRoom 종료 통지(roomClosed) — 그 방의 코드 즉시 closed·정리
export function closeInviteCodesForRoom(repo: InviteCodeRepo, roomId: string, now: number): void {
  repo.closeByRoom(roomId);
  repo.purge(now);
}

// FR-019 만료 처리 — 만료된 열린 코드 목록(방장 통지용 API-154 expired)을 돌려주고 만료·closed 행을 삭제
export function expireInviteCodes(repo: InviteCodeRepo, now: number): InviteRow[] {
  const expired = repo.listExpiredOpen(now);
  repo.purge(now);
  return expired;
}
