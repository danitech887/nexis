// Cyberpunk Web Audio Synthesizer & Sound FX Matrix for Nexis
// Procedural audio generation using standard Web Audio API with zero external dependencies.

export type CyberSoundCue =
  | "terminalKey"
  | "logBurst"
  | "dataBurst"
  | "errorDetected"
  | "threatAlert"
  | "processingStart"
  | "processingStep"
  | "processingComplete"
  | "scanSweep"
  | "targetLock"
  | "patchApplied"
  | "successResolve"
  | "glitch"
  | "cyberClick"
  | "powerUp"
  | "panelOpen"
  | "panelClose"
  | "keyPress";

class CyberAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.35;
  private processingInterval: ReturnType<typeof setInterval> | null = null;
  private processingOscillators: { stop: () => void } | null = null;
  private lastLogBurstTime: number = 0;
  private listeners: Set<() => void> = new Set();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Restore persisted preferences
      try {
        const storedMute = localStorage.getItem("nexis_audio_muted");
        if (storedMute !== null) {
          this.isMuted = storedMute === "true";
        }
        const storedVol = localStorage.getItem("nexis_audio_volume");
        if (storedVol !== null) {
          this.volume = Math.max(0, Math.min(1, parseFloat(storedVol) || 0.35));
        }
      } catch {
        // Fallback to defaults
      }

      // Auto-unlock on first user interaction anywhere on the document
      const autoUnlock = () => {
        this.unlockAudio();
        window.removeEventListener("click", autoUnlock);
        window.removeEventListener("keydown", autoUnlock);
        window.removeEventListener("touchstart", autoUnlock);
      };

      window.addEventListener("click", autoUnlock, { once: true });
      window.addEventListener("keydown", autoUnlock, { once: true });
      window.addEventListener("touchstart", autoUnlock, { once: true });
    }
  }

  /**
   * Initializes or resumes the AudioContext after user gesture.
   */
  public async unlockAudio(): Promise<void> {
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    }

    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        // Ignored if user hasn't satisfied gesture requirements yet
      }
    }
  }

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      void this.unlockAudio();
    }
    return this.ctx;
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error("Audio listener error:", e);
      }
    });
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem("nexis_audio_muted", String(muted));
    } catch {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.play("cyberClick");
    }
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem("nexis_audio_volume", String(this.volume));
    } catch {}

    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Low-level Synthesis Primitives
  // ─────────────────────────────────────────────────────────────────────────

  private createTone(
    freq: number,
    type: OscillatorType = "sine",
    duration = 0.1,
    gainLevel = 0.2,
    pitchEnd?: number
  ) {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (pitchEnd !== undefined && pitchEnd > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, pitchEnd), t + duration);
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(gainLevel, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  private createNoise(
    duration = 0.08,
    gainLevel = 0.1,
    bandpassFreq = 2400,
    q = 3.0
  ) {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const t = ctx.currentTime;
    const bufferSize = Math.max(256, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(bandpassFreq, t);
    filter.Q.setValueAtTime(q, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(gainLevel, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(t);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // High-Level Cyberpunk Hacking Cues
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Hacker terminal keystroke: fast high-tech mechanical click with subtle randomized pitch.
   */
  public terminalKey() {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    const baseFreq = 1400 + (Math.random() - 0.5) * 400; // 1200 - 1600Hz
    this.createTone(baseFreq, "triangle", 0.035, 0.12, baseFreq * 0.45);
    this.createNoise(0.02, 0.08, 4200, 4.0);
  }

  /**
   * Log ingestion burst: 3 rapid electronic data packets when logs stream in.
   * Throttled to avoid deafening during bulk imports.
   */
  public logBurst() {
    const now = Date.now();
    if (now - this.lastLogBurstTime < 280) return; // rate-limit
    this.lastLogBurstTime = now;

    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    const freqs = [1900, 2400, 3100];
    freqs.forEach((freq, idx) => {
      setTimeout(() => {
        this.createTone(freq, "sine", 0.025, 0.08, freq * 1.25);
      }, idx * 28);
    });
  }

  /**
   * Warning / Error Identified: dissonant cybernetic dual-tone glitch warning.
   */
  public errorDetected() {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    // Dissonant minor second clash descending into low bandpass
    this.createTone(440, "sawtooth", 0.22, 0.25, 140);
    this.createTone(415.3, "square", 0.24, 0.18, 130);
    this.createNoise(0.18, 0.14, 850, 1.5);
  }

  /**
   * Critical threat alarm: pulsed dual alert siren for high-severity issues.
   */
  public threatAlert() {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    [0, 180].forEach((delay) => {
      setTimeout(() => {
        this.createTone(880, "sawtooth", 0.14, 0.3, 580);
        this.createTone(920, "square", 0.14, 0.2, 600);
      }, delay);
    });
  }

  /**
   * Target Lock / Scan Sweep: futuristic radar sweep when inspecting an error or AST node.
   */
  public scanSweep() {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    // Rising sweep then locking pip
    this.createTone(520, "sine", 0.18, 0.18, 1600);
    setTimeout(() => {
      this.createTone(2093, "triangle", 0.08, 0.2, 1046);
    }, 160);
  }

  /**
   * Cyberpunk Data Burst: crisp, non-irritating, high-tech electronic data stream packet.
   * Plays 4 ascending/descending micro-pips in ~160ms and stops naturally with zero looping.
   */
  public dataBurst() {
    this.stopProcessing();

    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const t = ctx.currentTime;
    const pips = [1760, 2217, 2793, 2349]; // Harmonic electronic data cascade
    pips.forEach((freq, idx) => {
      const pipTime = t + idx * 0.036;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, pipTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, pipTime + 0.026);

      gain.gain.setValueAtTime(0.0001, pipTime);
      gain.gain.exponentialRampToValueAtTime(0.055, pipTime + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, pipTime + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(pipTime);
      osc.stop(pipTime + 0.034);
    });
  }

  /**
   * Starts processing: triggers a discrete, pleasing cyberpunk data burst packet.
   * Does NOT loop infinitely to ensure it never gets stuck or irritates the user.
   */
  public startProcessing() {
    this.stopProcessing();
    this.dataBurst();
  }

  /**
   * Stops any processing sound immediately.
   */
  public stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    if (this.processingOscillators) {
      try {
        this.processingOscillators.stop();
      } catch {}
      this.processingOscillators = null;
    }
  }

  /**
   * Single discrete computation step (e.g. AST evaluation / token step):
   * Quick single data chirp.
   */
  public processingStep() {
    this.dataBurst();
  }

  /**
   * Success / Patch Applied / System Stabilized:
   * Futuristic ascending cyberpunk chord resolve (C6 -> E6 -> G6 -> C7).
   */
  public successResolve() {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.createTone(freq, "sine", 0.18, 0.16);
      }, idx * 55);
    });
  }

  /**
   * Patch deployed or committed to Git: mechanical confirmation bleep + resolve.
   */
  public patchApplied() {
    this.terminalKey();
    setTimeout(() => {
      this.successResolve();
    }, 80);
  }

  /**
   * Glitch burst: cyber noise burst with square-wave frequency displacement.
   */
  public glitch() {
    this.createNoise(0.12, 0.18, 1200, 1.2);
    this.createTone(280, "square", 0.09, 0.15, 80);
  }

  /**
   * Cyberpunk panel/modal opening swoosh & high-tech lock sound.
   */
  public panelOpen() {
    this.createTone(480, "triangle", 0.09, 0.14, 1200);
    setTimeout(() => {
      this.createTone(1760, "sine", 0.05, 0.12);
    }, 50);
  }

  /**
   * Cyberpunk panel/modal dismiss click.
   */
  public panelClose() {
    this.createTone(1100, "triangle", 0.06, 0.12, 380);
  }

  /**
   * Keyboard / tab key press.
   */
  public keyPress() {
    this.terminalKey();
  }

  /**
   * Tactical tactile UI click for buttons, tabs, and modals.
   */
  public cyberClick() {
    this.createTone(900, "triangle", 0.025, 0.1, 450);
  }

  /**
   * Cyber reactor power-up tone.
   */
  public powerUp() {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    this.createNoise(0.6, 0.1, 800, 2.0);
    this.createTone(110, "sawtooth", 0.7, 0.18, 880);
    setTimeout(() => {
      this.createTone(1760, "sine", 0.25, 0.2);
    }, 550);
  }

  /**
   * Universal cue trigger.
   */
  public play(cue: CyberSoundCue) {
    switch (cue) {
      case "terminalKey":
        return this.terminalKey();
      case "logBurst":
        return this.logBurst();
      case "dataBurst":
        return this.dataBurst();
      case "errorDetected":
        return this.errorDetected();
      case "threatAlert":
        return this.threatAlert();
      case "processingStart":
        return this.startProcessing();
      case "processingStep":
        return this.processingStep();
      case "processingComplete":
        this.stopProcessing();
        return this.successResolve();
      case "scanSweep":
      case "targetLock":
        return this.scanSweep();
      case "patchApplied":
        return this.patchApplied();
      case "successResolve":
        return this.successResolve();
      case "glitch":
        return this.glitch();
      case "cyberClick":
        return this.cyberClick();
      case "powerUp":
        return this.powerUp();
      case "panelOpen":
        return this.panelOpen();
      case "panelClose":
        return this.panelClose();
      case "keyPress":
        return this.keyPress();
    }
  }
}

// Global singleton instance
export const cyberAudio = new CyberAudioManager();
