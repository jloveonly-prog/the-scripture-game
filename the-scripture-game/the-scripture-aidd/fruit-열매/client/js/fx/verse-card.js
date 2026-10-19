// verse-card.js — 말씀 카드 캔버스 그리기·PNG 저장·`navigator.share` 공유만
// TASK-052 | REQ-011 REQ-013 FR-063 C-003 | ARCH-005 | TBL-016 | screen-vision SCR-006 [이미지 저장]·[공유]·UC-015 9a·E3 |
// design-vision §2.13.6 빛 별·§4.6.8 결과 화면
// 화면 밖 <canvas> 1080×1350: 바탕 #07060D + 하늘 그라데이션, 안쪽 40px 금 테두리 8px, 엠블럼 160(위 가운데), KJV 원문 Cinzel 44px
// (폭 880 줄바꿈), 번역 Noto Serif KR 40px, 출처 32px #E8B84A, 푸터 24px #9C93B3. 구절이 John 16:33이면 엠블럼 자리에 빛 별만.
// 실패는 예외가 아닌 값({ ok:false })으로 돌려준다 — 토스트 "카드를 저장하지 못했습니다"는 화면(03-C) 몫, 공유 취소는 토스트 없음.
import { heroesById, rules, versesByRef } from "../content.js";
import { toSvg } from "../art/to-svg.js";
import { EMBLEMS } from "../art/shapes-heroes-armor.js";
import { LIGHT_STAR } from "../art/shapes-ui.js";

export const CARD = Object.freeze({ width: 1080, height: 1350 });
const TEXT_W = 880;
const FOOTER = "SPIRITUAL WARFARE TETRIS · 영적 전쟁 테트리스";
const SHARE_TITLE = "영적 전쟁 테트리스";

/** 파일명 swt-verse-YYYYMMDD-HHmm.png @param {Date} [d] */
export function cardFileName(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  const day = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  return `swt-verse-${day}-${p(d.getHours())}${p(d.getMinutes())}.png`;
}

/** 폭 안에서 단어(영어)·글자(한국어 어절) 단위 줄바꿈 @param {CanvasRenderingContext2D} ctx */
export function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const out = [];
  let line = "";
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (ctx.measureText(tryLine).width <= maxW || !line) line = tryLine;
    else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out;
}

/** 엠블럼 그림 (John 16:33 → 빛 별 §4.6.8, 아니면 내 위인 엠블럼) @param {string} verseRef @param {string} [heroId] */
function emblemShape(verseRef, heroId) {
  if (verseRef === rules.verseCard.jesusEventRef) return LIGHT_STAR;
  const hero = heroId ? heroesById.get(heroId) : null;
  return hero ? EMBLEMS[hero.emblem] : LIGHT_STAR;
}

/** SVG 문자열 → Image @param {string} svg */
async function svgImage(svg) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}

/**
 * FR-063 카드 그리기 — 글은 verses.json(C-003)에서만
 * @param {{ verseRef: string, heroId?: string, canvas?: HTMLCanvasElement }} o
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function drawVerseCard({ verseRef, heroId, canvas }) {
  const verse = versesByRef.get(verseRef);
  if (!verse) throw new Error("구절 없음");
  const c = canvas ?? document.createElement("canvas");
  c.width = CARD.width;
  c.height = CARD.height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("캔버스 없음");
  try {
    await document.fonts?.ready;
  } catch {
    /* 글꼴 대기 실패 — 기본 글꼴로 그림 */
  }
  ctx.fillStyle = "#07060D";
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  const sky = ctx.createLinearGradient(0, 0, 0, CARD.height); // --c-sky-top / mid(55%) / bottom
  sky.addColorStop(0, "#0B0A1F");
  sky.addColorStop(0.55, "#15102E");
  sky.addColorStop(1, "#1C1238");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  // 안쪽 40px 금 테두리 8px (--g-gold 세로)
  const gold = ctx.createLinearGradient(0, 40, 0, CARD.height - 40);
  gold.addColorStop(0, "#F6D98B");
  gold.addColorStop(0.55, "#E8B84A");
  gold.addColorStop(1, "#A97B1F");
  ctx.strokeStyle = gold;
  ctx.lineWidth = 8;
  ctx.strokeRect(44, 44, CARD.width - 88, CARD.height - 88);
  // 엠블럼 160 (위 가운데)
  try {
    const img = await svgImage(toSvg(emblemShape(verseRef, heroId), 160));
    ctx.drawImage(img, (CARD.width - 160) / 2, 110, 160, 160);
  } catch (err) {
    console.error("말씀 카드 엠블럼 실패", err);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let y = 330;
  const block = (text, font, color, lh) => {
    ctx.font = font;
    ctx.fillStyle = color;
    for (const line of wrapLines(ctx, text, TEXT_W)) {
      ctx.fillText(line, CARD.width / 2, y);
      y += lh;
    }
  };
  block(verse.kjv, '400 44px "Cinzel", serif', "#FFF8E7", 62);
  y += 36;
  block(verse.ko, '400 40px "Noto Serif KR", serif', "#F4EFE3", 60);
  y += 28;
  block(`${verse.ref} · ${verse.ref_ko}`, '700 32px "Cinzel", "Noto Serif KR", serif', "#E8B84A", 44);
  ctx.font = '400 24px "Noto Serif KR", serif';
  ctx.fillStyle = "#9C93B3";
  ctx.fillText(FOOTER, CARD.width / 2, CARD.height - 110);
  return c;
}

/** @param {HTMLCanvasElement} c @returns {Promise<Blob>} */
function toPng(c) {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG 실패"))), "image/png"));
}

/** 카드 PNG 파일 @param {{ verseRef: string, heroId?: string }} o */
export async function verseCardFile(o) {
  const blob = await toPng(await drawVerseCard(o));
  return new File([blob], cardFileName(), { type: "image/png" });
}

/**
 * [이미지 저장] — toBlob('image/png') → 내려받기
 * @param {{ verseRef: string, heroId?: string }} o @returns {Promise<{ ok: boolean }>}
 */
export async function saveVerseCard(o) {
  try {
    const file = await verseCardFile(o);
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true };
  } catch (err) {
    console.error("말씀 카드 저장 실패", err);
    return { ok: false };
  }
}

/** UC-015 9a [공유] 버튼은 PNG 파일로 navigator.canShare가 참일 때만 렌더 @param {File} [file] */
export function canShareVerseCard(file) {
  try {
    const probe = file ?? new File([new Blob([""], { type: "image/png" })], "probe.png", { type: "image/png" });
    return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * [공유] — files=[카드 PNG], title="영적 전쟁 테트리스", text=구절 출처. 사용자가 취소하면 cancelled = true(토스트 없음)
 * @param {{ verseRef: string, heroId?: string }} o @returns {Promise<{ ok: boolean, cancelled?: boolean }>}
 */
export async function shareVerseCard(o) {
  try {
    const file = await verseCardFile(o);
    const v = versesByRef.get(o.verseRef);
    await navigator.share({ files: [file], title: SHARE_TITLE, text: v ? `${v.ref} · ${v.ref_ko}` : o.verseRef });
    return { ok: true };
  } catch (err) {
    if (err && /** @type {any} */ (err).name === "AbortError") return { ok: false, cancelled: true };
    console.error("말씀 카드 공유 실패", err);
    return { ok: false };
  }
}
