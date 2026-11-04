/**
 * DucKGP audio engine. Everything is synthesized with the Web Audio API, so there are no
 * audio files to load (zero latency, nothing to download) and the whole thing is OFF by default.
 *
 *  - Categories map to the user's toggles: click (UI), notify (results / alerts), mascot (duck).
 *  - The AudioContext is only created after the first sound is actually requested while
 *    enabled; browsers that block autoplay simply leave it suspended and we retry on the next gesture.
 *  - Music is a slow generative pad. Stopping fades it out, stops every oscillator and disconnects nodes.
 */
import { getPrefs, subscribePrefs } from './prefs';

export type Sfx =
  | 'click' | 'nav' | 'toggleOn' | 'toggleOff' | 'send'
  | 'done' | 'notify' | 'success' | 'error' | 'quack' | 'squeak';

type Category = 'click' | 'notify' | 'mascot';
const CATEGORY: Record<Sfx, Category> = {
  click: 'click', nav: 'click', toggleOn: 'click', toggleOff: 'click', send: 'click',
  done: 'notify', notify: 'notify', success: 'notify', error: 'notify',
  quack: 'mascot', squeak: 'mascot',
};

export type MusicState = 'off' | 'playing' | 'waiting-for-gesture';

interface ToneOpts {
  type?: OscillatorType; gain?: number; glideTo?: number; delay?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicNodes = new Set<AudioNode>();
  private musicTimer: number | null = null;
  private chordIndex = 0;
  private musicOn = false;
  private lastClick = 0;
  private listeners = new Set<() => void>();
  private _musicState: MusicState = 'off';
  private gestureArmed = false;

