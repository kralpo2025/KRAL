/* افکت‌های صوتی تولیدشده با Web Audio — بدون هیچ فایل خارجی */
class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.2, slide = 0 }) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise({ dur = 0.25, vol = 0.3, hp = 200, lp = 4000 }) {
    if (!this.ensure()) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = (hp + lp) / 2;
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  swoosh() {
    this.noise({ dur: 0.12, vol: 0.12, hp: 500, lp: 2800 });
  }

  slice() {
    this.tone({ freq: 520, type: 'triangle', dur: 0.08, vol: 0.18, slide: -260 });
    this.noise({ dur: 0.12, vol: 0.22, hp: 900, lp: 6000 });
  }

  bomb() {
    this.tone({ freq: 160, type: 'sawtooth', dur: 0.5, vol: 0.4, slide: -110 });
    this.noise({ dur: 0.45, vol: 0.4, hp: 120, lp: 1200 });
  }

  miss() {
    this.tone({ freq: 340, type: 'sine', dur: 0.18, vol: 0.12, slide: -120 });
  }

  click() {
    this.tone({ freq: 880, type: 'triangle', dur: 0.07, vol: 0.15 });
  }
}

const SFX = new SoundFX();
