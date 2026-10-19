// TASK-063-3 · C-009 · HUD-18 · api-gate §4.2 — 안내·거부 토스트 (동시 최대 2개, 같은 문구 합치기·시간 연장 — design-vision §4.2)
import { el } from './dom.js';

export const TOAST_MS = 1500;
export const MAX_TOASTS = 2;
/** untilMs가 이 값보다 작으면 "지속 ms", 크면 "로컬 epoch 만료 시각"으로 해석 (BattleUiPort 계약 해석 — 보고서 기재) */
const EPOCH_THRESHOLD = 1e11;

/** 만료 시각 계산 */
export function toastExpiry(now, untilMs) {
  if (!Number.isFinite(untilMs)) return now + TOAST_MS;
  return untilMs >= EPOCH_THRESHOLD ? Math.max(untilMs, now + TOAST_MS) : now + Math.max(untilMs, TOAST_MS);
}

/**
 * C-009 토스트 목록 갱신 (순수) — 같은 key 또는 같은 문구면 1개로 합치고 문구·만료를 갱신, 아니면 추가 후 오래된 것부터 2개 초과분 제거.
 * list 원소: { id, key, message, expiresAt }
 */
export function planToast(list, { message, key = null, untilMs } = {}, now, nextId) {
  const expiresAt = toastExpiry(now, untilMs);
  const index = list.findIndex((t) => (key !== null && t.key === key) || t.message === message);
  if (index >= 0) {
    const merged = { ...list[index], message, key: key ?? list[index].key, expiresAt: Math.max(list[index].expiresAt, expiresAt) };
    return list.map((t, i) => (i === index ? merged : t));
  }
  const next = [...list, { id: nextId, key, message, expiresAt }];
  return next.slice(Math.max(0, next.length - MAX_TOASTS));
}

/** HUD-18 토스트 영역 생성 → { show(message, { key, untilMs }), clear() } */
export function createToaster(host) {
  const region = el('div', { class: 'toast-region', attrs: { role: 'status', 'aria-live': 'polite' } });
  host.append(region);
  let list = [];
  let seq = 0;
  let timer = null;

  function render() {
    const now = Date.now();
    list = list.filter((t) => t.expiresAt > now);
    const keep = new Set(list.map((t) => String(t.id)));
    for (const node of [...region.children]) if (!keep.has(node.dataset.id)) node.remove();
    for (const toast of list) {
      let node = region.querySelector(`[data-id="${toast.id}"]`);
      if (!node) {
        node = el('div', { class: 'toast', dataset: { id: String(toast.id) } });
        region.append(node);
      }
      if (node.textContent !== toast.message) node.textContent = toast.message;
    }
    clearTimeout(timer);
    if (list.length) timer = setTimeout(render, Math.max(50, Math.min(...list.map((t) => t.expiresAt)) - now));
  }

  return {
    show(message, { key = null, untilMs } = {}) {
      if (typeof message !== 'string' || message.length === 0) return; // "표시 없음" 문구('')는 그리지 않는다
      seq += 1;
      list = planToast(list, { message, key, untilMs }, Date.now(), seq);
      render();
    },
    clear() {
      list = [];
      render();
    },
  };
}