  get musicState() { return this._musicState; }
  onMusicState(cb: () => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  private setMusicState(s: MusicState) { if (s !== this._musicState) { this._musicState = s; this.listeners.forEach((l) => l()); } }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => { /* needs gesture */ });
    return this.ctx;
  }

  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend().catch(() => undefined);
    else if (this.musicOn || getPrefs().audio.master) void this.ctx.resume().catch(() => undefined);
  };

  /** Apply the current preferences: volumes, and start/stop the music. */
  sync() {
    const { audio } = getPrefs();
    const wantMusic = audio.master && audio.music;
    if (this.ctx && this.master && this.sfxBus && this.musicBus) {
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(audio.master ? 1 : 0, t, 0.04);
      this.sfxBus.gain.setTargetAtTime(audio.sfxVolume, t, 0.05);
      if (this.musicOn) this.musicBus.gain.setTargetAtTime(audio.musicVolume * 0.55, t, 0.25);
    }
    if (wantMusic && !this.musicOn) this.startMusic();
    if (!wantMusic && this.musicOn) this.stopMusic();
  }

  play(name: Sfx) {
    const { audio } = getPrefs();
    if (!audio.master || !audio[CATEGORY[name]]) return;
    if (name === 'click') { // avoid machine-gun clicking
      const now = performance.now();
      if (now - this.lastClick < 45) return;
      this.lastClick = now;
    }
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running' || !this.sfxBus || !this.master) return;
    this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.01);
    this.sfxBus.gain.setTargetAtTime(audio.sfxVolume, ctx.currentTime, 0.01);
    const j = 1 + (Math.random() - 0.5) * 0.06; // tiny pitch variance so repeats never feel robotic
    const t = (f: number, d: number, o: ToneOpts = {}) => this.tone(f * j, d, o);
    switch (name) {
      case 'click': t(920, 0.05, { gain: 0.1, glideTo: 700 }); break;
      case 'nav': t(520, 0.07, { type: 'triangle', gain: 0.09 }); t(780, 0.09, { type: 'triangle', gain: 0.08, delay: 0.045 }); break;
      case 'toggleOn': t(620, 0.07, { gain: 0.1, glideTo: 920 }); break;
      case 'toggleOff': t(740, 0.07, { gain: 0.09, glideTo: 460 }); break;
      case 'send': t(420, 0.13, { type: 'triangle', gain: 0.1, glideTo: 840 }); break;
      case 'done': t(784, 0.2, { gain: 0.09 }); t(988, 0.3, { gain: 0.08, delay: 0.09 }); break;
      case 'notify': t(988, 0.16, { gain: 0.07 }); t(1319, 0.24, { gain: 0.06, delay: 0.1 }); break;
      case 'success': [523.25, 659.25, 783.99].forEach((f, i) => t(f, 0.22, { type: 'triangle', gain: 0.08, delay: i * 0.07 })); break;
      case 'error': t(240, 0.22, { type: 'sawtooth', gain: 0.05, glideTo: 170, filter: { type: 'lowpass', freq: 900 } }); break;
      case 'quack':
        t(430, 0.1, { type: 'sawtooth', gain: 0.1, glideTo: 300, filter: { type: 'bandpass', freq: 950, q: 4 } });
        t(370, 0.14, { type: 'sawtooth', gain: 0.09, glideTo: 250, delay: 0.11, filter: { type: 'bandpass', freq: 850, q: 4 } });
        break;
      case 'squeak': t(1250, 0.08, { gain: 0.08, glideTo: 1800 }); break;
    }
  }

  private tone(freq: number, dur: number, o: ToneOpts = {}) {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, start + dur);
    const peak = o.gain ?? 0.1;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let tail: AudioNode = osc;
    let filter: BiquadFilterNode | null = null;
    if (o.filter) {
      filter = ctx.createBiquadFilter();
      filter.type = o.filter.type;
      filter.frequency.value = o.filter.freq;
      filter.Q.value = o.filter.q ?? 1;
      osc.connect(filter);
      tail = filter;
    }
    tail.connect(env);
    env.connect(this.sfxBus);
    osc.start(start);
    osc.stop(start + dur + 0.03);
    osc.onended = () => { osc.disconnect(); filter?.disconnect(); env.disconnect(); };
  }

  // ── Ambient music ────────────────────────────────────────────────────────────────────────────
  private static CHORDS: number[][] = [
    [130.81, 196.0, 246.94, 329.63], // Cmaj7
    [110.0, 164.81, 261.63, 329.63], // Am
    [87.31, 130.81, 220.0, 329.63], // Fmaj7
    [98.0, 146.83, 246.94, 392.0], // G
  ];

  private startMusic() {
    this.musicOn = true;
    const ctx = this.ensure();
    if (!ctx || !this.musicBus) { this.setMusicState('waiting-for-gesture'); this.armGesture(); return; }
    if (ctx.state !== 'running') { this.setMusicState('waiting-for-gesture'); this.armGesture(); return; }
    this.setMusicState('playing');
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(getPrefs().audio.musicVolume * 0.55, ctx.currentTime, 0.9);
    this.scheduleChord();
  }

  private armGesture() {
    if (this.gestureArmed) return;
    this.gestureArmed = true;
    const resume = () => {
      this.gestureArmed = false;
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      if (this.musicOn) { this.musicOn = false; this.sync(); }
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }

  private scheduleChord() {
    if (!this.musicOn || !this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const chord = AudioEngine.CHORDS[this.chordIndex++ % AudioEngine.CHORDS.length];
    const now = ctx.currentTime;
    const len = 9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 780;
    lp.connect(this.musicBus);
    this.musicNodes.add(lp);
    chord.forEach((f, i) => {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        osc.detune.value = detune;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(i === 0 ? 0.16 : 0.07, now + 3);
        env.gain.setValueAtTime(i === 0 ? 0.16 : 0.07, now + len - 3.5);
        env.gain.exponentialRampToValueAtTime(0.0001, now + len + 1);
        osc.connect(env);
        env.connect(lp);
        osc.start(now);
        osc.stop(now + len + 1.1);
        this.musicNodes.add(osc);
        this.musicNodes.add(env);
        osc.onended = () => { osc.disconnect(); env.disconnect(); this.musicNodes.delete(osc); this.musicNodes.delete(env); };
      }
    });
    window.setTimeout(() => { lp.disconnect(); this.musicNodes.delete(lp); }, (len + 2) * 1000);
    this.musicTimer = window.setTimeout(() => this.scheduleChord(), (len - 1.2) * 1000);
  }

  private stopMusic() {
    this.musicOn = false;
    this.setMusicState('off');
    if (this.musicTimer !== null) { clearTimeout(this.musicTimer); this.musicTimer = null; }
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    const nodes = [...this.musicNodes];
    this.musicNodes.clear();
    window.setTimeout(() => {
      nodes.forEach((n) => { try { if (n instanceof OscillatorNode) n.stop(); n.disconnect(); } catch { /* already stopped */ } });
    }, 900);
  }

  /** Tear everything down (used on sign-out / unmount). */
  dispose() {
    this.stopMusic();
    document.removeEventListener('visibilitychange', this.onVisibility);
    const ctx = this.ctx;
    this.ctx = null; this.master = null; this.sfxBus = null; this.musicBus = null;
    if (ctx) window.setTimeout(() => { void ctx.close().catch(() => undefined); }, 1000);
  }
}

export const audio = new AudioEngine();
export const sfx = (name: Sfx) => audio.play(name);

let wired = false;
/** Wire prefs → engine and a single delegated click listener. Safe to call repeatedly. */
export function initAudio() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  subscribePrefs(() => audio.sync());
  audio.sync();
  document.addEventListener('click', (event) => {
    const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('button, [role="button"], [role="tab"], a[href]');
    if (!el || el.hasAttribute('disabled') || el.dataset.sfx === 'none') return;
    const custom = el.dataset.sfx as Sfx | undefined;
    sfx(custom ?? (el.getAttribute('role') === 'tab' ? 'nav' : 'click'));
  }, { capture: true });
}
