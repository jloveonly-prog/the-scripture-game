// guest-service.ts — 게스트 생성·토큰 해시·토큰 검증(LRU 캐시)만
// TASK-020-1 | REQ-002 FR-012 NFR-003 NFR-008 | ARCH-014 | API-001 API-002 | TBL-001 TBL-004 TBL-018
// `nickname`·`ledger` | D-06
// 봉인 제1계명: 토큰 원문은 응답으로 1회만, 로그에는 guestId 앞 8자만 (log.ts). 제3계명: 원장에는 SHA-256 hex만.
import type { Rules } from "../content";
import { log } from "../log";
import { StorageError, type ProfileRow, type StorageAdapter } from "../storage/adapter";

/** api-gate §5 토큰 발급 32바이트 (architecture §9.6) */
const TOKEN_BYTES = 32;
/** base64url 43자 (API-002 검증 규칙) */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type CreateGuestOutcome =
  | { ok: true; data: { guestId: string; nickname: string; token: string; rating: number; createdAt: string } }
  | { ok: false; code: "NICKNAME_INVALID" | "NICKNAME_TAKEN" | "STORAGE_UNAVAILABLE" };

export type VerifyOutcome =
  | { ok: true; profile: ProfileRow }
  | { ok: false; code: "UNAUTHORIZED" | "STORAGE_UNAVAILABLE" };

/** FR-012 닉네임 정규화: trim 후 rules.nickname.pattern (`^[가-힣A-Za-z0-9_]{2,12}$`) — 위반이면 null (UC-001 E1) */
export function normalizeNickname(raw: unknown, rules: Rules): string | null {
  if (typeof raw !== "string") return null;
  const nickname = raw.trim();
  if (nickname.length < rules.nickname.min || nickname.length > rules.nickname.max) return null;
  return new RegExp(rules.nickname.pattern).test(nickname) ? nickname : null;
}

/** 봉인 제3계명 SHA-256 소문자 hex 64자 (TBL-001 token_hash) */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** architecture §9.6 게스트 토큰 = crypto.getRandomValues 32바이트 → base64url 43자 */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 원장 게스트 서비스 (Matchmaker 안 — data-ark §1, D-04) */
export class GuestService {
  /** 토큰 해시 → 프로필 LRU (architecture §4 캐시 전략, rules.ledger.tokenCacheSize) — Map 삽입 순서 = 최근 사용 순서 */
  private readonly cache = new Map<string, ProfileRow>();

  constructor(private readonly storage: StorageAdapter, private readonly rules: Rules) {}

  /** API-001 게스트 생성: 닉네임 검증 → 사전 중복 조회 → guestId·토큰 발급 → 프로필·진행 기록 생성 (UC-001) */
  async createGuest(rawNickname: unknown): Promise<CreateGuestOutcome> {
    const nickname = normalizeNickname(rawNickname, this.rules);
    if (!nickname) return { ok: false, code: "NICKNAME_INVALID" };
    try {
      // data-ark §6.2 닉네임 중복 2중 방어: 사전 조회 + DB UNIQUE NOCASE (UC-001 E2)
      if (await this.storage.nicknameExists(nickname)) return { ok: false, code: "NICKNAME_TAKEN" };
      const token = generateToken();
      const guestId = crypto.randomUUID();
      const created = await this.storage.createGuest({ guestId, nickname, tokenHash: await sha256Hex(token) });
      if (!created.ok) return { ok: false, code: "NICKNAME_TAKEN" };
      log.event("guest_created", { gid: guestId });
      const p = created.profile;
      return { ok: true, data: { guestId: p.guestId, nickname: p.nickname, token, rating: p.rating,
        createdAt: p.createdAt } };
    } catch (err) {
      log.event("storage_fail", { code: "STORAGE_UNAVAILABLE" });
      if (err instanceof StorageError) return { ok: false, code: "STORAGE_UNAVAILABLE" };
      throw err;
    }
  }

  /** NFR-003 토큰 검증 (모든 REST·WS 인증) — 실패 원인은 구분하지 않고 UNAUTHORIZED (api-gate §5) */
  async verifyToken(token: unknown): Promise<VerifyOutcome> {
    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
      log.event("auth_fail", { code: "UNAUTHORIZED" });
      return { ok: false, code: "UNAUTHORIZED" };
    }
    const hash = await sha256Hex(token);
    const cached = this.cache.get(hash);
    if (cached) {
      this.cache.delete(hash);
      this.cache.set(hash, cached);
      return { ok: true, profile: cached };
    }
    try {
      const profile = await this.storage.findProfileByTokenHash(hash);
      if (!profile) {
        log.event("auth_fail", { code: "UNAUTHORIZED" });
        return { ok: false, code: "UNAUTHORIZED" };
      }
      this.cache.set(hash, profile);
      while (this.cache.size > this.rules.ledger.tokenCacheSize) {
        this.cache.delete(this.cache.keys().next().value as string);
      }
      return { ok: true, profile };
    } catch (err) {
      log.event("storage_fail", { code: "STORAGE_UNAVAILABLE" });
      if (err instanceof StorageError) return { ok: false, code: "STORAGE_UNAVAILABLE" };
      throw err;
    }
  }

  /** API-002 내 프로필 (+ 누적 판 수 roundsPlayed) */
  async getMe(token: unknown): Promise<
    { ok: true; data: { guestId: string; nickname: string; rating: number; roundsPlayed: number } }
    | { ok: false; code: "UNAUTHORIZED" | "STORAGE_UNAVAILABLE" }
  > {
    const verified = await this.verifyToken(token);
    if (!verified.ok) return verified;
    try {
      const progress = await this.storage.getProgress(verified.profile.guestId);
      const p = verified.profile;
      return { ok: true, data: { guestId: p.guestId, nickname: p.nickname, rating: p.rating,
        roundsPlayed: progress?.roundsPlayed ?? 0 } };
    } catch (err) {
      log.event("storage_fail", { gid: verified.profile.guestId, code: "STORAGE_UNAVAILABLE" });
      if (err instanceof StorageError) return { ok: false, code: "STORAGE_UNAVAILABLE" };
      throw err;
    }
  }

  /** 경기 기록 후 레이팅이 바뀐 게스트의 캐시 행 갱신 (FR-070 — 캐시는 원장의 사본) */
  updateCachedRating(guestId: string, rating: number): void {
    for (const [hash, profile] of this.cache) if (profile.guestId === guestId) this.cache.set(hash, { ...profile,
      rating });
  }
}
