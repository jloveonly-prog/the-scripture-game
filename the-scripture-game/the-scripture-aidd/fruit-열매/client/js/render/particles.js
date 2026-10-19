// particles.js — 파티클 풀·프리셋(PT-*) 방출만
// TASK-042 | REQ-013 FR-052 FR-053 FR-054 FR-056 NFR-001 | ARCH-004 | D-13 | design-vision §2.10 PT·§4.9 | RTM §5
// DCL-007 ①③
// 풀 최대 600(가벼운 그리기 300 — quality.js) = 일반·가산(PT-spark) ParticleContainer 2개의 합. 오브젝트 재사용(NFR-001).
// 회수 우선순위(§2.10): ③ 장식 → ② 삭제 파편 → ① 게임 정보(악한 영 가림 — 파리·메뚜기)는 회수하지 않는다(D3-09).
import { Graphics, Particle, ParticleContainer, Rectangle, Texture } from "pixi.js";

/** §2.10 회수 등급 — 1 게임 정보 · 2 삭제 파편 · 3 장식 */
const INFO = 1;
const SHARD = 2;
const DECO = 3;

const rnd = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * §2.10 PT 토큰 표 (개수·수명·속도·크기·색 원문 그대로). tex = 아틀라스 칸, size = 아틀라스 칸의 기준 px.
 * count는 호출자가 바꿀 수 있다(PT-shard "지운 칸마다 4", PT-fly `spirits.beelzebub.params.particles`).
 */
export const PT = Object.freeze({
  "PT-dust": { cat: DECO, count: 6, life: [220, 220], speed: [40, 90], size: [2, 3], tex: "dot", a: [1, 0] },
  "PT-shard": { cat: SHARD, count: 4, life: [520, 760], speed: [180, 420], size: [4, 8], tex: "square", a: [1, 0.2],
    gravity: 900, spin: 720 },
  "PT-spark": { cat: DECO, count: 12, life: [400, 400], speed: [120, 300], size: [6, 6], tex: "streak", a: [1, 0],
    color: 0xf6d98b, color2: 0xe8b84a, add: true },
  "PT-smoke": { cat: DECO, count: 30, life: [1400, 2000], speed: [20, 40], size: [24, 48], tex: "soft", a: [0.5, 0],
    grow: 1.6, color: 0x1a1424, up: true },
  "PT-feather": { cat: DECO, count: 18, life: [1600, 1600], speed: [30, 30], size: [14, 14], tex: "feather", a: [1, 0],
    color: 0xfff8e7, sway: 12, swayHz: 0.8 },
  "PT-ember": { cat: DECO, count: 20, life: [900, 900], speed: [60, 120], size: [3, 3], tex: "dot", a: [1, 0],
    color: 0xffb347, color2: 0xff8a3d, up: true },
  "PT-flake": { cat: DECO, count: 24, life: [1000, 1000], speed: [80, 80], size: [3, 3], tex: "dot", a: [1, 0.3],
    color: 0xfff8e7, homing: true },
  "PT-fly": { cat: INFO, count: 240, life: [Infinity, Infinity], speed: [60, 140], size: [2, 3], tex: "dot", a: [0.9,
    0.9],
    color: 0x120c18, brownian: true },
  "PT-locust": { cat: INFO, count: 30, life: [900, 900], speed: [0, 0], size: [6, 6], tex: "chevron", a: [1, 1],
    color: 0x2b2416, homing: true },
});

/** 아틀라스 칸 (흰색 — tint로 색칠) [x, y, w, h] */
const CELLS = { square: [0, 0, 8, 8], dot: [10, 0, 6, 6], streak: [18, 0, 12, 4], chevron: [32, 0, 8, 6],
  feather: [42, 0, 8, 16], soft: [52, 0, 48, 48] };

/** 시작 시 아틀라스 1장 굽기 (한 컨테이너 = 한 텍스처 원천 — DCL-007 ③) */
function bakeAtlas(renderer) {
  const g = new Graphics();
  g.rect(0, 0, 8, 8).fill(0xffffff);
  g.circle(13, 3, 3).fill(0xffffff);
  // PT-spark 2px 점 + 4px 꼬리
  g.rect(18, 1.5, 6, 1).fill({ color: 0xffffff, alpha: 0.35 }).rect(24, 1, 3, 2).fill({ color: 0xffffff, alpha: 0.7 });
  g.circle(28.5, 2, 1.5).fill(0xffffff);
  g.poly([32, 0, 36, 4, 40, 0, 40, 2, 36, 6, 32, 2]).fill(0xffffff);
  g.ellipse(46, 8, 3, 7).fill(0xffffff).moveTo(46, 1).lineTo(46, 15).stroke({ width: 0.8, color: 0xd8d0c0 });
  for (let i = 12; i >= 1; i -= 1) g.circle(76, 24, 2 * i).fill({ color: 0xffffff, alpha: 0.09 });
  const atlas = renderer.generateTexture({ target: g, frame: new Rectangle(0, 0, 100, 48), resolution: 2 });
  g.destroy();
  const tex = {};
  for (const [k, [x, y, w, h]] of Object.entries(CELLS)) {
    tex[k] = new Texture({ source: atlas.source, frame: new Rectangle(x, y, w, h) });
  }
  return { atlas, tex };
}

