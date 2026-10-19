// bgm.js — BGM-1·BGM-2 합성·Transport 템포·위기 층 전환만
// TASK-050-1 | REQ-013 FR-055 FR-059 FR-061 C-007 | ARCH-006 | design-vision §4.7.4 | RTM §5 DCL-008
// BGM-1 대기실 72 BPM D 도리안 / BGM-2 대전 112 BPM D 단조 + 위기 층(132 BPM)·콤보 반응. 층 악기는 처음 한 번만 만든다(§4.7.1).
import * as Tone from "tone";
import { dbToGain } from "./mixer.js";

/** §4.7.4 진행 (8마디 반복 = 화음마다 2마디) */
const LOBBY = {
  bpm: 72,
  chords: [["D3", "F3", "A3", "C4", "E4"], ["Bb2", "D3", "F3", "A3"], ["G2", "Bb2", "D3", "F3", "A3"],
    ["A2", "D3", "E3", "G3"]],
  ninths: ["E5", "C5", "A4", "B4"], // 층 3 종: 화음의 9음 1개 (Dm9 E · B♭maj7 C · Gm9 A · A7sus4 B)
};
const BATTLE = {
  bpm: 112, crisisBpm: 132,
  chords: [["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["C3", "E3", "G3"], ["A2", "C#3", "E3"]],
  roots: ["D2", "Bb1", "C2", "A1"],
  // 층 4 리드 동기 2마디: D5 F5 E5 D5 / A4 − C5 D5 (8분·4분), 1~2·5~6마디
  motif: [["0:0:0", "D5", "8n"], ["0:0:2", "F5", "8n"], ["0:1:0", "E5", "8n"], ["0:1:2", "D5", "4n"],
    ["1:0:0", "A4", "4n"], ["1:2:0", "C5", "8n"], ["1:2:2", "D5", "4n"]],
  kick: [0, 4, 8, 10, 12], snare: [4, 12],
};
/** §4.7.4 콤보 반응 리드 저역 통과 (RTM §5 DCL-008: 기본 2,000Hz · combo ≥ 5 열림 8,000Hz, 1마디 램프) */
const LEAD_LP = { base: 2000, open: 8000 };

/** @param {ReturnType<typeof import("./mixer.js").createMixer>} mixer */
export function createBgm(mixer) {
  /** @type {any} */ let L = null; // 층 악기 (한 번 생성)
  /** @type {any[]} */ let events = []; // 현재 장면의 Transport 이벤트
  let scene = null;
  let chordIdx = 0;
  const st = { combo: 0, crisis: false, forcedUntil: 0, paused34: false };
  const T = () => Tone.getTransport();

  function vol(db) {
    return new Tone.Volume(db).connect(mixer.musicIn);
  }

  /** 두 BGM의 층을 한 번에 만든다 (Tone.start 직후 1회 — §4.7.1 악기 생성 시점) */
  function build() {
    if (L || !mixer.musicIn) return !!L;
    try {
      const lobbyPadV = vol(-22);
      const lobbyPad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine", count: 3, spread: 20 },
        envelope: { attack: 1.5, decay: 1, sustain: 0.8, release: 3 } }).connect(lobbyPadV);
      mixer.send(lobbyPad, "long", 0.6);
      const arp = new Tone.PluckSynth({ volume: 0 }).connect(vol(-26));
      const bell = new Tone.FMSynth({ envelope: { attack: 0.01, decay: 2, sustain: 0, release: 2 } }).connect(vol(-28));
      // BGM-2 층 1~5
      const padFilter = new Tone.Filter({ frequency: 1200, type: "lowpass" }).connect(vol(-24));
      const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth", count: 3, spread: 15 },
        envelope: { attack: 0.4, decay: 0.5, sustain: 0.8, release: 1.5 } }).connect(padFilter);
      const bass = new Tone.MonoSynth({ oscillator: { type: "sawtooth" }, filter: { Q: 2 },
        filterEnvelope: { baseFrequency: 120, octaves: 2.5 } }).connect(vol(-16));
      const drums = new Tone.Volume(0).connect(mixer.musicIn); // 층 3
      const kick = new Tone.MembraneSynth().connect(drums);
      const snare = new Tone.NoiseSynth({ noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0 } })
        .connect(new Tone.Filter({ frequency: 5000, type: "lowpass" }).connect(drums));
      const hatV = new Tone.Volume(-32).connect(drums);
      const hat = new Tone.MetalSynth({ harmonicity: 5.1, envelope: { decay: 0.05, release: 0.01 } })
        .connect(new Tone.Filter({ frequency: 8000, type: "highpass" }).connect(hatV));
      const leadV = new Tone.Volume(-22).connect(mixer.musicIn); // 층 4
      const leadFilter = new Tone.Filter({ frequency: LEAD_LP.base, type: "lowpass" }).connect(leadV);
      const lead = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 3, modulationIndex: 6,
        envelope: { attack: 0.005, decay: 0.6, sustain: 0.1, release: 0.8 } }).connect(leadFilter);
      const crisisV = new Tone.Volume(-Infinity).connect(mixer.musicIn); // 층 5
      const tom = new Tone.MembraneSynth().connect(crisisV);
      const strings = new Tone.Synth({ oscillator: { type: "sawtooth" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.05 } })
        .connect(new Tone.Filter({ frequency: 1800, type: "lowpass" }).connect(new Tone.Volume(-24).connect(crisisV)));
      L = { lobbyPad, arp, bell, pad, padFilter, bass, drums, kick, snare, hat, lead, leadFilter, leadV, crisisV, tom,
        strings };
      return true;
    } catch (err) {
      console.error("BGM 층 생성 실패", err);
      L = null;
      return false;
    }
  }

  function clearEvents() {
    for (const e of events) {
      try {
        e.stop?.();
        e.dispose?.();
      } catch {
        /* 이미 정리됨 */
      }
    }
    events = [];
  }

  /** BGM-1: 패드(2마디 화음)·아르페지오(Pattern upDown 8분, 확률 0.8, 2옥타브)·종(2마디마다 9음) */
  function scheduleLobby() {
    const notes = (i) => [...LOBBY.chords[i], ...LOBBY.chords[i].map((n) => Tone.Frequency(n).transpose(12).toNote())];
    const pattern = new Tone.Pattern((time, note) => L.arp.triggerAttack(note, time), notes(0), "upDown");
    pattern.interval = "8n";
    pattern.probability = 0.8;
    const loop = new Tone.Loop((time) => {
      chordIdx = (chordIdx + 1) % 4;
      L.lobbyPad.triggerAttackRelease(LOBBY.chords[chordIdx], "2m", time);
      L.bell.triggerAttackRelease(LOBBY.ninths[chordIdx], "2n", time);
      pattern.values = notes(chordIdx);
    }, "2m");
    chordIdx = -1;
    events.push(loop.start(0), pattern.start(0));
  }

  /** BGM-2: 패드·베이스(8분 근음)·북(16분 격자)·리드 동기·위기 층(톰 채움·현 오스티나토) */
  function scheduleBattle() {
    let bar = 0;
    const harmony = new Tone.Loop((time) => {
      const i = Math.floor((bar % 8) / 2);
      if (bar % 2 === 0) L.pad.triggerAttackRelease(BATTLE.chords[i], "2m", time);
      // 층 4 리드: 8마디 중 1~2·5~6마디 (combo ≥ 5 옥타브 겹침)
      if (bar % 8 === 0 || bar % 8 === 4) {
        for (const [at, note, dur] of BATTLE.motif) {
          const t = time + Tone.Time(at).toSeconds();
          const chord = st.combo >= 5 ? [note, Tone.Frequency(note).transpose(12).toNote()] : [note];
          L.lead.triggerAttackRelease(chord, dur, t);
        }
      }
      bar += 1;
    }, "1m");
    let step = 0;
    const grid = new Tone.Loop((time) => {
      const s = step % 16;
      const barNo = Math.floor(step / 16);
      const root = BATTLE.roots[Math.floor((barNo % 8) / 2)];
      if (s % 2 === 0) L.bass.triggerAttackRelease(root, "16n", time);
      if (BATTLE.kick.includes(s)) L.kick.triggerAttackRelease("C1", "16n", time);
      if (BATTLE.snare.includes(s)) L.snare.triggerAttackRelease("16n", time);
      // 하이햇 16분음표 / combo ≥ 3 엇박 열린 하이햇 (RTM §5 DCL-008: 같은 MetalSynth 8분 길이 +6dB)
      const open = st.combo >= 3 && s % 4 === 2;
      L.hat.triggerAttackRelease(200, open ? "8n" : "32n", time, open ? dbToGain(6) : 1);
      if (isCrisis()) {
        // 위기 층: 현 16분 D4/E♭4 + 마디 끝(마지막 박) 톰 16분 채움 G1/D2
        L.strings.triggerAttackRelease(s % 2 ? "Eb4" : "D4", "16n", time);
        if (s >= 12) L.tom.triggerAttackRelease(s % 2 ? "D2" : "G1", "16n", time);
      }
      step += 1;
    }, "16n");
    events.push(harmony.start(0), grid.start(0));
  }

  const isCrisis = () => st.crisis || Tone.now() < st.forcedUntil;

  /** 위기 층 켜기·끄기 — 132 BPM 2초 / 112 BPM 4초, 층 5 2초 페이드 아웃, 패드 저역 1,200→2,400Hz @param {boolean} on */
  function applyCrisis(on) {
    if (!L || scene !== "battle") return;
    try {
      T().bpm.rampTo(on ? BATTLE.crisisBpm : BATTLE.bpm, on ? 2 : 4);
      L.crisisV.volume.cancelScheduledValues(Tone.now());
      L.crisisV.volume.rampTo(on ? 0 : -Infinity, on ? 0.3 : 2);
      L.padFilter.frequency.rampTo(on ? 2400 : 1200, on ? 2 : 4);
    } catch (err) {
      console.error("위기 층 전환 실패", err);
    }
  }

  return {
    /**
     * 장면 BGM 재생 — 같은 장면이면 무시. "lobby" = BGM-1 (2초 페이드 인), "battle" = BGM-2
     * @param {"lobby" | "battle"} next @param {{ fadeInSec?: number }} [o]
     */
    play(next, o = {}) {
      if (!mixer.started || !build()) return;
      if (scene === next && T().state === "started") return;
      try {
        clearEvents(); // 대전 화면을 떠나면 BGM-2 층의 Transport 이벤트만 정리 (§4.7.1)
        T().stop();
        T().cancel();
        T().position = 0;
        scene = next;
        Object.assign(st, { combo: 0, crisis: false, forcedUntil: 0, paused34: false });
        T().bpm.value = next === "battle" ? BATTLE.bpm : LOBBY.bpm;
        L.crisisV.volume.value = -Infinity;
        L.drums.volume.value = 0;
        L.leadV.volume.value = -22;
        L.padFilter.frequency.value = 1200;
        L.leadFilter.frequency.value = LEAD_LP.base;
        if (next === "battle") scheduleBattle();
        else scheduleLobby();
        mixer.duckMusic(-60, 0.01);
        mixer.duckMusic(0, o.fadeInSec ?? (next === "lobby" ? 2 : 0.4));
        T().start("+0.05");
      } catch (err) {
        console.error("BGM 재생 실패", err);
      }
    },
    /** 경기 종료 1,000ms 페이드 아웃 등 @param {number} [fadeMs] */
    stop(fadeMs = 1000) {
      if (!scene) return;
      mixer.duckMusic(-Infinity, fadeMs / 1000);
      const s = scene;
      setTimeout(() => {
        if (scene !== s) return;
        clearEvents();
        T().stop();
        scene = null;
      }, fadeMs + 50);
    },
    /** D-01·D-02 위기 진입·해제 @param {boolean} on */
    setCrisis(on) {
      if (st.crisis === !!on) return;
      st.crisis = !!on;
      if (Tone.now() >= st.forcedUntil) applyCrisis(st.crisis);
    },
    /** FR-061 콤보 반응: ≥3 열린 하이햇, ≥5 리드 저역 열림 + 옥타브 — 끊기면 1마디 안에 원래대로 @param {number} combo */
    setCombo(combo) {
      st.combo = Math.max(0, combo);
      if (!L || scene !== "battle") return;
      const bar = Tone.Time("1m").toSeconds();
      L.leadFilter.frequency.rampTo(st.combo >= 5 ? LEAD_LP.open : LEAD_LP.base, bar);
    },
    /** S-14 용: 0.3초 정지 후 위기 층 강제 4초 */
    dragon() {
      if (scene !== "battle") return;
      mixer.duckMusic(-Infinity, 0.02);
      setTimeout(() => mixer.duckMusic(0, 0.2), 300);
      st.forcedUntil = Tone.now() + 0.3 + 4;
      setTimeout(() => applyCrisis(true), 300);
      setTimeout(() => applyCrisis(st.crisis), 4300);
    },
    /** 라운드 종료: 층 3·4 0.5초 정지 → 다음 카운트다운 STAND에서 resumeRound() */
    pauseRound() {
      if (!L || scene !== "battle") return;
      st.paused34 = true;
      L.drums.volume.rampTo(-Infinity, 0.5);
      L.leadV.volume.rampTo(-Infinity, 0.5);
    },
    resumeRound() {
      if (!L || !st.paused34) return;
      st.paused34 = false;
      L.drums.volume.rampTo(0, 0.1);
      L.leadV.volume.rampTo(-22, 0.1);
    },
    get scene() {
      return scene;
    },
    /** 검증·디버그용 상태 */
    get state() {
      return { scene, ...st, bpm: L ? Math.round(T().bpm.value) : 0, built: !!L };
    },
  };
}
