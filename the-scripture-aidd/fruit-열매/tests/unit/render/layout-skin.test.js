// TASK-040-1 · FR-048 · FR-075 · NFR-001 — 대전 화면 셀 크기 공식(design-vision §5.2)·배치·블록 색 토큰(§2.3)·명도 조정 검사.
import { describe, it, expect } from 'vitest';
import { deviceClass, computeCellSizes, computeBattleLayout, killTweensInTree } from '../../../client/js/render/pixi-app.js';
import { COLORS, CELL_COLORS, PALETTE_COLORS, cellColor, shadeColor, skinMetrics, toCss, createSkinCache } from '../../../client/js/render/piece-skin.js';

const inside = (r, w, h) => r.x >= 0 && r.y >= 0 && r.x + r.width <= w && r.y + r.height <= h;

describe('셀 크기 공식 (design-vision §5.2)', () => {
  it('기기 구분 — 데스크톱 ≥1024, 태블릿 768~1023, 모바일 <768, 높이 <500 = 모바일 가로', () => {
    expect(deviceClass(1280, 800)).toBe('desktop');
    expect(deviceClass(800, 1000)).toBe('tablet');
    expect(deviceClass(390, 844)).toBe('mobile');
    expect(deviceClass(844, 390)).toBe('mobileLandscape');
  });

  it('데스크톱 clamp(20, floor((h − 184)/20), 32), 상대 = round(내 셀 × 0.6)', () => {
    expect(computeCellSizes(1920, 1080)).toMatchObject({ cell: 32, oppCell: 19 });
    expect(computeCellSizes(1280, 720)).toMatchObject({ cell: 26, oppCell: 16 });
    expect(computeCellSizes(1280, 560).cell).toBe(20);
  });

  it('태블릿 clamp(16, floor((h − 160)/20), 28)', () => {
    expect(computeCellSizes(800, 1280).cell).toBe(28);
    expect(computeCellSizes(800, 640).cell).toBe(24);
  });

  it('모바일 세로 min(30, floor((w − 56)/10), floor((h − 300)/20)), 상대 미니 7px', () => {
    expect(computeCellSizes(390, 844)).toMatchObject({ cell: 27, oppCell: 7 });
    expect(computeCellSizes(430, 1000).cell).toBe(30);
    expect(computeCellSizes(360, 640).cell).toBe(17);
  });

  it('모바일 가로 clamp(12, floor((h − 96)/20), 24)', () => {
    expect(computeCellSizes(844, 390)).toMatchObject({ cell: 14, oppCell: 8 });
  });
});

describe('대전 배치', () => {
  it('데스크톱 — 보드 10×20 셀, 상대 보드는 레인 오른쪽, 모든 영역이 화면 안', () => {
    const L = computeBattleLayout(1920, 1080, 'random');
    expect(L.myBoard).toMatchObject({ width: 320, height: 640, y: 64 });
    expect(L.opponentBoard.width).toBe(190);
    expect(L.lane.x).toBeGreaterThan(L.myBoard.x + L.myBoard.width);
    expect(L.opponentBoard.x).toBe(L.lane.x + L.lane.width);
    for (const key of ['myBoard', 'opponentBoard', 'lane', 'hold', 'next', 'armor', 'meter', 'faith']) expect(inside(L[key], 1920, 1080)).toBe(true);
    expect(L.hold.x + L.hold.width).toBeLessThan(L.myBoard.x);
  });

  it('1024×768 최소 데스크톱에서도 가로로 넘치지 않는다', () => {
    const L = computeBattleLayout(1024, 768, 'bot');
    expect(L.opponentBoard.x + L.opponentBoard.width).toBeLessThanOrEqual(1024);
  });

  it('연습 — 상대 보드·레인 없음(null), 내 보드는 가운데 쪽', () => {
    const L = computeBattleLayout(1280, 800, 'practice');
    expect(L.opponentBoard).toBeNull();
    expect(L.lane).toBeNull();
    expect(Math.abs(L.myBoard.x + L.myBoard.width / 2 - 640)).toBeLessThan(200);
  });

  it('모바일 세로 — 상대 미니 보드가 위, 내 보드가 아래 가운데', () => {
    const L = computeBattleLayout(390, 844, 'random');
    expect(L.opponentBoard).toMatchObject({ width: 70, height: 140 });
    expect(L.myBoard.y).toBeGreaterThan(L.opponentBoard.y + L.opponentBoard.height);
    expect(Math.abs(L.myBoard.x + L.myBoard.width / 2 - 195)).toBeLessThanOrEqual(1);
    expect(inside(L.myBoard, 390, 844)).toBe(true);
  });
});

