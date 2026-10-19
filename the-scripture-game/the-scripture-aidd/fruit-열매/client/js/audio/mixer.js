// mixer.js — 오디오 시작·버스 음량·음소거 관리만
// TASK-050-1 | REQ-013 FR-055 FR-059 FR-060 C-007 | ARCH-006 | design-vision §4.7.1 | D-14 | devguide §3.3 audio
// 버스: SFX·경고음 → spiritMute → sfxBus ┐ / BGM → musicFilter → musicDuck → musicBus ┼→ master → Compressor → Limiter
//       → Destination. 공용 Reverb 2개(짧은 2.8s·긴 4.5s)는 send로 master에 합류. 음원 파일 0개(C-007).
// Tone 시작·노드 생성 실패 시 소리 없이 계속한다(게임 진행 우선 — devguide §3.3).
import * as Tone from "tone";

/** §4.7.1 기본 음량 (0~100) — D3-08 세션 메모리만 (저장하지 않음) */
export const DEFAULT_VOLUMES = Object.freeze({ master: 80, sfx: 80, music: 60 });

/** §4.7.1 음량 변환: v가 0이면 −∞, 아니면 40·log10(v/100) (제곱 법칙) @param {number} v 0~100 */
export function volumeToDb(v) {
  const n = Math.max(0, Math.min(100, Number(v) || 0));
  return n <= 0 ? -Infinity : 40 * Math.log10(n / 100);
}

/** dB 오프셋 → Tone velocity(선형 배율) — "−10dB 변형" 같은 재생별 음량 @param {number} db */
export const dbToGain = (db) => (db === -Infinity ? 0 : 10 ** (db / 20));

/** UC-020 E1 오디오 시작 입력 — 첫 pointerdown·keydown·touchend (어느 화면이든) */
const UNLOCK_EVENTS = ["pointerdown", "keydown", "touchend"];

