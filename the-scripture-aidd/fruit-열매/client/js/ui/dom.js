// TASK-061 · FR-078 · NFR-003 · api-gate §5.4 — 안전한 DOM 생성 도우미 (textContent·createElement만, innerHTML 금지 — devguide §3.3-3)
// 화면 9개·경기 UI가 함께 쓰는 므낫세 영토 내부 도우미. 다른 지파 모듈을 정적으로 import 하지 않는다.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 요소 생성. props: { class, text, attrs, dataset, on, hidden } / children: Node | string | null 배열.
 * 문자열 자식은 항상 텍스트 노드로 넣는다 (닉네임·문항 등 신뢰할 수 없는 문자열 보호 — 봉인 제7계명·XSS).
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.text !== undefined && props.text !== null) node.textContent = String(props.text);
  if (props.attrs) {
    for (const [name, value] of Object.entries(props.attrs)) {
      if (value === false || value === null || value === undefined) continue;
      node.setAttribute(name, value === true ? '' : String(value));
    }
  }
  if (props.dataset) Object.assign(node.dataset, props.dataset);
  if (props.on) for (const [type, fn] of Object.entries(props.on)) node.addEventListener(type, fn);
  if (props.hidden) node.hidden = true;
  append(node, children);
  return node;
}

/** 자식 추가 (null·false 건너뜀) */
export function append(node, children) {
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  return node;
}

/** 모든 자식 제거 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** 24px 선 아이콘 (design-vision §2.10 아이콘 — 코드 그리기, 이미지 파일 0개) */
export function svgIcon(paths, label = null) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('class', 'icon');
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/**
 * 위인 엠블럼 자리 (SCR-003·004·006·007) — render/emblems.js(납달리 §7.9)를 지연 로드해 캔버스를 채운다.
 * 로드 실패 시 자리만 남는다 (예외는 1회 로그 — devguide §3.6 클라이언트 렌더).
 */
export function emblemSlot(loadEmblems, hero, sizePx) {
  const label = hero ? `${hero.nameKo} 엠블럼 — ${hero.skill?.nameKo ?? ''}` : '엠블럼';
  const slot = el('span', { class: 'emblem', attrs: { role: 'img', 'aria-label': label } });
  slot.style.setProperty('--emblem-size', `${sizePx}px`);
  if (!hero || typeof loadEmblems !== 'function') return slot;
  loadEmblems()
    .then((mod) => (mod ? mod.renderEmblemCanvas(hero.id, sizePx) : null))
    .then((canvas) => {
      if (!canvas) return;
      canvas.setAttribute('aria-hidden', 'true');
      slot.append(canvas);
    })
    .catch((err) => console.error('[emblem] render failed', err));
  return slot;
}

/** 포커스 가두기 (모달·말씀 대결 패널 — design-vision §4.2, WCAG 2.1.2). 반환 함수로 해제 */
export function trapFocus(container) {
  const onKey = (event) => {
    if (event.key !== 'Tab') return;
    const items = [...container.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')]
      .filter((n) => !n.hidden && n.offsetParent !== null);
    if (items.length === 0) { event.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

/** 기간 ms → "mm:ss" (경기 시간·대기 시간·만료까지 — 음수는 0) */
export function formatClock(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** 주 버튼 처리 중 상태 (design-vision §4.2 — 글자 대신 빛 고리 + "처리 중", 중복 클릭 차단) */
export function setBusy(button, busy, idleText) {
  button.disabled = busy;
  button.setAttribute('aria-busy', busy ? 'true' : 'false');
  clear(button);
  if (busy) append(button, [el('span', { class: 'ring ring--sm', attrs: { 'aria-hidden': 'true' } }), '처리 중']);
  else button.textContent = idleText;
}
