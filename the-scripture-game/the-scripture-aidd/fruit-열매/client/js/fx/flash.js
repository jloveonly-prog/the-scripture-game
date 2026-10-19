// flash.js — 보드/전체 섬광·세기 배율·1초 3회 제한만
// TASK-051-1 | REQ-013 FR-052 FR-057 FR-061 | ARCH-005 | design-vision §2.10 FL·§4.8 섬광 제한·§6.3 | WCAG 2.3.1
// 실제 투명도 = 표 값 × 세기 배율(강 1.0 · 중 0.6 · 약 0.25). 보드 섬광(FL-2·FL-3)·전체 화면 섬광(FL-4)은 합쳐 1초에 3회까지 —
// 넘는 요청은 버린다. "약"에서 FL-3·FL-4는 가장자리 발광(두께 24px). 덮개 Graphics는 미리 만든 풀에서 꺼낸다.
import { Graphics } from "pixi.js";

/** §2.10 FL 토큰 */
export const FL = Object.freeze({
  "FL-1": { alpha: 0.85, up: 30, down: 120, color: 0xffffff },
  "FL-2": { alpha: 0.45, up: 40, down: 240, color: 0xffffff },
  "FL-3": { alpha: 0.6, up: 40, down: 260, color: 0xe8b84a, pad: 24 },
  "FL-4": { alpha: 0.85, up: 80, down: 900, color: 0xfff8e7 },
});
/** FR-057 섬광 세기 배율 (D3-08) */
export const FLASH_SCALE = Object.freeze({ strong: 1, medium: 0.6, weak: 0.25 });
const LIMITED = new Set(["FL-2", "FL-3", "FL-4"]);
const LIMIT_PER_SEC = 3;
const EDGE = 24;
const POOL = 16;

/**
 * @param {{ pixi: any, screen?: { x: number, y: number, width: number, height: number }, now?: () => number }} o
 */
export function createFlash({ pixi, screen = { x: 0, y: 0, width: 1280, height: 720 },
  now = () => performance.now() }) {
  const free = Array.from({ length: POOL }, () => new Graphics());
  /** @type {number[]} */ const recent = [];
  let level = "strong";
  let rect = { ...screen };

  /** 가장자리 발광 — 바깥에서 안으로 옅어지는 띠 4겹 (두께 24px) @param {Graphics} g */
  function edge(g, x, y, w, h, color) {
    for (let i = 0; i < 4; i += 1) {
      const d = (EDGE / 4) * i;
      g.rect(x + d, y + d, w - 2 * d, h - 2 * d).stroke({ width: EDGE / 4, color, alpha: 1 - i * 0.25, alignment: 1 });
    }
  }

  return {
    /**
     * 섬광 요청. board = BoardView(FL-1·FL-2·FL-3 — 보드 BoardFxLayer z40), FL-4는 ScreenFxLayer(z90) 화면 전체.
     * @param {keyof typeof FL} token
     * @param {{ board?: any, rows?: number[], cells?: Array<[number, number]>, color?: number, instant?: boolean,
     *   holdMs?: number, downMs?: number, peak?: number, edge?: boolean }} [o] rows·cells = FL-1 범위(보드 칸), instant =
     * 히트스톱 프레임에
     *   정점으로 바로(§2.10 "섬광 한 장면"), holdMs = 정점 유지(C-01 70ms), peak = 표 값 대신(C-04 덮개 1.0)
     * @returns {boolean} 그렸는가 (1초 3회 초과·풀 소진이면 false)
     */
    request(token, o = {}) {
      const tk = FL[token];
      if (!tk) return false;
      const t = now();
      if (LIMITED.has(token)) {
        while (recent.length && t - recent[0] >= 1000) recent.shift();
        if (recent.length >= LIMIT_PER_SEC) return false; // WCAG 2.3.1 — 4번째부터 버림
        recent.push(t);
      }
      const g = free.pop();
      if (!g) return false;
      const color = o.color ?? tk.color;
      // "약"이면 FL-3·FL-4는 가장자리 발광 — o.edge = 감소 모드 행의 "흰빛 터짐 없음(가장자리 발광)" (M-04)
      const weakEdge = (level === "weak" || !!o.edge) && (token === "FL-3" || token === "FL-4");
      g.clear();
      let parent;
      if (token === "FL-4") {
        parent = pixi.layers.screenFx;
        if (weakEdge) edge(g, rect.x, rect.y, rect.width, rect.height, color);
        else g.rect(rect.x, rect.y, rect.width, rect.height).fill(color);
      } else {
        const b = o.board;
        if (!b) {
          free.push(g);
          return false;
        }
        parent = b.layers.fx;
        const k = b.cell;
        if (token === "FL-1") {
          for (const y of o.rows ?? []) g.rect(0, y * k, b.width, k);
          for (const [x, y] of o.cells ?? []) g.rect(x * k, y * k, k, k);
          g.fill(color);
        } else if (weakEdge) {
          edge(g, -tk.pad, -tk.pad, b.width + 2 * tk.pad, b.height + 2 * tk.pad, color);
        } else {
          const pad = tk.pad ?? 0;
          g.rect(-pad, -pad, b.width + 2 * pad, b.height + 2 * pad).fill(color);
        }
      }
      const peak = (o.peak ?? tk.alpha) * FLASH_SCALE[level];
      g.alpha = o.instant ? peak : 0;
      parent.addChild(g);
      const done = () => {
        g.removeFromParent();
        free.push(g);
      };
      const down = () => pixi.animate(o.downMs ?? tk.down, (k) => { g.alpha = peak * (1 - k); }, {
        delayMs: o.holdMs ?? 0, ease: "power2.out", onComplete: done,
      });
      if (o.instant) down();
      else pixi.animate(tk.up, (k) => { g.alpha = peak * k; }, { ease: "power2.out", onComplete: down });
      return true;
    },
    /** FR-057 섬광 세기 @param {"strong" | "medium" | "weak"} l */
    setLevel(l) {
      if (FLASH_SCALE[l] !== undefined) level = l;
    },
    get level() {
      return level;
    },
    /** 화면 사각형 (layout screen) @param {{ x: number, y: number, width: number, height: number }} s */
    setScreen(s) {
      rect = { ...s };
    },
    /** 최근 1초 제한 섬광 수 (검증용) */
    get recentCount() {
      const t = now();
      return recent.filter((x) => t - x < 1000).length;
    },
  };
}
