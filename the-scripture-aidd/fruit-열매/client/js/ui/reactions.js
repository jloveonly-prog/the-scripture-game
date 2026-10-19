// TASK-063-3 · FR-064 · C-009 · UC-017 · HUD-13 · EVT-46 — 리액션 3종 (자유 텍스트 없음, 같은 플레이어 1500ms 간격)
import { REACTION_IDS, ROOM_C2S } from '../net/protocol.js';
import { content } from '../content/content-loader.js';
import { el } from './dom.js';

/** CODE-010 표시 (키 7·8·9 순서 — design-vision §4.3) */
export const REACTION_VIEW = Object.freeze({
  amen: { key: '7', emoji: '🙏', label: '아멘' },
  hallelujah: { key: '8', emoji: '🔥', label: '할렐루야' },
  halo: { key: '9', emoji: '😇', label: '후광' }, // CODE-010 halo 직역 (design-vision §4.3은 이모지만 표기)
});
const BUBBLE_MS = 1660; // EVT-46 160 등장 + 1200 유지 + 300 페이드
const DIM_MS = 300;

// FR-064 보낼 수 있는가 — 직전 송신 후 balance.reactions.intervalMs(1500) 경과 (UC-017 E2)
export function canSendReaction(lastSentAt, now, intervalMs = content.balance.reactions.intervalMs) {
  return lastSentAt === null || now - lastSentAt >= intervalMs;
}

/**
 * HUD-13 리액션 바 + 말풍선.
 * opts: { barHost, myAnchor, opponentAnchor, room }. 반환 { trySend(reactionId), receive(data), destroy() }
 */
export function createReactions({ barHost, myAnchor, opponentAnchor, room }) {
  let lastSentAt = null;
  const buttons = new Map();
  const bar = el('div', { class: 'reaction-bar', attrs: { role: 'group', 'aria-label': '리액션' } });
  for (const id of REACTION_IDS) {
    const view = REACTION_VIEW[id];
    const button = el('button', {
      class: 'keycap keycap--reaction', attrs: { type: 'button', tabindex: '-1', 'aria-label': `${view.key} ${view.label}` },
      on: { click: () => trySend(id) },
    }, [el('span', { class: 'keycap__key', text: view.key }), el('span', { class: 'keycap__icon', text: view.emoji })]);
    buttons.set(id, button);
    bar.append(button);
  }
  barHost.append(bar);

  function bubble(anchor, reactionId) {
    if (!anchor) return;
    const view = REACTION_VIEW[reactionId];
    if (!view) return;
    const node = el('div', { class: 'reaction-bubble', text: view.emoji, attrs: { 'aria-hidden': 'true' } });
    anchor.append(node);
    setTimeout(() => node.remove(), BUBBLE_MS);
  }

  // FR-064 키 7·8·9 / 버튼 → reaction(API-209), 내 보드 위 말풍선. 간격 미만이면 버튼이 잠깐 흐려짐
  function trySend(reactionId) {
    if (!REACTION_IDS.includes(reactionId)) return false;
    const now = Date.now();
    if (!canSendReaction(lastSentAt, now)) {
      const button = buttons.get(reactionId);
      button.classList.add('is-dim');
      setTimeout(() => button.classList.remove('is-dim'), DIM_MS);
      return false;
    }
    lastSentAt = now;
    room.send(ROOM_C2S.REACTION, { reactionId });
    bubble(myAnchor, reactionId);
    return true;
  }

  return {
    trySend,
    // FR-064 상대 reaction(API-260) → 상대 보드 근처 말풍선 (CODE-010 밖의 값은 무시)
    receive(data) {
      if (data && REACTION_IDS.includes(data.reactionId)) bubble(opponentAnchor, data.reactionId);
    },
    destroy() { bar.remove(); },
  };
}
