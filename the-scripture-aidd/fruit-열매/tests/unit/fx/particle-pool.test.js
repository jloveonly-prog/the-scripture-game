// TASK-041-4 · FR-075 · NFR-001 · D-26 — 파티클 풀: 크기·동시 상한·가장 오래된 것부터 재활용·객체 재사용·히트스톱 중 정지.
import { describe, it, expect } from 'vitest';
import { POOL_SIZES, poolSizeFor, createParticlePool, burst } from '../../../client/js/fx/particle-pool.js';

const fakeSprite = () => ({ visible: true, x: 0, y: 0, alpha: 1, rotation: 0, tint: 0, texture: 'dot', scale: { v: 1, set(v) { this.v = v; } } });

describe('particle-pool (design-vision §2.7)', () => {
  it('데스크톱 512/400, 모바일 256/200', () => {
    expect(POOL_SIZES.desktop).toEqual({ capacity: 512, maxActive: 400 });
    expect(POOL_SIZES.mobile).toEqual({ capacity: 256, maxActive: 200 });
    expect(poolSizeFor(true)).toBe(POOL_SIZES.mobile);
    expect(poolSizeFor(false)).toBe(POOL_SIZES.desktop);
  });

  it('잘못된 크기는 RangeError', () => {
    expect(() => createParticlePool({ capacity: 10, maxActive: 20 })).toThrow(RangeError);
    expect(() => createParticlePool({ capacity: 0, maxActive: 0 })).toThrow(RangeError);
  });

  it('화면 객체는 생성 시에만 만든다 (capacity개, 이후 재사용)', () => {
    let made = 0;
    const pool = createParticlePool({ capacity: 8, maxActive: 6, createSprite: () => { made += 1; return fakeSprite(); } });
    expect(made).toBe(8);
    for (let i = 0; i < 50; i += 1) pool.spawn({ lifeMs: 100 });
    expect(made).toBe(8);
    expect(pool.sprites()).toHaveLength(8);
  });

  it('동시 표시 상한을 넘으면 가장 오래된 파티클부터 재활용', () => {
    const pool = createParticlePool({ capacity: 5, maxActive: 3 });
    const a = pool.spawn({ lifeMs: 1000, x: 1 });
    const b = pool.spawn({ lifeMs: 1000, x: 2 });
    const c = pool.spawn({ lifeMs: 1000, x: 3 });
    const d = pool.spawn({ lifeMs: 1000, x: 4 });
    expect(pool.activeCount()).toBe(3);
    expect(d).toBe(a);
    expect(d.x).toBe(4);
    const e = pool.spawn({ lifeMs: 1000, x: 5 });
    expect(e).toBe(b);
    expect([c.active, d.active, e.active]).toEqual([true, true, true]);
  });

  it('수명이 끝나면 회수되어 다시 쓰인다', () => {
    const pool = createParticlePool({ capacity: 4, maxActive: 4 });
    const p = pool.spawn({ lifeMs: 100, vx: 100 });
    pool.update(50);
    expect(p.x).toBeCloseTo(5);
    expect(p.alpha).toBeCloseTo(0.5);
    pool.update(60);
    expect(pool.activeCount()).toBe(0);
    expect(p.active).toBe(false);
    const q = pool.spawn({ lifeMs: 100 });
    expect(q).toBe(p);
    expect(q.age).toBe(0);
    expect(q.vx).toBe(0);
  });

  it('히트스톱(frozen) 중에는 생성만 되고 움직이지 않는다', () => {
    const pool = createParticlePool({ capacity: 4, maxActive: 4 });
    const p = pool.spawn({ lifeMs: 100, vx: 100 });
    pool.update(50, true);
    expect(p.x).toBe(0);
    expect(p.age).toBe(0);
    pool.update(50, false);
    expect(p.x).toBeCloseTo(5);
  });

  it('목표 지점 비행(toX/toY)은 수명 끝에 목표에 닿는다', () => {
    const pool = createParticlePool({ capacity: 2, maxActive: 2 });
    const p = pool.spawn({ x: 0, y: 0, toX: 100, toY: 50, lifeMs: 200, alpha1: 1 });
    pool.update(100);
    expect(p.x).toBeCloseTo(50);
    pool.update(99);
    expect(p.x).toBeGreaterThan(99);
    expect(p.y).toBeGreaterThan(49);
  });

  it('지연(delayMs) 동안 화면 객체를 숨기고 이후 보인다', () => {
    const pool = createParticlePool({ capacity: 2, maxActive: 2, createSprite: fakeSprite });
    const p = pool.spawn({ lifeMs: 100, delayMs: 30 });
    expect(p.sprite.visible).toBe(false);
    pool.update(40);
    pool.update(10);
    expect(p.sprite.visible).toBe(true);
  });

  it('화면 객체 동기화 — 위치·투명도·색·텍스처(지정 없으면 기본 텍스처로 복귀)', () => {
    const pool = createParticlePool({ capacity: 1, maxActive: 1, createSprite: fakeSprite });
    const p = pool.spawn({ x: 3, y: 4, color: 0xff0000, lifeMs: 100, texture: 'shard' });
    expect(p.sprite).toMatchObject({ x: 3, y: 4, tint: 0xff0000, texture: 'shard', visible: true });
    const q = pool.spawn({ lifeMs: 100 });
    expect(q.sprite.texture).toBe('dot');
    pool.clear();
    expect(q.sprite.visible).toBe(false);
    expect(pool.activeCount()).toBe(0);
  });

  it('burst는 count개를 만들고 상한을 넘지 않는다', () => {
    const pool = createParticlePool({ capacity: 64, maxActive: 40 });
    let seed = 0;
    burst(pool, { x: 10, y: 10, count: 24, rand: () => ((seed = (seed + 0.37) % 1)) });
    expect(pool.activeCount()).toBe(24);
    burst(pool, { x: 10, y: 10, count: 80 });
    expect(pool.activeCount()).toBe(40);
  });
});
