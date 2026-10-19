// arrows.js — ProjectileLayer 투사체 비행·충돌 섬광 트윈만
// TASK-051-2 | REQ-007 REQ-013 FR-014 FR-053 | ARCH-005 | design-vision §2.8 z70·§4.6.3 A-01·A-02·A-04·A-07·§4.6.7 H-01
// 빛의 화살(길이 64·두께 10 + 공격력 1당 2, 최대 18)·물맷돌·가운데 충돌 고리. 텍스처는 시작 시 3벌 굽고 스프라이트는 풀에서 재사용.
// 예수님 이벤트 중인 보드로 오는 화살은 그리지 않는다(holy.isShielded — C-002, §2.13.5). 시간은 pixi.animate(히트스톱에 멈춤).
import { Container, FillGradient, Graphics, Rectangle, Sprite } from "pixi.js";
import { GLW } from "../render/filters.js";

const LEN = 64;
const THICK_MAX = 18;
const POOL = 24;
/** 화살 색 3벌: 금(내 공격) · 어둠(받는 공격 #8E2A5A→#E5484D) · 되돌림(#7FD3FF + 검 모양 꼬리) */
const PALETTE = {
  gold: ["#F6D98B", "#FFFFFF"],
  dark: ["#8E2A5A", "#E5484D"],
  reflect: ["#7FD3FF", "#FFFFFF"],
};

/** 끝이 뾰족한 빛창 (가로 = 진행 방향, 단면 가운데 밝고 가장자리 색) */
function spear(edge, core, sword) {
  const g = new Graphics();
  const h = THICK_MAX;
  const fill = new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: h }, textureSpace: "global",
    colorStops: [{ offset: 0, color: edge }, { offset: 0.5, color: core }, { offset: 1, color: edge }] });
  g.poly([0, h * 0.35, LEN - 18, h * 0.3, LEN, h / 2, LEN - 18, h * 0.7, 0, h * 0.65]).fill(fill);
  if (sword) g.rect(4, h * 0.15, 4, h * 0.7).fill(edge); // 검 모양 꼬리 (자루 가로대)
  return g;
}

