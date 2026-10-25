/* ============================================================================
   audio.js -- sound manager with built-in cringe fallback
   ----------------------------------------------------------------------------
   Channels:  ambient (always-on eerie drone) / music (floor + chase) / fx (ring)
   Every sound tries the real file first. If the file is missing it plays a
   chiptune synth version and (for voice lines) speaks the meme line with the
   browser TTS voice. So the game is fully playable with ZERO audio files.
   ============================================================================ */
'use strict';

var CHANNEL_VOLUME = { ambient: 0.5, music: 0.62, fx: 0.6, sfx: 0.75 };

class AudioManager {
  constructor(manifest, config) {
    this.manifest = manifest || {};
    this.cfg = config || {};
    this.base = 'assets/';
    this.failed = {};        // id -> true when the file is definitely missing
    this.els = {};           // id -> template HTMLAudioElement
    this.channels = { ambient: null, music: null, fx: null };
    this.synths = {};        // channel key -> { stop }
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._build();
  }

  def(id) { return this.manifest[id] || null; }

  _build() {
    for (const id in this.manifest) {
      const def = this.manifest[id];
      if (!def || !def.file || def.kind === 'image') continue;
      const el = new Audio();
      el.preload = 'auto';
      el.src = this.base + def.file;
      el.addEventListener('error', () => { this.failed[id] = true; });
      el.addEventListener('canplaythrough', () => { delete this.failed[id]; this.ready = true; });
      this.els[id] = el;
    }
  }

