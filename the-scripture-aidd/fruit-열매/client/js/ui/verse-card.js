// TASK-063-2 · FR-063 · C-003 · UC-015 9·9a·E3 — 말씀 카드 (DOM 표시 + 오프스크린 캔버스 PNG 저장·Web Share)
// 구절 표기 순서: KJV 원문(Cinzel) → 직접 번역(Noto Serif KR) → 출처 (C-003). 외부 요청 0건 (NFR-005).
import { heroesById } from '../content/content-loader.js';
import { el, emblemSlot } from './dom.js';

/** design-vision §2.1·§2.2·§2.5 토큰 값 (캔버스는 CSS 변수를 읽지 못하므로 이름 있는 상수 — devguide §3.3-1) */
const CARD = Object.freeze({
  width: 900, height: 1200, padding: 84, border: 6, radius: 24,
  bgTop: '#1F2440', bgBottom: '#0E1020', gold: '#F2C14E', goldBright: '#FFE08A', text: '#F5F0E1', textSecondary: '#B9B4CC',
  watermarkSize: 520, watermarkAlpha: 0.12,
  fontEn: '400 40px Cinzel', fontKo: '400 32px "Noto Serif KR"', fontRef: '700 30px Cinzel', fontFooter: '700 24px Cinzel',
  lineEn: 60, lineKo: 54, gap: 40,
});
export const CARD_TITLE = 'SPIRITUAL WARFARE TETRIS';

// FR-063 파일명 "말씀카드-출처.png" — 공백은 하이픈 (screen-vision SCR-006)
export function verseCardFileName(ref) {
  return `말씀카드-${String(ref).trim().replace(/\s+/g, '-')}.png`;
}

/** 단어 단위 줄바꿈 (순수 — measure(text) → 폭 px). 공백 없는 긴 낱말은 글자 단위로 자른다 */
export function wrapLines(text, maxWidth, measure) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth) { line = candidate; continue; }
    if (line) lines.push(line);
    if (measure(word) <= maxWidth) { line = word; continue; }
    let chunk = '';
    for (const ch of word) {
      if (measure(chunk + ch) > maxWidth && chunk) { lines.push(chunk); chunk = ch; } else chunk += ch;
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines;
}

// FR-063 화면용 말씀 카드 (금테 3:4, 엠블럼 워터마크, role="img" + aria-label=출처·번역문 — screen-vision §5)
export function buildVerseCardElement({ verse, heroId, loadEmblems }) {
  const hero = heroesById.get(heroId) ?? null;
  const watermark = emblemSlot(loadEmblems, hero, CARD.watermarkSize / 2);
  watermark.classList.add('verse-card__watermark');
  watermark.removeAttribute('role');
  watermark.setAttribute('aria-hidden', 'true');
  return el('figure', { class: 'verse-card', attrs: { role: 'img', 'aria-label': `${verse.ref} — ${verse.ko}` } }, [
    watermark,
    el('p', { class: 'verse__en', text: verse.kjv, attrs: { lang: 'en' } }),
    el('p', { class: 'verse__ko', text: verse.ko }),
    el('p', { class: 'verse__ref', text: `— ${verse.ref}`, attrs: { lang: 'en' } }),
    el('p', { class: 'verse-card__title', text: CARD_TITLE, attrs: { lang: 'en' } }),
  ]);
}

async function loadFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([CARD.fontEn, CARD.fontKo, CARD.fontRef, CARD.fontFooter].map((f) => document.fonts.load(f)));
}

// FR-063 오프스크린 캔버스에 카드를 그려 PNG Blob (실패 시 예외 → 호출자가 "카드를 저장하지 못했습니다")
export async function renderVerseCardBlob({ verse, heroId, loadEmblems }) {
  await loadFonts();
  const canvas = document.createElement('canvas');
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, CARD.height);
  grad.addColorStop(0, CARD.bgTop);
  grad.addColorStop(1, CARD.bgBottom);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD.width, CARD.height, CARD.radius);
  ctx.fill();
  ctx.lineWidth = CARD.border;
  ctx.strokeStyle = CARD.gold;
  ctx.beginPath();
  ctx.roundRect(CARD.border, CARD.border, CARD.width - CARD.border * 2, CARD.height - CARD.border * 2, CARD.radius - CARD.border);
  ctx.stroke();
  try {
    const mod = typeof loadEmblems === 'function' ? await loadEmblems() : null;
    if (mod && heroesById.has(heroId)) {
      const emblem = await mod.renderEmblemCanvas(heroId, CARD.watermarkSize);
      ctx.globalAlpha = CARD.watermarkAlpha;
      ctx.drawImage(emblem, (CARD.width - CARD.watermarkSize) / 2, (CARD.height - CARD.watermarkSize) / 2, CARD.watermarkSize, CARD.watermarkSize);
      ctx.globalAlpha = 1;
    }
  } catch (err) {
    console.error('[verse-card] watermark skipped', err);
  }
  const maxWidth = CARD.width - CARD.padding * 2;
  const blocks = [
    { font: CARD.fontEn, color: CARD.text, line: CARD.lineEn, text: verse.kjv },
    { font: CARD.fontKo, color: CARD.textSecondary, line: CARD.lineKo, text: verse.ko },
    { font: CARD.fontRef, color: CARD.gold, line: CARD.lineKo, text: `— ${verse.ref}` },
  ].map((b) => {
    ctx.font = b.font;
    return { ...b, lines: wrapLines(b.text, maxWidth, (t) => ctx.measureText(t).width) };
  });
  const total = blocks.reduce((sum, b) => sum + b.lines.length * b.line, 0) + CARD.gap * (blocks.length - 1);
  let y = (CARD.height - total) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const block of blocks) {
    ctx.font = block.font;
    ctx.fillStyle = block.color;
    for (const line of block.lines) { ctx.fillText(line, CARD.width / 2, y); y += block.line; }
    y += CARD.gap;
  }
  ctx.font = CARD.fontFooter;
  ctx.fillStyle = CARD.goldBright;
  ctx.fillText(CARD_TITLE, CARD.width / 2, CARD.height - CARD.padding);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png'));
}

// FR-063 PNG 내려받기 → true/false
export async function saveVerseCard(opts) {
  try {
    const blob = await renderVerseCardBlob(opts);
    const url = URL.createObjectURL(blob);
    const link = el('a', { attrs: { href: url, download: verseCardFileName(opts.verse.ref) } });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('[verse-card] save failed', err);
    return false;
  }
}

/** UC-015 9a — 파일 공유 지원 여부 (미지원이면 [공유] 버튼 숨김) */
export function canShareFiles() {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function' || typeof File === 'undefined') return false;
    return navigator.canShare({ files: [new File([new Uint8Array(1)], 'card.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

// FR-063 Web Share → 'shared' | 'cancelled'(사용자가 닫음 — 실패 아님) | 'failed'
export async function shareVerseCard(opts) {
  try {
    const blob = await renderVerseCardBlob(opts);
    const file = new File([blob], verseCardFileName(opts.verse.ref), { type: 'image/png' });
    await navigator.share({ files: [file], title: CARD_TITLE, text: opts.verse.ref });
    return 'shared';
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
    console.error('[verse-card] share failed', err);
    return 'failed';
  }
}
