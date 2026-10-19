// TASK-050 · FR-058~060 — 테스트 전용 가짜 Tone.js 모듈 (vi.mock('tone') 대체: 노드 생성·연결·트리거·램프 기록)

class FakeParam {
  constructor(value = 0) {
    this.value = value;
    this.ramps = [];
    this.scheduled = [];
  }
  rampTo(value, time) { this.ramps.push([value, time]); this.value = value; return this; }
  linearRampTo(value, time) { return this.rampTo(value, time); }
  exponentialRampTo(value, time) { return this.rampTo(value, time); }
  setValueAtTime(value, time) { this.scheduled.push(['set', value, time]); return this; }
  linearRampToValueAtTime(value, time) { this.scheduled.push(['linear', value, time]); return this; }
  exponentialRampToValueAtTime(value, time) { this.scheduled.push(['exp', value, time]); return this; }
  cancelScheduledValues() { return this; }
}

export function createFakeTone() {
  const created = [];
  const state = { now: 10, contextState: 'running', startCalls: 0, startError: null };

  class FakeNode {
    constructor(...args) {
      this.args = args;
      this.volume = new FakeParam(typeof args[0] === 'number' ? args[0] : 0);
      const opts = args.find((a) => a && typeof a === 'object' && !Array.isArray(a)) || {};
      this.frequency = new FakeParam(opts.frequency ?? 440);
      this.gain = new FakeParam(typeof args[0] === 'number' ? args[0] : 1);
      this.triggers = [];
      this.connections = [];
      this.disposed = false;
      this.started = 0;
      created.push(this);
    }
    connect(target) { this.connections.push(target); return this; }
    toDestination() { this.connections.push('destination'); return this; }
    start() { this.started += 1; return this; }
    stop() { return this; }
    dispose() { this.disposed = true; return this; }
    triggerAttackRelease(...a) { this.triggers.push(['attackRelease', ...a]); return this; }
    triggerAttack(...a) { this.triggers.push(['attack', ...a]); return this; }
    triggerRelease(...a) { this.triggers.push(['release', ...a]); return this; }
    setNote(...a) { this.triggers.push(['setNote', ...a]); return this; }
  }
  const kinds = ['Volume', 'Gain', 'Synth', 'FMSynth', 'AMSynth', 'NoiseSynth', 'MembraneSynth', 'PolySynth', 'Filter',
    'Reverb', 'Chorus', 'Distortion', 'AutoFilter', 'FatOscillator', 'LFO'];
  const mod = {};
  for (const kind of kinds) {
    mod[kind] = class extends FakeNode {};
    Object.defineProperty(mod[kind], 'name', { value: kind });
  }
  mod.Loop = class Loop extends FakeNode {
    constructor(callback, interval) { super({ interval }); this.callback = callback; this.interval = interval; }
  };
  const transport = { bpm: new FakeParam(120), state: 'stopped', start() { this.state = 'started'; return this; } };
  mod.getTransport = () => transport;
  mod.getContext = () => ({ state: state.contextState });
  mod.now = () => state.now;
  mod.start = async () => {
    state.startCalls += 1;
    if (state.startError) throw state.startError;
  };
  // vi.resetModules()는 mock 결과를 다시 만들지 않으므로 테스트마다 기록을 비운다
  const reset = () => {
    created.length = 0;
    Object.assign(state, { now: 10, contextState: 'running', startCalls: 0, startError: null });
    transport.bpm = new FakeParam(120);
    transport.state = 'stopped';
  };
  mod.__fake = { created, state, transport, reset, byKind: (kind) => created.filter((n) => n.constructor.name === kind) };
  return mod;
}