describe('블록 색 토큰 (design-vision §2.3 성막 재료)', () => {
  it('셀 코드 1~7 = I·O·T·S·Z·J·L 성막 색, 8 쓰레기, 9 납, a~c 특수, d~i 갑주', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((n) => cellColor(String(n)))).toEqual([0x4fb3ff, 0xf4c430, 0xa35cf0, 0xc7d0dc, 0xe5404f, 0x3b5fe0, 0xf27a45]);
    expect(cellColor('8')).toBe(0x636a80);
    expect(cellColor('9')).toBe(0x7d838f);
    expect([cellColor('a'), cellColor('b'), cellColor('c')]).toEqual([0xfff6d0, 0xe8c99b, 0xf4f1e6]);
    for (const code of 'defghi') expect(cellColor(code)).toBe(0xdce3ee);
    expect(cellColor('0')).toBeNull();
    expect(Object.keys(CELL_COLORS)).toHaveLength(18);
  });

  it('위인 팔레트 접미사(D4-07) → 블록 토큰', () => {
    expect(PALETTE_COLORS['blue-sky']).toBe(COLORS.blockBlueSky);
    expect(PALETTE_COLORS.scarlet).toBe(COLORS.blockScarlet);
    expect(Object.keys(PALETTE_COLORS).sort()).toEqual(['blue-deep', 'blue-sky', 'gold', 'purple', 'scarlet', 'silver']);
  });

  it('명도 조정 — 어둡게 −25%·밝게 +30%, 무채색 유지', () => {
    expect(shadeColor(0x808080, -0.25)).toBe(0x606060);
    expect(shadeColor(0x000000, 0.3)).toBe(0x4d4d4d);
    expect(shadeColor(0xffffff, -1)).toBe(0x000000);
    const darker = shadeColor(COLORS.blockGold, -0.25);
    expect((darker >> 16) & 255).toBeLessThan((COLORS.blockGold >> 16) & 255);
  });

  it('질감 비례 수치 — 30px 기준 모서리 3px·발광 여백 4px', () => {
    expect(skinMetrics(30)).toEqual({ radius: 3, margin: 4 });
    expect(skinMetrics(15)).toEqual({ radius: 1.5, margin: 2 });
    expect(toCss(0xff6b78, 0.5)).toBe('rgba(255,107,120,0.5)');
  });

  it('텍스처 캐시 — (코드, 크기)당 1회 생성, clear 시 폐기', () => {
    const made = [];
    const fakeDoc = { createElement: () => ({ getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }) }) };
    globalThis.document = fakeDoc;
    try {
      const cache = createSkinCache({ makeTexture: (c) => { const tex = { c, destroy() { this.dead = true; } }; made.push(tex); return tex; } });
      const a = cache.getTexture('1', 30);
      expect(cache.getTexture('1', 30)).toBe(a);
      cache.getTexture('1', 24);
      cache.getTexture('8', 30);
      expect(made).toHaveLength(3);
      cache.clear();
      expect(made.every((t) => t.dead)).toBe(true);
      expect(() => cache.getTexture('0', 30)).toThrow(RangeError);
    } finally {
      delete globalThis.document;
    }
  });
});

describe('killTweensInTree (광야 BUG-007 — 파괴 전 트윈 정리)', () => {
  it('자신·scale·filters·자식까지 대상마다 따로 kill 한다 (배열 kill 금지)', () => {
    const leaf = { scale: { id: 'leafScale' }, filters: [{ id: 'f1' }], children: [] };
    const root = { scale: { id: 'rootScale' }, filters: null, children: [leaf, { children: [] }] };
    const killed = [];
    killTweensInTree(root, (t) => { expect(Array.isArray(t)).toBe(false); killed.push(t); });
    expect(killed).toEqual([root, root.scale, leaf, leaf.scale, leaf.filters[0], root.children[1]]);
  });
  it('null 트리는 아무것도 하지 않는다', () => {
    let n = 0;
    killTweensInTree(null, () => { n += 1; });
    expect(n).toBe(0);
  });
});