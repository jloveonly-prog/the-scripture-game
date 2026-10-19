// outbox.ts — 슬롯별·양측 전송과 봉투 직렬화만
// TASK-033 | REQ-001 FR-006 FR-008 NFR-003 | ARCH-011 | API-019~API-031 | D-20 (공통 봉투)
// 소켓은 SocketLike로만 다룬다 (cloudflare:workers 비의존). 봇 슬롯 전달은 GameRoom의 RoomContext가 맡는다.
import {
  envelope, errorEnvelope, rejectData, ROOM_OUT, WS_ERRORS, type RejectCode, type WsErrorCode,
} from "../protocol/messages";
import type { Slot } from "../storage/adapter";

/** 서버 쪽 WebSocket 중 이 파일이 쓰는 부분 */
export interface SocketLike {
  send(message: string): void;
  close(code?: number, reason?: string): void;
}

/** 방 1개의 송신함 — 인증(`ready`)을 마친 슬롯 소켓만 묶는다 (API-011) */
export class Outbox {
  private readonly sockets = new Map<Slot, SocketLike>();

  bind(slot: Slot, ws: SocketLike): void {
    this.sockets.set(slot, ws);
  }

  /** 소켓이 그 슬롯에 묶여 있으면 풀고 슬롯을 돌려준다 */
  unbind(ws: SocketLike): Slot | null {
    for (const [slot, s] of this.sockets) {
      if (s === ws) {
        this.sockets.delete(slot);
        return slot;
      }
    }
    return null;
  }

  has(slot: Slot): boolean {
    return this.sockets.has(slot);
  }

  /** 한 슬롯에만 `{type, data}` (닫힌 소켓 전송 실패는 무시 — 종료 처리는 webSocketClose가 한다) */
  send(slot: Slot, type: string, data: unknown): void {
    const ws = this.sockets.get(slot);
    if (ws) trySend(ws, envelope(type, data));
  }

  /** 묶인 모든 슬롯에 같은 봉투 (API-021 attack·API-023 effect 등 "양측") */
  broadcast(type: string, data: unknown): void {
    const text = envelope(type, data);
    for (const ws of this.sockets.values()) trySend(ws, text);
  }

  /** API-025 `reject` (비치명 — 소켓 유지) */
  reject(slot: Slot, action: string, code: RejectCode, retryInMs: number | null = null): void {
    this.send(slot, ROOM_OUT.reject, rejectData(action, code, retryInMs));
  }

  /** API-031 `error` 후 지정 Close 코드로 종료 (api-gate §4.3) — 묶여 있으면 풀기 */
  fail(ws: SocketLike, code: WsErrorCode): void {
    this.unbind(ws);
    trySend(ws, errorEnvelope(code));
    tryClose(ws, WS_ERRORS[code].close, code);
  }

  /** 묶인 모든 소켓에 `error` + 종료 (MATCH_ABORTED·OPPONENT_LEFT) */
  failAll(code: WsErrorCode): void {
    for (const ws of [...this.sockets.values()]) this.fail(ws, code);
  }

  /** 정상 종료 Close 1000 (`match_end` — API-030) */
  closeAll(code: number, reason: string): void {
    for (const ws of this.sockets.values()) tryClose(ws, code, reason);
    this.sockets.clear();
  }
}

function trySend(ws: SocketLike, text: string): void {
  try {
    ws.send(text);
  } catch {
    // 끊긴 소켓 — 이탈 처리는 webSocketClose (FR-009)
  }
}

function tryClose(ws: SocketLike, code: number, reason: string): void {
  try {
    ws.close(code, reason);
  } catch {
    // 이미 닫힘
  }
}