/**
 * @param {{ renderer: any, layer: import("pixi.js").Container, poolSize?: number }} o poolSize = 600 (D-13)
 */
export function createParticles({ renderer, layer, poolSize = 600 }) {
  const { atlas, tex } = bakeAtlas(renderer);
  const dynamicProperties = { position: true, rotation: true, color: true, vertex: true, uvs: true };
  const normal = new ParticleContainer({ texture: atlas, dynamicProperties, label: "particles" });
  const additive = new ParticleContainer({ texture: atlas, dynamicProperties, label: "particles-add" });
  additive.blendMode = "add";
  layer.addChild(normal, additive);

  /** @type {any[]} */ const free = [];
  for (let i = 0; i < poolSize; i += 1) free.push({ p: new Particle({ texture: tex.dot }) });
  /** @type {any[]} */ const active = [];
  let limit = poolSize;
  let reduced = false;
  let dirty = false;

  /** 풀이 차면 우선순위가 낮은 것(장식 → 파편)부터 가장 오래된 것을 회수 @param {number} cat */
  function steal(cat) {
    for (let c = DECO; c >= cat && c > INFO; c -= 1) {
      let victim = -1;
      for (let i = 0; i < active.length; i += 1) {
        const older = victim >= 0 && active[i].age / active[i].life > active[victim].age / active[victim].life;
        if (active[i].cat === c && (victim < 0 || older)) {
          victim = i;
        }
      }
      if (victim >= 0) return kill(victim);
    }
    return null;
  }

  /** @param {number} i */
  function kill(i) {
    const r = active[i];
    active[i] = active[active.length - 1];
    active.pop();
    free.push(r);
    dirty = true;
    return r;
  }

  /**
   * PT 방출. 감소 모드(§2.10): ②③ 개수 ×0.5, ① 개수 유지·속도 ×0.5.
   * @param {keyof typeof PT} token
   * @param {{ x: number, y: number, count?: number, color?: number, dir?: number, spread?: number,
   *   target?: { x: number, y: number }, bounds?: { x: number, y: number, width: number, height: number },
   *   life?: number, area?: { w: number, h: number } }} o dir·spread = 라디안(기본 전방위), area = 방출 사각형
   * @returns {{ release: () => void }} 수명이 무한한 무리(PT-fly)를 효과 종료 때 거둔다
   */
  function emit(token, o) {
    const pre = PT[token];
    if (!pre) throw new Error(`알 수 없는 파티클 ${token}`);
    let n = o.count ?? pre.count;
    if (reduced && pre.cat !== INFO) n = Math.ceil(n * 0.5);
    const speedK = reduced && pre.cat === INFO ? 0.5 : 1;
    const group = { alive: true };
    for (let k = 0; k < n; k += 1) {
      let r = active.length < limit ? free.pop() : null;
      if (!r) r = steal(pre.cat);
      if (!r) break;
      // PT-fly 수명 = 효과 시간(무한 — release()로 거둠). rnd(∞, ∞)는 NaN이므로 따로
      const life = o.life ?? (pre.life[0] === Infinity ? Infinity : rnd(pre.life[0], pre.life[1]));
      const dir = o.dir !== undefined ? o.dir + rnd(-(o.spread ?? 0) / 2, (o.spread ?? 0) / 2) : rnd(0, Math.PI * 2);
      const sp = rnd(pre.speed[0], pre.speed[1]) * speedK;
      const size = rnd(pre.size[0], pre.size[1]);
      const cellW = CELLS[pre.tex][2];
      const x = o.x + (o.area ? rnd(-o.area.w / 2, o.area.w / 2) : 0);
      const y = o.y + (o.area ? rnd(-o.area.h / 2, o.area.h / 2) : 0);
      Object.assign(r, {
        cat: pre.cat, pre, group, age: 0, life, x0: x, y0: y,
        vx: pre.up ? rnd(-8, 8) : Math.cos(dir) * sp, vy: pre.up ? -sp : Math.sin(dir) * sp,
        vr: pre.spin ? rnd(-pre.spin, pre.spin) * (Math.PI / 180) : 0, s0: size / cellW, speed: sp,
        c0: o.color ?? pre.color ?? 0xffffff, c1: pre.color2 ?? null, target: o.target ?? null,
          bounds: o.bounds ?? null,
        add: !!pre.add, phase: rnd(0, Math.PI * 2), speedK,
      });
      if (pre.homing && r.target) {
        // PT-flake 게이지 쪽으로 휘어짐 · PT-locust 목표 칸으로 유도 — 2차 베지어 제어점
        r.cx = (x + r.target.x) / 2 + rnd(-40, 40);
        r.cy = Math.min(y, r.target.y) - rnd(40, 120);
      }
      const p = r.p;
      p.texture = tex[pre.tex];
      p.anchorX = 0.5;
      p.anchorY = 0.5;
      p.x = x;
      p.y = y;
      p.rotation = pre.tex === "streak" ? Math.atan2(r.vy, r.vx) : rnd(0, Math.PI * 2) * (pre.spin ? 1 : 0);
      p.scaleX = r.s0;
      p.scaleY = r.s0;
      p.tint = r.c0;
      p.alpha = pre.a[0];
      active.push(r);
      dirty = true;
    }
    return {
      release() {
        group.alive = false;
      },
    };
  }

  /** 프레임 갱신 (Pixi 틱 dtMs — 히트스톱이면 0) @param {number} dtMs */
  function update(dtMs) {
    if (dtMs <= 0 && !dirty) return;
    const dt = dtMs / 1000;
    for (let i = active.length - 1; i >= 0; i -= 1) {
      const r = active[i];
      r.age += dtMs;
      if (r.age >= r.life || !r.group.alive) {
        kill(i);
        continue;
      }
      const t = r.life === Infinity ? 0 : r.age / r.life;
      const p = r.p;
      const pre = r.pre;
      if (pre.brownian && r.bounds) {
        // PT-fly 브라운 운동, 보드 안에서 튕김 (속도 60~140px/s)
        r.vx += rnd(-1, 1) * 900 * dt;
        r.vy += rnd(-1, 1) * 900 * dt;
        const v = Math.hypot(r.vx, r.vy) || 1;
        const cl = Math.min(Math.max(v, pre.speed[0] * r.speedK), pre.speed[1] * r.speedK) / v;
        r.vx *= cl;
        r.vy *= cl;
        p.x += r.vx * dt;
        p.y += r.vy * dt;
        const b = r.bounds;
        if (p.x < b.x || p.x > b.x + b.width) r.vx = -r.vx;
        if (p.y < b.y || p.y > b.y + b.height) r.vy = -r.vy;
        p.x = Math.min(Math.max(p.x, b.x), b.x + b.width);
        p.y = Math.min(Math.max(p.y, b.y), b.y + b.height);
      } else if (pre.homing && r.target) {
        const u = 1 - t;
        p.x = u * u * r.x0 + 2 * u * t * r.cx + t * t * r.target.x;
        p.y = u * u * r.y0 + 2 * u * t * r.cy + t * t * r.target.y;
        if (pre.tex === "chevron") p.rotation = Math.atan2(r.target.y - p.y, r.target.x - p.x) - Math.PI / 2;
      } else if (pre.sway) {
        // PT-feather 아래로 30px/s + 좌우 ±12px 0.8Hz
        p.y = r.y0 + r.speed * (r.age / 1000);
        p.x = r.x0 + pre.sway * Math.sin(r.phase + 2 * Math.PI * pre.swayHz * (r.age / 1000));
        p.rotation = 0.3 * Math.sin(r.phase + 2 * Math.PI * pre.swayHz * (r.age / 1000));
      } else {
        if (pre.gravity) r.vy += pre.gravity * dt;
        p.x += r.vx * dt;
        p.y += r.vy * dt;
        p.rotation += r.vr * dt;
      }
      p.alpha = lerp(pre.a[0], pre.a[1], t);
      if (pre.grow) {
        const s = r.s0 * lerp(1, pre.grow, t);
        p.scaleX = s;
        p.scaleY = s;
      }
      if (r.c1 !== null) p.tint = mix(r.c0, r.c1, t);
    }
    if (dirty) {
      normal.particleChildren = active.filter((r) => !r.add).map((r) => r.p);
      additive.particleChildren = active.filter((r) => r.add).map((r) => r.p);
      normal.update();
      additive.update();
      dirty = false;
    }
  }

  return {
    emit,
    update,
    /** NFR-001 §4.9 가벼운 그리기: 풀 300 / 복귀 600 @param {number} n */
    setLimit(n) {
      limit = Math.min(n, poolSize);
      while (active.length > limit) {
        if (!steal(INFO + 1)) break;
      }
    },
    /** §6.3 감소 모드 @param {boolean} on */
    setReduced(on) {
      reduced = on;
    },
    get activeCount() {
      return active.length;
    },
    destroy() {
      normal.destroy();
      additive.destroy();
      atlas.destroy(true);
    },
  };
}

/** 색 보간 (PT-spark #F6D98B→#E8B84A, PT-ember #FFB347→#FF8A3D) */
function mix(a, b, t) {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return (r << 16) | (g << 8) | bl;
}
