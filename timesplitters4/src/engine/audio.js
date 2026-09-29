// Fully synthesized WebAudio sound effects + a tiny step-sequencer for music. No audio files needed.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.listeners = []; // [{x,y,z,yaw}] one per local player (split-screen)
    this.volume = { master: 0.8, sfx: 0.9, music: 0.45 };
    this._noise = null;
    this._music = null;
    this._voices = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(comp);
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(comp);
    this.applyVolume();
    const len = this.ctx.sampleRate * 1.5;
    this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this._noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  applyVolume() {
    if (!this.ctx) return;
    this.master.gain.value = this.volume.master;
    this.sfxGain.gain.value = this.volume.sfx;
    this.musicGain.gain.value = this.volume.music;
  }

  /** Compute gain/pan for a world position relative to the nearest listener. */
  _spatial(pos) {
    if (!pos || this.listeners.length === 0) return { gain: 1, pan: 0 };
    let best = null, bestD = Infinity;
    for (const l of this.listeners) {
      const d = Math.hypot(pos.x - l.x, pos.y - l.y, pos.z - l.z);
      if (d < bestD) { bestD = d; best = l; }
    }
    const gain = 1 / (1 + bestD * bestD * 0.004 + bestD * 0.03);
    const dx = pos.x - best.x, dz = pos.z - best.z;
    // listener right vector for yaw (forward = -Z rotated by yaw)
    const rx = Math.cos(best.yaw), rz = -Math.sin(best.yaw);
    const len = Math.hypot(dx, dz) || 1;
    const pan = Math.max(-1, Math.min(1, (dx * rx + dz * rz) / len)) * Math.min(1, bestD / 3);
    return { gain, pan };
  }

  _out(pos, vol = 1) {
    const { gain, pan } = this._spatial(pos);
    const g = this.ctx.createGain();
    g.gain.value = vol * gain;
    let node = g;
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p); p.connect(this.sfxGain);
    } else g.connect(this.sfxGain);
    return { node, level: gain };
  }

  _noiseBurst(out, { dur = 0.2, freq = 1200, q = 1, type = 'lowpass', vol = 1, attack = 0.002, sweepTo = null, t0 = 0 }) {
    const c = this.ctx, t = c.currentTime + t0;
    const src = c.createBufferSource(); src.buffer = this._noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  _tone(out, { type = 'square', f0 = 440, f1 = null, dur = 0.15, vol = 0.3, t0 = 0, attack = 0.005 }) {
    const c = this.ctx, t = c.currentTime + t0;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  play(name, pos = null, vol = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const { node: out, level } = this._out(pos, vol);
    if (level < 0.02) return;
    const fn = SOUNDS[name];
    if (fn) fn(this, out);
  }

  // ---------- Music: tiny pattern sequencer ----------
  playMusic(track) {
    this.stopMusic();
    if (!this.ctx || !track) return;
    const song = SONGS[track];
    if (!song) return;
    const stepDur = 60 / song.bpm / 4;
    let step = 0;
    let next = this.ctx.currentTime + 0.1;
    const tick = () => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.25) {
        this._musicStep(song, step, next, stepDur);
        step = (step + 1) % (song.bars * 16);
        next += stepDur;
      }
    };
    this._music = setInterval(tick, 60);
    tick();
  }

  _musicStep(song, step, t, sd) {
    const c = this.ctx, out = this.musicGain;
    const bar = Math.floor(step / 16) % song.chords.length;
    const s = step % 16;
    const root = song.chords[bar];
    const note = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const voice = (type, freq, dur, vol, when) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(out); o.start(when); o.stop(when + dur + 0.02);
    };
    if (song.bass[s]) voice(song.bassWave || 'triangle', note(root - 24 + song.bass[s] - 1), sd * 1.8, 0.22, t);
    if (song.arp && song.arp[s] !== 0) {
      const iv = [0, 3, 7, 10, 12, 7][(s + bar) % 6] + (song.major ? (s % 3 === 1 ? 1 : 0) : 0);
      voice(song.leadWave || 'square', note(root + iv), sd * 0.9, 0.05, t);
    }
    if (song.kick[s]) {
      const o = c.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const g = c.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
    }
    if (song.hat[s]) {
      const src = c.createBufferSource(); src.buffer = this._noise;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = c.createGain(); g.gain.setValueAtTime(song.hat[s] * 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random()); src.stop(t + 0.06);
    }
    if (song.snare[s]) {
      const src = c.createBufferSource(); src.buffer = this._noise;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
      const g = c.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random()); src.stop(t + 0.15);
    }
  }

  stopMusic() {
    if (this._music) clearInterval(this._music);
    this._music = null;
  }
}

