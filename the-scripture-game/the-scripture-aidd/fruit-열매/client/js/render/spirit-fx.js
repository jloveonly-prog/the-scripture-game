// spirit-fx.js — 악한 영 시각 효과 생성·갱신·제거만 (가림 수치는 spirits.json 그대로 — D3-09)
// TASK-045 | REQ-007 REQ-013 FR-027~FR-030 FR-049 FR-054 C-011 | ARCH-004 | TBL-013 | design-vision §2.8
// z60·§2.13.3·§4.6.4
// 입력: 지속 = sync(curseView(state, now)) (game/apply-spirit.js). 등장 = appear(spiritId) → spirit-appear.js (D-03A 분할).
// 가림 정도(덮개 opacity·군대 coverage·파리 개수·흐림·암전)는 감소 모드·연출 옵션과 무관하게 그대로다(D3-09, §6.3).
import { Container, Graphics, Rectangle, Sprite } from "pixi.js";
import { createSpiritAppear } from "./spirit-appear.js";

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

/**
 * @param {{ pixi: any, particles: any, filters: any }} deps pixi = createPixiApp 결과
 */
export function createSpiritFx({ pixi, particles, filters }) {
  const layer = pixi.layers.spirit;
  /** @type {{ me: any, opp: any, nextRect: any, screen: any }} */
  const ctx = { me: null, opp: null, nextRect: null, screen: { x: 0, y: 0, width: 1280, height: 720 } };
  let reduced = false;
  let time = 0;

  // 지속 효과 묶음: 컨테이너 투명도로 등장 200ms·소멸 400ms (S-END) — 덮개 자체의 투명도는 spirits.json 값 그대로
  /** @type {Record<string, { c: Container, on: boolean, data: any }>} */
  const fx = {};
  for (const k of ["darken", "swarm", "wind", "reverse", "hideNext", "fakeNext", "blackout"]) {
    const c = new Container({ label: `spirit:${k}` });
    c.alpha = 0;
    layer.addChild(c);
    fx[k] = { c, on: false, data: {} };
  }

  const appearFx = createSpiritAppear({ pixi, particles, filters });

  // 군대 그림자 형상 텍스처(물방울 10×26, #0D0A14) 1장
  const dropG = new Graphics().ellipse(5, 6, 5, 6).fill(0x0d0a14).poly([0.5, 8, 9.5, 8, 5, 26]).fill(0x0d0a14);
  const dropTex = pixi.renderer.generateTexture({ target: dropG, frame: new Rectangle(0, 0, 10, 26), resolution: 2 });
  dropG.destroy();

  /** 보드·다음 블록 칸·화면 사각형 (layout 변경 시) */
  function setTargets({ me, opp = null, nextRect = null, screen }) {
    Object.assign(ctx, { me, opp, nextRect, screen: screen ?? ctx.screen });
    appearFx.setTargets(ctx);
    for (const f of Object.values(fx)) f.on = false; // 배치가 바뀌면 다음 sync에서 새 좌표로 다시 그림
  }

  /** S-07 바람 밀림 순간 돌풍(바람줄 밝기 2배 100ms) */
  function gust() {
    fx.wind.data.gustMs = 100;
  }

  /** 지속 효과 동기화 — curseView(state, now) 그대로 @param {ReturnType<typeof import("../game/apply-spirit.js").curseView>} v */
  function sync(v) {
    if (!ctx.me) return;
    const b = ctx.me.rect();
    appearFx.setTimedActive(v.chips.length > 0);
    // S-01 어둠 덮개 (opacity = params.opacity) + S-13 저주 어둠(0.5)
    setOn("darken", v.darkenOpacity > 0, () => {
      const c = fx.darken.c;
      c.removeChildren().forEach((ch) => ch.destroy());
      c.addChild(new Graphics().rect(b.x, b.y, b.width, b.height).fill({ color: 0x1a1424, alpha: v.darkenOpacity }));
      // 느린 안개 무늬: 흐린 원 6개 (가장자리로 옅어지는 고리 4겹 — 장식, 덮개 투명도와 별개)
      const fog = new Graphics();
      for (let i = 0; i < 6; i += 1) {
        const [fx0, fy0, r0] = [rnd(40, b.width - 40), rnd(40, b.height - 40), rnd(30, 60)];
        for (let k = 4; k >= 1; k -= 1) fog.circle(fx0, fy0, (r0 * k) / 4).fill({ color: 0x2a2433, alpha: 0.06 });
      }
      fog.position.set(b.x, b.y);
      c.addChild(fog);
      fx.darken.data = { fog, opacity: v.darkenOpacity };
    });
    if (fx.darken.on && fx.darken.data.opacity !== v.darkenOpacity) fx.darken.on = false; // 값이 바뀌면 다시 그림
    // S-03 군대 그림자 떼 — 60개가 보드 면적의 coverage를 덮음
    setOn("swarm", v.swarmCoverage > 0, () => {
      const c = fx.swarm.c;
      c.removeChildren().forEach((ch) => ch.destroy());
      const area = b.width * b.height * v.swarmCoverage;
      // 형상 60개 면적 합 ≈ coverage × 보드 면적 × 1.2 (겹침 보정) → 크기 배율
      const s = Math.sqrt((area * 1.2) / (60 * 10 * 26 * 0.75));
      const rw = Math.min(b.width, Math.sqrt(area * 0.9));
      const rh = Math.min(b.height * 0.6, area / rw);
      fx.swarm.data = { sprites: [], rw, rh, cy: b.y + b.height / 3, dir: 1 };
      for (let i = 0; i < 60; i += 1) {
        const sp = new Sprite(dropTex);
        sp.anchor.set(0.5);
        sp.scale.set(s * rnd(0.85, 1.15));
        sp.alpha = 0.85;
        c.addChild(sp);
        fx.swarm.data.sprites.push({ sp, ox: rnd(-0.5, 0.5), oy: rnd(-0.5, 0.5), ph: rnd(0, TAU) });
      }
    });
    // S-06 파리 떼 PT-fly params.particles개 (개수 유지 — 감소 모드는 속도만 ×0.5)
    if (v.flies > 0 && !fxFlies) fxFlies = particles.emit("PT-fly", { x: b.x + b.width / 2, y: b.y + b.height / 2,
      area: { w: b.width, h: b.height }, count: v.flies, bounds: { x: b.x, y: b.y, width: b.width,
        height: b.height } });
    if (v.flies <= 0 && fxFlies) { fxFlies.release(); fxFlies = null; }
    // S-07 바람줄 40개 · S-10 테두리 꼬임 · S-02/S-13 다음 블록 잡음 덮개 · S-04 보라 물결 · S-14 완전 암전
    setOn("wind", v.wind !== 0, () => { fx.wind.data = { dir: v.wind, gustMs: 0, lines: Array.from({ length: 40 },
      () => ({ x: rnd(0, b.width), y: rnd(0, b.height), len: rnd(40, 90) })),
        g: fx.wind.c.addChild(new Graphics()) }; });
    setOn("reverse", v.reversed, () => { fx.reverse.data = { g: fx.reverse.c.addChild(new Graphics()) }; });
    setOn("hideNext", v.hideNext && !!ctx.nextRect, () => {
      fx.hideNext.data = { g: fx.hideNext.c.addChild(new Graphics()), ear: fx.hideNext.c.addChild(earSymbol()),
        acc: 1e9 };
    });
    setOn("fakeNext", v.fakeNext && !!ctx.nextRect,
      () => { fx.fakeNext.data = { g: fx.fakeNext.c.addChild(new Graphics()) }; });
    setOn("blackout", v.blackout, () => {
      fx.blackout.data = { g: fx.blackout.c.addChild(new Graphics().rect(0, 0, b.width, b.height).fill(0x000000)) };
      fx.blackout.data.g.position.set(b.x, b.y);
    });
    // S-12 바벨론: BlurFilter strength = params.blur + 사인 물결(진폭 params.waveAmplitude, 파장 120) + 색상 +20° — 게임 정보 필터
    if (v.blur > 0 && !babylon) {
      const root = ctx.me.root;
      const cm = filters.colorMatrix(root, true);
      cm?.filter.hue(20, false);
      babylon = [filters.blur(root, v.blur, true), filters.wave(root, { amplitude: v.waveAmplitude, wavelength: 120,
        cyclesPerSec: reduced ? 1 : 2 }), cm];
    } else if (v.blur <= 0 && babylon) {
      babylon.forEach((h) => h?.release());
      babylon = null;
    }
  }
  /** @type {any} */ let fxFlies = null;
  /** @type {any[] | null} */ let babylon = null;

  /** 지속 효과 켜기·끄기 (끌 때 400ms 소멸 후 비움) @param {string} key @param {boolean} on @param {() => void} build */
  function setOn(key, on, build) {
    const f = fx[key];
    if (key === "blackout" && f.on && !on && f.data.g) {
      // S-14 끝날 때 어둠이 아래→위로 걷힘 400ms
      const g = f.data.g;
      f.lifting = true;
      pixi.animate(400, (k) => { g.scale.y = 1 - k; }, { onComplete: () => { f.lifting = false; } });
    }
    if (on && !f.on) {
      f.c.removeChildren().forEach((ch) => ch.destroy({ children: true }));
      build();
    }
    f.on = on;
  }

  /** S-02 귀 막힘 기호(귀 곡선 + 사선) */
  function earSymbol() {
    const g = new Graphics();
    g.moveTo(-6, -12).bezierCurveTo(10, -16, 12, 4, 0, 8).quadraticCurveTo(-4, 12, -2, 16);
    g.moveTo(-14, -14).lineTo(14, 14).stroke({ width: 3, color: 0x9c93b3 });
    return g;
  }

  /** @param {number} dtMs */
  function update(dtMs) {
    time += dtMs;
    const dt = dtMs / 1000;
    for (const [key, f] of Object.entries(fx)) {
      const target = f.on ? 1 : 0;
      // S-END 등장 200ms(블랙아웃 300ms) · 소멸 400ms power2.out
      const ms = target ? (key === "blackout" ? 300 : 200) : 400;
      if (f.lifting) continue;
      f.c.alpha += (target - f.c.alpha) * Math.min(1, dtMs / (ms / 3));
      if (!f.on && f.c.alpha < 0.01 && f.c.children.length) {
        f.c.removeChildren().forEach((ch) => ch.destroy({ children: true }));
      }
    }
    appearFx.update(dtMs);
    if (!ctx.me) return;
    const b = ctx.me.rect();
    const d = fx.darken.data;
    // 안개 8px/s 드리프트 (±20px 왕복) — 감소 모드: 정지
    if (fx.darken.on && d.fog && !reduced) d.fog.x = b.x + 20 * (2 * Math.abs(((time * 0.008) / 40) % 2 - 1) - 1);
    const sw = fx.swarm.data;
    if (fx.swarm.on && sw.sprites) {
      // 무리 중심이 보드 위 1/3~2/3 높이를 60px/s(감소 30)로 오감, 개체 ±6px 흔들림
      sw.cy += sw.dir * (reduced ? 30 : 60) * dt;
      if (sw.cy > b.y + (b.height * 2) / 3 || sw.cy < b.y + b.height / 3) sw.dir = -sw.dir;
      for (const s of sw.sprites) {
        s.sp.position.set(b.x + b.width / 2 + s.ox * sw.rw + 6 * Math.sin(time / 300 + s.ph), sw.cy + s.oy * sw.rh
          + 6 * Math.cos(time / 340 + s.ph));
      }
    }
    const w = fx.wind.data;
    if (fx.wind.on && w.g) {
      // S-07 1px × 40~90px #CFC6E8 0.35, 900px/s(감소 450) pushDir 방향, 돌풍 때 밝기 2배 100ms
      w.gustMs = Math.max(0, (w.gustMs ?? 0) - dtMs);
      w.g.clear();
      for (const l of w.lines) {
        l.x += w.dir * (reduced ? 450 : 900) * dt;
        if (l.x > b.width) l.x -= b.width + l.len;
        if (l.x < -l.len) l.x += b.width + l.len;
        const x0 = Math.max(0, l.x);
        const x1 = Math.min(b.width, l.x + l.len);
        if (x1 > x0) w.g.moveTo(b.x + x0, b.y + l.y).lineTo(b.x + x1, b.y + l.y);
      }
      w.g.stroke({ width: 1, color: 0xcfc6e8, alpha: Math.min(1, 0.35 * (w.gustMs > 0 ? 2 : 1)) });
    }
    if (fx.reverse.on && fx.reverse.data.g) {
      // S-10 #8E2A5A ↔ #9B4DFF 그라데이션 꼬임 회전 0.5회전/초 (감소 모드: 회전 정지)
      const g = fx.reverse.data.g.clear();
      const per = 2 * (b.width + b.height);
      const phase = reduced ? 0 : (time / 2000) % 1;
      for (let i = 0; i < 48; i += 1) {
        const p0 = (i / 48) * per;
        const p1 = ((i + 1) / 48) * per;
        const t = 0.5 + 0.5 * Math.sin(TAU * (i / 48 + phase) * 2);
        const col = (Math.round(0x8e + (0x9b - 0x8e) * t) << 16) | (Math.round(0x2a + (0x4d - 0x2a) * t) << 8)
          | Math.round(0x5a + (0xff - 0x5a) * t);
        const [ax, ay] = perim(b, p0);
        const [bx, by] = perim(b, p1);
        g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 4, color: col });
      }
    }
    const hn = fx.hideNext.data;
    if (fx.hideNext.on && hn.g && ctx.nextRect) {
      // S-02 #2A2433 바탕 + 1px 점 무작위, 8fps 갱신(감소 2fps)
      hn.acc += dtMs;
      const r = ctx.nextRect;
      if (hn.acc >= 1000 / (reduced ? 2 : 8)) {
        hn.acc = 0;
        hn.g.clear().rect(r.x, r.y, r.w, r.h).fill(0x2a2433);
        for (let i = 0; i < (r.w * r.h) / 40; i += 1) hn.g.rect(r.x + rnd(0, r.w), r.y + rnd(0, r.h), 1, 1);
        hn.g.fill({ color: 0x9c93b3, alpha: 0.5 });
        hn.ear.position.set(r.x + r.w / 2, r.y + Math.min(r.h, 120) / 2);
      }
    }
    if (fx.fakeNext.on && fx.fakeNext.data.g && ctx.nextRect) {
      // S-04 보라 #9B4DFF 0.15 물결 덧칠, 2초 주기 (감소 모드: 정지)
      const r = ctx.nextRect;
      const g = fx.fakeNext.data.g.clear();
      const ph = reduced ? 0 : (time / 2000) * TAU;
      for (let y = 0; y < r.h; y += 12) g.rect(r.x + 4 * Math.sin(ph + y / 20), r.y + y, r.w, 6);
      g.fill({ color: 0x9b4dff, alpha: 0.15 });
    }
  }

  return {
    setTargets, sync, gust, update,
    /** §4.6.4 등장 연출 (spirit-appear.js) */
    appear: appearFx.appear,
    /** S-09 메뚜기 갉음 (spirit-appear.js) */
    gnaw: appearFx.gnaw,
    /** 예수님 이벤트·스랍·투구 등으로 지속 효과가 걷힐 때 비네트도 내림 */
    clearVignette: appearFx.clearVignette,
    /** §6.3 감소 모드 — 움직임·속도만 (가림 정도 불변 D3-09) @param {boolean} on */
    setReduced(on) {
      reduced = on;
      appearFx.setReduced(on);
    },
    destroy() {
      fxFlies?.release();
      babylon?.forEach((h) => h?.release());
      for (const f of Object.values(fx)) f.c.destroy({ children: true });
      appearFx.destroy();
      dropTex.destroy(true);
    },
  };
}

/** 보드 둘레 위치 → 좌표 (시계 방향, 왼쪽 위에서 시작) */
function perim(b, p) {
  if (p < b.width) return [b.x + p, b.y];
  if (p < b.width + b.height) return [b.x + b.width, b.y + (p - b.width)];
  if (p < 2 * b.width + b.height) return [b.x + b.width - (p - b.width - b.height), b.y + b.height];
  return [b.x, b.y + b.height - (p - 2 * b.width - b.height)];
}