export function createMixer() {
  const volumes = { ...DEFAULT_VOLUMES };
  let muted = false;
  let started = false;
  let starting = null;
  /** @type {any} */ let n = null;
  /** @type {Set<() => void>} */ const listeners = new Set();

  /** 그래프 1회 생성 (현재 Tone 컨텍스트 — Tone.Offline 검증에서도 같은 코드) */
  function build() {
    if (n) return true;
    try {
      // §4.7.1 master 80 / Compressor −18dB·3:1·0.01s·0.2s / Limiter −1dB
      const master = new Tone.Volume(volumeToDb(volumes.master));
      const comp = new Tone.Compressor({ threshold: -18, ratio: 3, attack: 0.01, release: 0.2 });
      const limiter = new Tone.Limiter(-1);
      master.chain(comp, limiter, Tone.getDestination());
      const sfxBus = new Tone.Volume(volumeToDb(volumes.sfx)).connect(master);
      const musicBus = new Tone.Volume(volumeToDb(volumes.music)).connect(master);
      // S-02 spiritMute — 효과음과 경고음(AUX-01·AUX-03)만, 배경음악은 통과
      const spiritMute = new Tone.Volume(0).connect(sfxBus);
      const musicDuck = new Tone.Volume(0).connect(musicBus);
      const musicFilter = new Tone.Filter({ frequency: 20000, type: "lowpass" }).connect(musicDuck);
      const reverbShort = new Tone.Reverb({ decay: 2.8, wet: 1 }).connect(master);
      const reverbLong = new Tone.Reverb({ decay: 4.5, wet: 1 }).connect(master);
      n = { master, comp, limiter, sfxBus, musicBus, spiritMute, musicDuck, musicFilter, reverbShort, reverbLong };
      Tone.getDestination().mute = muted;
      return true;
    } catch (err) {
      console.error("오디오 그래프 생성 실패", err);
      n = null;
      return false;
    }
  }

  /** UC-020 E1·D-14 Tone.start() — 사용자 입력 안에서만 성공. 실패하면 소리 없이 계속 */
  async function start() {
    if (started) return true;
    if (starting) return starting;
    starting = (async () => {
      try {
        await Tone.start();
        started = build();
      } catch (err) {
        console.error("오디오 시작 실패", err);
        started = false;
      }
      starting = null;
      if (started) for (const fn of listeners) fn();
      return started;
    })();
    return starting;
  }

  /** 램프 공통 (UC-020 "즉시 반영" rampTo 0.05) @param {any} param @param {number} db @param {number} sec */
  function ramp(param, db, sec) {
    try {
      param.cancelScheduledValues(Tone.now());
      param.rampTo(db, sec);
    } catch (err) {
      console.error("음량 램프 실패", err);
    }
  }

  return {
    build, start,
    get started() {
      return started;
    },
    /** 그래프가 있는가 (Offline 검증 포함) */
    get ready() {
      return !!n;
    },
    /** 효과음·경고음 입력 (spiritMute 경유) */
    get sfxIn() {
      return n?.spiritMute ?? null;
    },
    /** 배경음악 입력 (musicFilter 경유) */
    get musicIn() {
      return n?.musicFilter ?? null;
    },
    /**
     * 공용 Reverb send — node → Gain(amount) → 짧은(2.8s)/긴(4.5s) Reverb (§4.7.2 "짧은 Reverb send 0.15")
     * @param {any} node @param {"short" | "long"} which @param {number} amount
     */
    send(node, which, amount) {
      if (!n) return null;
      const g = new Tone.Gain(amount);
      node.connect(g);
      g.connect(which === "long" ? n.reverbLong : n.reverbShort);
      return g;
    },
    /** 첫 사용자 입력에 Tone.start() — 해제 함수 반환 @param {EventTarget} [target] */
    unlock(target = window) {
      const handler = () => {
        off();
        start();
      };
      const off = () => UNLOCK_EVENTS.forEach((e) => target.removeEventListener(e, handler, true));
      UNLOCK_EVENTS.forEach((e) => target.addEventListener(e, handler, true));
      return off;
    },
    /** 시작 알림 (AudioUnlockToast 200ms 소멸·BGM-1 2초 페이드 인) @param {() => void} fn */
    onStart(fn) {
      listeners.add(fn);
      if (started) fn();
      return () => listeners.delete(fn);
    },
    /** FR-060 마스터·효과음·음악 음량 0~100 @param {"master" | "sfx" | "music"} bus @param {number} v */
    setVolume(bus, v) {
      volumes[bus] = Math.max(0, Math.min(100, Number(v) || 0));
      const node = n && { master: n.master, sfx: n.sfxBus, music: n.musicBus }[bus];
      if (node) ramp(node.volume, volumeToDb(volumes[bus]), 0.05);
    },
    /** @param {"master" | "sfx" | "music"} bus */
    getVolume(bus) {
      return volumes[bus];
    },
    /** UC-020 3a 음소거 — 슬라이더 값 보존, 해제 시 이전 음량 @param {boolean} on */
    setMuted(on) {
      muted = !!on;
      try {
        if (n) Tone.getDestination().mute = muted;
      } catch (err) {
        console.error("음소거 실패", err);
      }
    },
    get muted() {
      return muted;
    },
    /** §4.7.1 spiritMute — S-02 동안 −∞dB 80ms, 끝나면 0dB 200ms @param {boolean} on */
    setSpiritMute(on) {
      if (n) ramp(n.spiritMute.volume, on ? -Infinity : 0, on ? 0.08 : 0.2);
    },
    /** §4.7.4 배경음악 낮춤(말씀 대결 −12·악한 영 −6·예수님 −18dB) — 0이면 복귀 @param {number} db @param {number} sec */
    duckMusic(db, sec) {
      if (n) ramp(n.musicDuck.volume, db, sec);
    },
    /** §4.7.1 musicFilter — 말씀 대결 800Hz(200ms), 재개 20kHz(400ms) @param {number} hz @param {number} sec */
    setMusicLowpass(hz, sec) {
      if (n) ramp(n.musicFilter.frequency, hz, sec);
    },
    dispose() {
      if (!n) return;
      for (const node of Object.values(n)) node.dispose();
      n = null;
    },
  };
}
