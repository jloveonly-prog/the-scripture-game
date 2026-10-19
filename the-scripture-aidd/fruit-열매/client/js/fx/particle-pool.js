// TASK-041-1 · FR-051 · FR-052 · NFR-001 · D-26 — 파티클 풀: 512(데스크톱)/256(모바일) 객체 재사용, 동시 표시 상한 400/200 (design-vision §2.7).
// 상한을 넘으면 가장 오래된 파티클부터 재활용한다. 화면 객체(Pixi Sprite)는 createSprite 주입 — 풀 자체는 Pixi 없이 테스트된다.

/** design-vision §2.7 · §4.12 풀 크기와 동시 표시 상한 */
export const POOL_SIZES = Object.freeze({
  desktop: Object.freeze({ capacity: 512, maxActive: 400 }),
  mobile: Object.freeze({ capacity: 256, maxActive: 200 }),
});

// D-26 기기 종류별 풀 크기 (모바일 = 화면 짧은 변 < 768px 또는 터치 전용)
export function poolSizeFor(isMobile) {
  return isMobile ? POOL_SIZES.mobile : POOL_SIZES.desktop;
}

function blankParticle(id) {
  return {
    id, active: false, sprite: null, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0,
    fromX: 0, fromY: 0, toX: null, toY: null, age: 0, lifeMs: 0, delayMs: 0,
    alpha0: 1, alpha1: 0, scale0: 1, scale1: 1, rotation: 0, vr: 0, color: 0xffffff, alpha: 1, scale: 1, texture: null,
  };
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

// D-26 · NFR-001 파티클 풀 생성
export function createParticlePool({ capacity, maxActive, createSprite = null } = POOL_SIZES.desktop) {
  if (!(capacity > 0) || !(maxActive > 0) || maxActive > capacity) throw new RangeError('particle-pool: capacity ≥ maxActive > 0 이어야 합니다');
  const all = [];
  const baseTextures = new Map();
  const free = [];
  const active = [];
  for (let i = 0; i < capacity; i += 1) {
    const p = blankParticle(i);
    if (createSprite) {
      p.sprite = createSprite();
      p.sprite.visible = false;
      baseTextures.set(p.id, p.sprite.texture);
    }
    all.push(p);
    free.push(p);
  }

  function release(p) {
    p.active = false;
    if (p.sprite) p.sprite.visible = false;
  }

  function sync(p) {
    if (!p.sprite) return;
    const s = p.sprite;
    s.visible = p.delayMs <= 0;
    s.x = p.x;
    s.y = p.y;
    s.alpha = p.alpha;
    s.rotation = p.rotation;
    s.tint = p.color;
    const tex = p.texture ?? baseTextures.get(p.id);
    if (tex && s.texture !== tex) s.texture = tex;
    if (s.scale && typeof s.scale.set === 'function') s.scale.set(p.scale);
  }

  return {
    capacity,
    maxActive,
    /** 파티클 1개 꺼내기 — 상한 도달 시 가장 오래된 활성 파티클을 재활용 */
    spawn(opts = {}) {
      let p;
      if (active.length >= maxActive || free.length === 0) {
        p = active.shift();
        release(p);
      } else {
        p = free.pop();
      }
      const sprite = p.sprite;
      Object.assign(p, blankParticle(p.id), opts, { sprite, active: true, age: 0 });
      p.fromX = p.x;
      p.fromY = p.y;
      p.alpha = p.alpha0;
      p.scale = p.scale0;
      active.push(p);
      sync(p);
      return p;
    },
    /** 한 프레임 진행. frozen(히트스톱) 중에는 생성만 되고 움직이지 않는다 (design-vision §2.8) */
    update(dtMs, frozen = false) {
      if (frozen || !(dtMs > 0)) return;
      const dt = dtMs / 1000;
      for (let i = active.length - 1; i >= 0; i -= 1) {
        const p = active[i];
        if (p.delayMs > 0) {
          p.delayMs -= dtMs;
          sync(p);
          continue;
        }
        p.age += dtMs;
        const t = Math.min(1, p.age / p.lifeMs);
        if (p.toX !== null && p.toY !== null) {
          const k = easeInOut(t);
          p.x = p.fromX + (p.toX - p.fromX) * k;
          p.y = p.fromY + (p.toY - p.fromY) * k;
        } else {
          p.vx += p.ax * dt;
          p.vy += p.ay * dt;
          if (p.drag > 0) {
            const f = Math.max(0, 1 - p.drag * dt);
            p.vx *= f;
            p.vy *= f;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        p.rotation += p.vr * dt;
        p.alpha = p.alpha0 + (p.alpha1 - p.alpha0) * t;
        p.scale = p.scale0 + (p.scale1 - p.scale0) * t;
        if (t >= 1) {
          active.splice(i, 1);
          release(p);
          free.push(p);
        } else {
          sync(p);
        }
      }
    },
    activeCount() {
      return active.length;
    },
    /** 모든 활성 파티클 회수 (라운드 전환·장면 파괴) */
    clear() {
      while (active.length) {
        const p = active.pop();
        release(p);
        free.push(p);
      }
    },
    /** 장면 파괴 시 화면 객체 정리용 */
    sprites() {
      return all.map((p) => p.sprite).filter(Boolean);
    },
  };
}

// FR-052 폭발형 분출 도우미 — 중심에서 사방(또는 spread 각도 안)으로 count개
export function burst(pool, { x, y, count, color = 0xffffff, speed = 240, lifeMs = 450, gravity = 520, spread = Math.PI * 2,
  angle = -Math.PI / 2, size = 1, rand = Math.random, width = 0, height = 0, texture = null }) {
  for (let i = 0; i < count; i += 1) {
    const a = angle - spread / 2 + rand() * spread;
    const v = speed * (0.4 + rand() * 0.6);
    pool.spawn({
      x: x + (rand() - 0.5) * width, y: y + (rand() - 0.5) * height, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: gravity,
      lifeMs: lifeMs * (0.7 + rand() * 0.3), color, scale0: size, scale1: size * 0.4, alpha0: 1, alpha1: 0, vr: (rand() - 0.5) * 12, texture,
    });
  }
}
