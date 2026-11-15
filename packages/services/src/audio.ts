/**
 * Sound effects and calm background music, synthesized with Web Audio so the game ships with no
 * audio files and works offline. Swap in recorded sounds in Phase 4 by replacing these methods.
 */
export class AudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private scale: number[] = [0, 2, 4, 7, 9];
  sfxOn = true;
  musicOn = true;

  /** Must be called from a user gesture (first tap) on mobile browsers. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.master);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    when = 0,
    dest?: AudioNode,
    slideTo?: number,
  ) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, when = 0, freq = 3000) {
    if (!this.ctx || !this.master) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(this.ctx.currentTime + when);
  }

  /** Metallic click when nuts lift. */
  lift() {
    if (!this.sfxOn) return;
    this.tone(1800, 0.06, 'square', 0.08);
    this.tone(2600, 0.05, 'triangle', 0.06, 0.01);
  }
  /** Thread sound as nuts screw down. */
  drop(count = 1) {
    if (!this.sfxOn) return;
    for (let i = 0; i < Math.min(count, 4); i++) this.noise(0.05, 0.25, i * 0.06, 2200 + i * 300);
    this.tone(420, 0.08, 'triangle', 0.08, Math.min(count, 4) * 0.06);
  }
  invalid() {
    if (!this.sfxOn) return;
    this.tone(180, 0.15, 'sawtooth', 0.06, 0, undefined, 120);
  }
  /** Soft chime when a bolt is completed. */
  complete() {
    if (!this.sfxOn) return;
    [784, 988, 1319].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.12, i * 0.07));
  }
  win() {
    if (!this.sfxOn) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.12, i * 0.09));
  }
  tap() {
    if (!this.sfxOn) return;
    this.tone(900, 0.04, 'sine', 0.06);
  }
  coin() {
    if (!this.sfxOn) return;
    this.tone(1400, 0.08, 'square', 0.05);
    this.tone(2100, 0.15, 'square', 0.05, 0.07);
  }

  /** Calm generative music: a slow pentatonic pattern; each stage gets its own root note. */
  startMusic(stage = 1) {
    this.stopMusic();
    if (!this.musicOn || !this.ctx || !this.musicGain) return;
    const root = 196 * Math.pow(2, ((stage * 5) % 12) / 12);
    this.musicStep = 0;
    const play = () => {
      const s = this.musicStep++;
      const deg = [0, 2, 4, 2, 1, 3, 4, 1][s % 8];
      const oct = s % 16 < 8 ? 1 : 2;
      const f = root * Math.pow(2, this.scale[deg] / 12) * oct;
      this.tone(f, 1.4, 'sine', 0.5, 0, this.musicGain!);
      if (s % 4 === 0) this.tone(root / 2, 2.6, 'triangle', 0.35, 0, this.musicGain!);
    };
    play();
    this.musicTimer = setInterval(play, 700);
  }
  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