/** @param {{ pixi: any, particles: any, filters: any, holy?: any }} deps */
export function createArrows({ pixi, particles, filters, holy }) {
  const layer = new Container({ label: "projectiles" });
  pixi.layers.projectile.addChild(layer);
  // GLW-gold — 컨테이너 1개에 필터 1개 (화살마다 필터 0, §4.9)
  let glow = filters.glow(layer, GLW.gold);
  /** @type {Record<string, any>} */ const tex = {};
  for (const [k, [edge, core]] of Object.entries(PALETTE)) {
    const g = spear(edge, core, k === "reflect");
    tex[k] = pixi.renderer.generateTexture({ target: g, frame: new Rectangle(0, 0, LEN, THICK_MAX), resolution: 2 });
    g.destroy();
  }
  const free = Array.from({ length: POOL }, () => {
    const s = new Sprite();
    s.anchor.set(1, 0.5); // 촉 끝 = 위치
    return s;
  });
  let reduced = false;

  /** 2차 베지어 점·접선 */
  const bez = (a, c, b, t) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
    y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });

  /**
   * 화살 비행 (A-01 발사·A-02 받음·A-07 되돌림·A-04 충돌 구간)
   * @param {{ from: {x:number,y:number}, to: {x:number,y:number}, count: number, power?: number,
   *   palette?: "gold" | "dark" | "reflect", durationMs?: number, ease?: string, staggerMs?: number, lift?: number,
   *   toSide?: "me" | "opp", onArrive?: (i: number) => void }} o
   * @returns {boolean} 그렸는가 (받는 보드가 예수님 이벤트 중이면 false — 도착 콜백은 그대로 호출하지 않음)
   */
  function fly(o) {
    if (o.toSide && holy?.isShielded(o.toSide)) return false;
    const n = Math.max(1, Math.min(6, o.count)); // 화살 수 = min(garbage, 6)
    const thick = Math.min(THICK_MAX, 10 + 2 * Math.max(0, (o.power ?? 1) - 1)) / THICK_MAX;
    const lift = o.lift ?? 120;
    const c = { x: (o.from.x + o.to.x) / 2, y: (o.from.y + o.to.y) / 2 - lift }; // 정점 = 가운데에서 120px 위
    for (let i = 0; i < n; i += 1) {
      const s = free.pop();
      if (!s) break;
      s.texture = tex[o.palette ?? "gold"];
      s.scale.set(1, thick);
      s.visible = false;
      layer.addChild(s);
      pixi.animate(o.durationMs ?? 320, (k) => {
        const p = bez(o.from, c, o.to, k);
        const q = bez(o.from, c, o.to, Math.min(1, k + 0.02));
        s.visible = true;
        s.position.set(p.x, p.y);
        s.rotation = Math.atan2(q.y - p.y, q.x - p.x);
        // 꼬리 PT-spark 프레임당 3 (감소 모드 ×0.5 — particles가 장식 개수를 줄임)
        particles.emit("PT-spark", { x: p.x, y: p.y, count: 3, dir: s.rotation + Math.PI, spread: 0.6,
          color: o.palette === "dark" ? 0xe5484d : o.palette === "reflect" ? 0x7fd3ff : undefined });
      }, {
        ease: o.ease ?? "power2.in", delayMs: i * (o.staggerMs ?? 40),
        onComplete: () => {
          s.removeFromParent();
          free.push(s);
          o.onArrive?.(i);
        },
      });
    }
    return true;
  }

  /** A-04 빛 고리 확산 (반지름 0→90, 투명도 1→0, 300ms expo.out) @param {{x:number,y:number}} p */
  function ring(p, maxR = 90, color = 0xfff8e7) {
    const g = new Graphics();
    layer.addChild(g);
    pixi.animate(300, (k) => {
      g.clear().circle(p.x, p.y, Math.max(1, maxR * k)).stroke({ width: 4, color, alpha: 1 - k });
    }, { ease: "expo.out", onComplete: () => g.destroy() });
  }

  /**
   * H-01 다윗 물맷돌: 엠블럼 둘레 금 고리 궤적 2바퀴(300ms) → 돌(반지름 6, #A9B4C4, 움직임 흐림) 360ms ease.slam → onHit
   * @param {{ from: {x:number,y:number}, to: {x:number,y:number}, radius?: number, onHit?: () => void,
   *   toSide?: "me" | "opp" }} o
   */
  function sling(o) {
    const r = o.radius ?? 40;
    const swing = new Graphics();
    layer.addChild(swing);
    pixi.animate(300, (k) => {
      const a = k * 4 * Math.PI;
      swing.clear().arc(o.from.x, o.from.y, r, a - 1.2, a).stroke({ width: 3, color: 0xe8b84a, alpha: 0.9 });
    }, {
      ease: "none",
      onComplete: () => {
        swing.destroy();
        if (o.toSide && holy?.isShielded(o.toSide)) return o.onHit?.();
        const stone = new Graphics();
        layer.addChild(stone);
        let prev = { ...o.from };
        pixi.animate(360, (k) => {
          const p = { x: o.from.x + (o.to.x - o.from.x) * k, y: o.from.y + (o.to.y - o.from.y) * k };
          stone.clear();
          // 움직임 흐림: 이전 위치 쪽으로 옅은 원 3개 (감소 모드 없음 — 흐림만)
          for (let j = 3; j >= 1; j -= 1) {
            stone.circle(p.x + ((prev.x - p.x) * j) / 3, p.y + ((prev.y - p.y) * j) / 3, 6).fill({ color: 0xa9b4c4,
              alpha: reduced ? 0 : 0.15 * (4 - j) });
          }
          stone.circle(p.x, p.y, 6).fill(0xa9b4c4);
          prev = p;
        }, { ease: "power4.in", onComplete: () => { stone.destroy(); o.onHit?.(); } });
      },
    });
  }

  return {
    fly, ring, sling,
    /** 금 간 선 4개 (H-01 충돌 지점) — 400ms 뒤 사라짐 @param {{x:number,y:number}} p */
    cracks(p) {
      const g = new Graphics();
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + Math.random() * 0.6;
        const l = 14 + Math.random() * 12;
        g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
      }
      g.stroke({ width: 2, color: 0xf6d98b });
      layer.addChild(g);
      pixi.animate(300, (k) => { g.alpha = 1 - k; }, { delayMs: 400, onComplete: () => g.destroy() });
    },
    /** §6.3 감소 모드 @param {boolean} on */
    setReduced(on) {
      reduced = on;
    },
    /** §4.9 가벼운 그리기: Glow는 구운 텍스처만 — filters.setLight가 장식 Glow를 떼므로 복귀 때 다시 붙임 @param {boolean} on */
    setLight(on) {
      if (!on && !glow) glow = filters.glow(layer, GLW.gold);
      if (on) glow = null;
    },
    get freeCount() {
      return free.length;
    },
    destroy() {
      glow?.release();
      layer.destroy({ children: true });
      for (const t of Object.values(tex)) t.destroy(true);
    },
  };
}
