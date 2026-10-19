// shake.js — 화면 흔들림 요청 합성·적용만 (흔들림 끄기 반영)
// TASK-051-1 | REQ-013 FR-051 FR-052 FR-057 FR-061 | ARCH-005 | design-vision §2.10 SHK·§4.8 흔들림 합성·§6.3
// 대상 "보드" = BoardView.root, "화면" = pixi.screenRoot(+DOM 오버레이 루트 같은 값). 25ms마다 무작위 오프셋, 진폭 (1 − t/길이)².
// 회전은 대상 가운데 기준. 시간은 Pixi 틱 dtMs — 히트스톱 동안 함께 멈춘다. 흔들림 끔(FR-057)이면 모든 SHK = 0.

/** §2.10 SHK 토큰 — amp px · len ms · rot ° · hz(SHK-5 18Hz 저주파, 나머지 25ms 간격) */
export const SHK = Object.freeze({
  "SHK-1": { amp: 2, len: 80, rot: 0, target: "board" },
  "SHK-2": { amp: 4, len: 140, rot: 0, target: "board" },
  "SHK-3": { amp: 7, len: 220, rot: 0.3, target: "board" },
  "SHK-4": { amp: 12, len: 360, rot: 0.5, target: "screen" },
  "SHK-5": { amp: 18, len: 700, rot: 0.8, target: "screen", hz: 18 },
});
const STEP_MS = 25;
const DEG = Math.PI / 180;

/**
 * @param {{ pixi: any, domRoot?: HTMLElement | null, screen?: { width: number, height: number },
 *   scale?: () => number }} o domRoot = 대전 DOM 오버레이 루트, scale = 레터박스 배율(layout.current.scale)
 */
export function createShake({ pixi, domRoot = null, screen = { width: 1280, height: 720 }, scale = () => 1 }) {
  /** @type {Map<any, any>} */ const live = new Map();
  let enabled = true;
  let virt = { ...screen };

  /** 대상 정보 — 보드는 geometry 원점, 화면은 (0,0). 가운데 = 회전 피벗 @param {"screen" | any} target */
  function describe(target) {
    if (target === "screen") {
      return { node: pixi.screenRoot, base: { x: 0, y: 0 }, center: { x: virt.width / 2, y: virt.height / 2 },
        dom: true };
    }
    const r = target.rect();
    return { node: target.root, base: { x: r.x, y: r.y }, center: { x: r.width / 2, y: r.height / 2 }, dom: false };
  }

  /** @param {any} s @param {number} ox @param {number} oy @param {number} rot */
  function apply(s, ox, oy, rot) {
    const n = s.node;
    if (!n || n.destroyed) return;
    n.pivot.set(rot ? s.center.x : 0, rot ? s.center.y : 0);
    n.position.set(s.base.x + ox + (rot ? s.center.x : 0), s.base.y + oy + (rot ? s.center.y : 0));
    n.rotation = rot;
    if (s.dom && domRoot) {
      // CSS translate·rotate는 layout의 transform(배율·원점)보다 바깥 — 화면 px로 같은 흔들림 (회전은 가상 가운데 기준)
      const k = scale();
      const st = domRoot.style;
      if (!ox && !oy && !rot) {
        st.translate = "";
        st.rotate = "";
        return;
      }
      const m = new DOMMatrix(getComputedStyle(domRoot).transform === "none" ? undefined
        : getComputedStyle(domRoot).transform);
      const p = m.transformPoint(new DOMPoint(s.center.x, s.center.y));
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      st.translate = `${ox * k + p.x - (c * p.x - sn * p.y)}px ${oy * k + p.y - (sn * p.x + c * p.y)}px`;
      st.rotate = `${rot}rad`;
    }
  }

  return {
    /**
     * SHK 요청 — 같은 대상이 흔들리는 중이면 진폭은 큰 값, 길이는 남은 시간이 긴 값 (§4.8)
     * @param {keyof typeof SHK} token @param {"screen" | any} [target] 기본 = 토큰의 대상(보드는 호출자가 BoardView를 넘김)
     * @param {{ firstDown?: number }} [o] firstDown = 첫 오프셋 아래 +px (J-05 "+4px")
     */
    request(token, target, o = {}) {
      const tk = SHK[token];
      if (!enabled || !tk) return false;
      const t = target ?? (tk.target === "screen" ? "screen" : null);
      if (!t) return false;
      const cur = live.get(t);
      if (cur) {
        cur.amp = Math.max(cur.amp, tk.amp);
        cur.rot = Math.max(cur.rot, tk.rot);
        if (tk.len > cur.len - cur.t) Object.assign(cur, { len: tk.len, t: 0 });
        if (tk.hz) cur.step = 1000 / tk.hz;
        return true;
      }
      const s = { ...describe(t), amp: tk.amp, len: tk.len, rot: tk.rot, t: 0, acc: Infinity,
        step: tk.hz ? 1000 / tk.hz : STEP_MS, firstDown: o.firstDown ?? 0 };
      live.set(t, s);
      return true;
    },
    /** @param {number} dtMs Pixi 틱 */
    update(dtMs) {
      for (const [key, s] of live) {
        s.t += dtMs;
        if (s.t >= s.len) {
          apply(s, 0, 0, 0);
          live.delete(key);
          continue;
        }
        s.acc += dtMs;
        if (s.acc < s.step) continue;
        s.acc = 0;
        const k = (1 - s.t / s.len) ** 2;
        const oy = s.firstDown ? s.firstDown : (Math.random() * 2 - 1) * s.amp * k;
        s.firstDown = 0;
        apply(s, (Math.random() * 2 - 1) * s.amp * k, oy, (Math.random() * 2 - 1) * s.rot * k * DEG);
      }
    },
    /** FR-057 흔들림 켜기/끄기 — 끄면 진행 중인 흔들림도 즉시 원위치 @param {boolean} on */
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) this.stopAll();
    },
    get enabled() {
      return enabled;
    },
    /** 가상 해상도 (layout 배치 변경 시) @param {{ width: number, height: number }} v */
    setScreen(v) {
      virt = { width: v.width, height: v.height };
    },
    stopAll() {
      for (const s of live.values()) apply(s, 0, 0, 0);
      live.clear();
    },
    get activeCount() {
      return live.size;
    },
  };
}