  unlock() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : (this.cfg.volumes ? this.cfg.volumes.master : 0.85);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this.retryPending();
    return this;
  }

  setMuted(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : (this.cfg.volumes ? this.cfg.volumes.master : 0.85);
    for (const k in this.channels) {
      const ch = this.channels[k];
      if (ch && ch.el) ch.el.volume = this.muted ? 0 : this._vol(ch.def, k);
    }
    if (this.muted && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  _vol(def, channel) {
    if (this.muted) return 0;
    const base = (def && def.volume != null) ? def.volume : 1;
    const cv = CHANNEL_VOLUME[channel] != null ? CHANNEL_VOLUME[channel] : 0.7;
    const mv = this.cfg.volumes ? this.cfg.volumes.master : 0.85;
    return Math.max(0, Math.min(1, base * cv * mv));
  }

  /* ---------------- channels (loops) ---------------- */
  playAmbient(id) { this._playChannel('ambient', id); }
  playMusic(id) { this._playChannel('music', id); }
  stopMusic() { this._stopChannel('music'); }
  playFx(id) { this._playChannel('fx', id); }
  stopFx() { this._stopChannel('fx'); }
  musicId() { return this.channels.music ? this.channels.music.id : null; }
  fxId() { return this.channels.fx ? this.channels.fx.id : null; }

  _stopChannel(name) {
    const ch = this.channels[name];
    if (!ch) return;
    this.channels[name] = null;
    if (ch.el) {
      const el = ch.el;
      this._fade(el, 0, 220, () => { try { el.pause(); } catch (e) {} });
    }
    if (ch.synthStop) { try { ch.synthStop(); } catch (e) {} }
    const key = name + ':' + ch.id;
    delete this.synths[key];
  }

  _playChannel(name, id) {
    const cur = this.channels[name];
    if (cur && cur.id === id) return;
    this._stopChannel(name);
    const def = this.def(id);
    if (!def) return;
    const ch = { channel: name, id: id, def: def, el: null, synthStop: null };
    this.channels[name] = ch;
    const tmpl = this.els[id];
    if (tmpl && !this.failed[id]) {
      const a = new Audio(tmpl.src);
      a.loop = def.loop !== false;
      a.volume = 0;
      ch.el = a;
      const fail = () => {
        if (this.channels[name] !== ch) return;
        if (a.error) {
          // the file genuinely does not exist -> chiptune fallback
          this.failed[id] = true;
          ch.el = null;
          this._startSynth(ch);
        }
        // else: autoplay was blocked. keep the element, retry after unlock()
      };
      a.addEventListener('error', fail);
      const p = a.play();
      if (p && p.catch) p.catch(fail);
      this._fade(a, this._vol(def, name), 500);
    } else {
      this._startSynth(ch);
    }
    if (def.say) this.speak(def.say, def.lang);   // announcements always spoken
  }

  retryPending() {
    for (const k in this.channels) {
      const ch = this.channels[k];
      if (ch && ch.el && ch.el.paused) {
        const p = ch.el.play();
        if (p && p.catch) p.catch(() => {});
      }
    }
  }

  /* ---------------- one shots ---------------- */
  playSfx(id) {
    const def = this.def(id);
    if (!def) return;
    let fell = false;
    const fallback = () => {
      if (fell) return;
      fell = true;
      this._oneShotSynth(id, def);
      if (def.say) this.speak(def.say, def.lang);
    };
    const tmpl = this.els[id];
    if (tmpl && !this.failed[id]) {
      const a = new Audio(tmpl.src);
      a.volume = this._vol(def, 'sfx');
      a.addEventListener('error', fallback);
      const p = a.play();
      if (p && p.catch) p.catch(fallback);
    } else {
      fallback();
    }
  }

  speak(text, lang) {
    if (!text || !this.cfg.speechFallback || this.muted) return;
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || this.cfg.speechLang || 'hi-IN';
      u.rate = this.cfg.speechRate || 1;
      u.pitch = this.cfg.speechPitch || 0.8;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice, no problem */ }
  }

  /* ---------------- synth engine (fallback only) ---------------- */
  _tone(freq, dur, opt) {
    if (!this.ctx || this.muted) return;
    opt = opt || {};
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opt.delay || 0);
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = opt.type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, opt.slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(opt.gain || 0.07, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  _noise(dur, gain, opt) {
    if (!this.ctx || this.muted) return;
    opt = opt || {};
    const ctx = this.ctx;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = opt.freq || 900; f.Q.value = opt.q || 0.9;
      const g = ctx.createGain();
      g.gain.value = gain || 0.08;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(ctx.currentTime + (opt.delay || 0));
    } catch (e) {}
  }

  _drone(freq, gain) {
    if (!this.ctx || this.muted) return { stop: function () {} };
    const ctx = this.ctx;
    try {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      const g = ctx.createGain(), f = ctx.createBiquadFilter();
      o1.type = 'sine'; o2.type = 'triangle';
      o1.frequency.value = freq; o2.frequency.value = freq * 2.01;
      f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 3;
      g.gain.value = 0.0001;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.11 + Math.random() * 0.1; lg.gain.value = 140;
      lfo.connect(lg); lg.connect(f.frequency);
      o1.start(); o2.start(); lfo.start();
      g.gain.exponentialRampToValueAtTime(gain || 0.05, ctx.currentTime + 1.4);
      return {
        stop: () => {
          try {
            g.gain.cancelScheduledValues(ctx.currentTime);
            g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
            setTimeout(() => { try { o1.stop(); o2.stop(); lfo.stop(); } catch (e) {} }, 420);
          } catch (e) {}
        }
      };
    } catch (e) { return { stop: function () {} }; }
  }

  _startSynth(ch) {
    const key = ch.channel + ':' + ch.id;
    const kind = ch.def.synth || 'beep';
    let handle = { stop: function () {} };
    const timers = [];
    switch (kind) {
      case 'tense': {
        const d = this._drone(46, 0.055);
        timers.push(setInterval(() => { if (Math.random() < 0.65) this._tone(880 + Math.random() * 900, 1.6, { type: 'sine', gain: 0.018 }); }, 3600));
        timers.push(setInterval(() => { this._tone(58, 2.4, { type: 'sine', gain: 0.03 }); }, 5400));
        handle = { stop: () => { d.stop(); timers.forEach(clearInterval); } };
        break;
      }
      case 'chase': {
        const d = this._drone(55, 0.05);
        let i = 0;
        timers.push(setInterval(() => {
          i++;
          this._tone(150 + (i % 4) * 40, 0.11, { type: 'square', gain: 0.045 });
          this._tone(210 + (i % 3) * 50, 0.1, { type: 'square', gain: 0.035, delay: 0.14 });
        }, 340));
        handle = { stop: () => { d.stop(); timers.forEach(clearInterval); } };
        break;
      }
      case 'alarm': {
        let flip = false;
        timers.push(setInterval(() => { flip = !flip; this._tone(flip ? 880 : 660, 0.22, { type: 'square', gain: 0.05 }); }, 320));
        handle = { stop: () => timers.forEach(clearInterval) };
        break;
      }
      case 'ring': {
        timers.push(setInterval(() => {
          this._tone(440, 0.4, { type: 'sine', gain: 0.07 });
          this._tone(480, 0.4, { type: 'sine', gain: 0.05, delay: 0.02 });
          this._tone(440, 0.4, { type: 'sine', gain: 0.07, delay: 0.55 });
          this._tone(480, 0.4, { type: 'sine', gain: 0.05, delay: 0.57 });
        }, 3000));
        handle = { stop: () => timers.forEach(clearInterval) };
        break;
      }
      case 'jingle': {
        let i = 0;
        const notes = [523, 659, 784, 659, 880, 784, 523, 392];
        timers.push(setInterval(() => { this._tone(notes[i % notes.length], 0.22, { type: 'triangle', gain: 0.05 }); i++; }, 300));
        const d = this._drone(49, 0.03);
        handle = { stop: () => { d.stop(); timers.forEach(clearInterval); } };
        break;
      }
      case 'none': handle = { stop: function () {} }; break;
      default: handle = { stop: () => timers.forEach(clearInterval) };
    }
    ch.synthStop = handle.stop;
    this.synths[key] = handle;
  }

  _oneShotSynth(id, def) {
    const kind = def.synth || 'beep';
    switch (kind) {
      case 'scream':
        this._noise(0.75, 0.09, { freq: 1400, q: 0.6 });
        this._tone(900, 0.8, { type: 'sawtooth', gain: 0.06, slide: 120 });
        break;
      case 'thud':
        this._tone(130, 0.45, { type: 'sine', gain: 0.1, slide: 38 });
        break;
      case 'error':
        this._tone(220, 0.14, { type: 'square', gain: 0.07 });
        this._tone(160, 0.22, { type: 'square', gain: 0.07, delay: 0.15 });
        break;
      case 'sparkle':
        this._tone(880, 0.09, { type: 'triangle', gain: 0.06 });
        this._tone(1170, 0.09, { type: 'triangle', gain: 0.06, delay: 0.08 });
        this._tone(1560, 0.14, { type: 'triangle', gain: 0.06, delay: 0.16 });
        break;
      case 'jingle':
        [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.16, { type: 'triangle', gain: 0.06, delay: i * 0.1 }));
        break;
      case 'ring':
        this._tone(440, 0.35, { type: 'sine', gain: 0.07 });
        this._tone(480, 0.35, { type: 'sine', gain: 0.05, delay: 0.02 });
        break;
      case 'laser':
        this._tone(1200, 0.3, { type: 'sawtooth', gain: 0.06, slide: 180 });
        break;
      case 'noise':
        this._noise(0.3, 0.09, { freq: 2600, q: 1.2 });
        break;
      case 'beep':
        this._tone(880, 0.09, { type: 'square', gain: 0.05 });
        break;
      case 'none':
        break;
      default:
        this._tone(440, 0.12, { type: 'square', gain: 0.05 });
    }
  }

  _fade(el, to, ms, done) {
    if (el._fadeInt) clearInterval(el._fadeInt);
    const from = el.volume;
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    el._fadeInt = setInterval(() => {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const k = Math.min(1, (now - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(el._fadeInt); el._fadeInt = null; if (done) done(); }
    }, 50);
  }

  /* ---------------- setup panel helpers ---------------- */
  status(id) {
    if (this.failed[id]) return 'missing';
    if (this.els[id] && this.els[id].readyState >= 3) return 'found';
    return 'unknown';
  }

  testPlay(id) {
    const def = this.def(id);
    if (!def) return 'unknown';
    if (def.kind === 'bgm') {
      this.unlock();
      this.playMusic(id);
      setTimeout(() => { if (this.musicId() === id) this.stopMusic(); }, 4200);
    } else {
      this.unlock();
      this.playSfx(id);
    }
    return this.status(id);
  }

  rescan() {
    this.failed = {};
    for (const id in this.els) {
      const el = this.els[id];
      try { el.load(); } catch (e) {}
    }
  }

  missingIds() {
    const out = [];
    for (const id in this.manifest) {
      const d = this.manifest[id];
      if (!d || !d.file) continue;
      if (this.failed[id]) out.push(id);
    }
    return out;
  }
}

var audio = new AudioManager(AUDIO_ASSETS, CONFIG);