const SOUNDS = {
  pistol: (a, o) => { a._noiseBurst(o, { dur: 0.16, freq: 2600, sweepTo: 400, vol: 0.9 }); a._tone(o, { type: 'square', f0: 220, f1: 60, dur: 0.08, vol: 0.3 }); },
  smg: (a, o) => { a._noiseBurst(o, { dur: 0.09, freq: 3200, sweepTo: 600, vol: 0.7 }); a._tone(o, { type: 'square', f0: 160, f1: 50, dur: 0.05, vol: 0.25 }); },
  rifle: (a, o) => { a._noiseBurst(o, { dur: 0.35, freq: 3500, sweepTo: 200, vol: 1 }); a._tone(o, { type: 'sawtooth', f0: 120, f1: 30, dur: 0.2, vol: 0.4 }); },
  shotgun: (a, o) => { a._noiseBurst(o, { dur: 0.4, freq: 1800, sweepTo: 150, vol: 1 }); a._tone(o, { type: 'sine', f0: 90, f1: 30, dur: 0.25, vol: 0.7 }); a._noiseBurst(o, { dur: 0.08, freq: 3000, type: 'bandpass', vol: 0.4, t0: 0.35 }); },
  laser: (a, o) => { a._tone(o, { type: 'sawtooth', f0: 1400, f1: 200, dur: 0.14, vol: 0.25 }); a._tone(o, { type: 'square', f0: 900, f1: 300, dur: 0.1, vol: 0.12 }); },
  plasma: (a, o) => { a._tone(o, { type: 'square', f0: 600, f1: 90, dur: 0.18, vol: 0.2 }); a._noiseBurst(o, { dur: 0.12, freq: 900, type: 'bandpass', q: 4, vol: 0.4 }); },
  rocket: (a, o) => { a._noiseBurst(o, { dur: 0.6, freq: 500, sweepTo: 2500, vol: 0.8, attack: 0.05 }); },
  bow: (a, o) => { a._tone(o, { type: 'triangle', f0: 180, f1: 90, dur: 0.12, vol: 0.4 }); a._noiseBurst(o, { dur: 0.2, freq: 1500, type: 'bandpass', vol: 0.3 }); },
  throw: (a, o) => { a._noiseBurst(o, { dur: 0.15, freq: 900, type: 'bandpass', vol: 0.3, attack: 0.03 }); },
  melee: (a, o) => { a._noiseBurst(o, { dur: 0.12, freq: 700, type: 'bandpass', vol: 0.5, attack: 0.02 }); },
  explosion: (a, o) => { a._noiseBurst(o, { dur: 1.1, freq: 1400, sweepTo: 60, vol: 1 }); a._tone(o, { type: 'sine', f0: 70, f1: 25, dur: 0.8, vol: 0.9 }); },
  empty: (a, o) => { a._tone(o, { type: 'square', f0: 1800, dur: 0.03, vol: 0.12 }); },
  reload: (a, o) => { a._noiseBurst(o, { dur: 0.06, freq: 2500, type: 'bandpass', q: 6, vol: 0.4 }); a._noiseBurst(o, { dur: 0.08, freq: 1800, type: 'bandpass', q: 6, vol: 0.5, t0: 0.25 }); },
  hit: (a, o) => { a._tone(o, { type: 'square', f0: 1300, f1: 900, dur: 0.05, vol: 0.18 }); },
  headshot: (a, o) => { a._tone(o, { type: 'square', f0: 1760, dur: 0.06, vol: 0.2 }); a._tone(o, { type: 'square', f0: 2350, dur: 0.1, vol: 0.18, t0: 0.05 }); },
  hurt: (a, o) => { a._tone(o, { type: 'sawtooth', f0: 260, f1: 120, dur: 0.18, vol: 0.3 }); },
  death: (a, o) => { a._tone(o, { type: 'sawtooth', f0: 420, f1: 60, dur: 0.6, vol: 0.35 }); },
  pickup: (a, o) => { a._tone(o, { type: 'square', f0: 660, dur: 0.07, vol: 0.2 }); a._tone(o, { type: 'square', f0: 990, dur: 0.1, vol: 0.2, t0: 0.07 }); },
  health: (a, o) => { [523, 659, 784].forEach((f, i) => a._tone(o, { type: 'triangle', f0: f, dur: 0.1, vol: 0.25, t0: i * 0.06 })); },
  objective: (a, o) => { [392, 523, 659, 784, 1046].forEach((f, i) => a._tone(o, { type: 'square', f0: f, dur: 0.14, vol: 0.16, t0: i * 0.09 })); },
  alarm: (a, o) => { for (let i = 0; i < 4; i++) a._tone(o, { type: 'sawtooth', f0: 700, f1: 1100, dur: 0.3, vol: 0.15, t0: i * 0.35 }); },
  menu: (a, o) => { a._tone(o, { type: 'square', f0: 880, dur: 0.04, vol: 0.12 }); },
  select: (a, o) => { a._tone(o, { type: 'square', f0: 660, dur: 0.05, vol: 0.15 }); a._tone(o, { type: 'square', f0: 1320, dur: 0.08, vol: 0.15, t0: 0.05 }); },
  step: (a, o) => { a._noiseBurst(o, { dur: 0.06, freq: 400, vol: 0.12 }); },
  jump: (a, o) => { a._noiseBurst(o, { dur: 0.08, freq: 600, vol: 0.15 }); },
  portal: (a, o) => { a._tone(o, { type: 'sine', f0: 200, f1: 1600, dur: 1.2, vol: 0.3, attack: 0.3 }); a._tone(o, { type: 'triangle', f0: 300, f1: 2400, dur: 1.2, vol: 0.2, attack: 0.3 }); },
  bag: (a, o) => { [784, 988, 1175].forEach((f, i) => a._tone(o, { type: 'square', f0: f, dur: 0.12, vol: 0.18, t0: i * 0.08 })); },
  infect: (a, o) => { a._tone(o, { type: 'sawtooth', f0: 90, f1: 45, dur: 0.6, vol: 0.4 }); a._noiseBurst(o, { dur: 0.5, freq: 500, type: 'bandpass', q: 3, vol: 0.4 }); },
};

// Songs: chords are MIDI root notes per bar; bass/kick/snare/hat are 16-step patterns.
const SONGS = {
  menu: {
    bpm: 128, bars: 4, chords: [57, 53, 60, 55], major: false,
    bass: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 13, 0],
    arp: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
  },
  chicago: {
    bpm: 150, bars: 4, chords: [50, 50, 55, 57], major: true, bassWave: 'triangle', leadWave: 'triangle',
    bass: [1, 0, 8, 0, 5, 0, 8, 0, 1, 0, 8, 0, 5, 0, 8, 0],
    arp: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  },
  arena: {
    bpm: 140, bars: 4, chords: [52, 48, 55, 50], major: false, bassWave: 'sawtooth',
    bass: [1, 0, 1, 0, 1, 0, 13, 0, 1, 0, 1, 0, 1, 13, 0, 1],
    arp: [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  neon: {
    bpm: 118, bars: 4, chords: [57, 60, 53, 55], major: false, bassWave: 'sawtooth', leadWave: 'sawtooth',
    bass: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 13, 1],
    arp: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
  },
};

export const audio = new AudioEngine();
