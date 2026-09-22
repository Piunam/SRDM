// Playback transport: play, pause, seek, A/B switch and playhead ticks.
//
// Two modes:
//   "sync"  every track runs on one shared timeline and only the active one is
//           audible, so switching A/B keeps the playhead and crossfades in 15 ms.
//   "solo"  only the active track plays, from its own start — for unrelated
//           sample clips that share nothing but a play button.
//
// Only one Transport anywhere on the page is audible at a time: starting one
// pauses the rest.

export type TransportMode = "sync" | "solo";

export type TransportTrack = {
  id: string;
  buffer: AudioBuffer;
  /** Play at most this many seconds from the start of the clip. */
  limitSeconds?: number;
};

export type TransportState = {
  playing: boolean;
  activeId: string | null;
  time: number;
  duration: number;
};

export const IDLE_STATE: TransportState = { playing: false, activeId: null, time: 0, duration: 0 };

const CROSSFADE_SECONDS = 0.015;
const PUBLISH_INTERVAL_MS = 40;
export const ANALYSER_FFT_SIZE = 2048;

type Voice = {
  gain: GainNode;
  analyser: AnalyserNode;
  source: AudioBufferSourceNode | null;
};

const liveTransports = new Set<Transport>();

export class Transport {
  private tracks: TransportTrack[] = [];
  private voices = new Map<string, Voice>();
  private ctx: AudioContext | null = null;
  private activeId: string | null = null;
  private running = false;
  private startedAt = 0;
  private offset = 0;
  private raf = 0;
  private lastPublish = 0;
  private snapshot: TransportState = IDLE_STATE;
  private listeners = new Set<() => void>();

  constructor(
    private readonly acquireContext: () => AudioContext,
    private readonly mode: TransportMode = "sync",
  ) {}

  // ---------- external store ----------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  // ---------- queries ----------

  get isPlaying() {
    return this.running;
  }

  private trackLength(track: TransportTrack) {
    return Math.min(track.buffer.duration, track.limitSeconds ?? Infinity);
  }

  private get duration(): number {
    if (this.mode === "solo") {
      const track = this.tracks.find((t) => t.id === this.activeId);
      return track ? this.trackLength(track) : 0;
    }
    return this.tracks.reduce((max, t) => Math.max(max, this.trackLength(t)), 0);
  }

  private get position(): number {
    if (!this.running || !this.ctx) return this.offset;
    // Sources are scheduled slightly ahead, so clamp the pre-roll away.
    return Math.min(this.duration, Math.max(0, this.offset + (this.ctx.currentTime - this.startedAt)));
  }

  /** The analyser a track's signal passes through, once playback has built the graph. */
  analyser(id: string): AnalyserNode | null {
    return this.voices.get(id)?.analyser ?? null;
  }

  // ---------- setup ----------

  setTracks(tracks: TransportTrack[]) {
    const same =
      tracks.length === this.tracks.length &&
      tracks.every((t, i) => this.tracks[i].id === t.id && this.tracks[i].buffer === t.buffer && this.tracks[i].limitSeconds === t.limitSeconds);
    if (same) return;

    this.releaseNodes();
    this.tracks = tracks;
    this.offset = 0;
    if (!tracks.some((t) => t.id === this.activeId)) this.activeId = tracks[0]?.id ?? null;
    this.publish(true);
  }

  // ---------- playback ----------

  play(id?: string) {
    if (id && id !== this.activeId) {
      this.setActive(id);
      if (this.running) return;
    }
    if (this.running || this.duration === 0) return;

    const ctx = this.acquireContext();
    this.ctx = ctx;
    void ctx.resume();

    for (const other of liveTransports) if (other !== this) other.pause();
    liveTransports.add(this);

    this.startSources(ctx, this.offset);
    this.running = true;
    this.tick();
    this.publish(true);
  }

  pause() {
    if (!this.running) return;
    this.offset = this.position;
    this.running = false;
    this.stopSources();
    cancelAnimationFrame(this.raf);
    this.publish(true);
  }

  toggle(id: string) {
    if (this.running && this.activeId === id) this.pause();
    else this.play(id);
  }

  stop() {
    this.pause();
    this.offset = 0;
    this.publish(true);
  }

  seek(seconds: number) {
    const target = Math.min(Math.max(0, seconds), this.duration);
    if (this.running && this.ctx) {
      this.stopSources();
      this.offset = target;
      this.startSources(this.ctx, target);
    } else {
      this.offset = target;
    }
    this.publish(true);
  }

  /** A/B switch. In "sync" mode this is a 15 ms crossfade over a kept playhead. */
  setActive(id: string) {
    if (id === this.activeId || !this.tracks.some((t) => t.id === id)) return;

    if (this.mode === "solo") {
      const wasPlaying = this.running;
      this.pause();
      this.offset = 0;
      this.activeId = id;
      if (wasPlaying) this.play();
      else this.publish(true);
      return;
    }

    this.activeId = id;
    this.applyGains(true);
    this.publish(true);
  }

  // ---------- graph ----------

  private voiceFor(ctx: AudioContext, id: string): Voice {
    let voice = this.voices.get(id);
    if (!voice) {
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = ANALYSER_FFT_SIZE;
      analyser.smoothingTimeConstant = 0.6;
      // Tap before the gain, so a muted A/B lane still shows its live spectrum.
      analyser.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0;
      voice = { gain, analyser, source: null };
      this.voices.set(id, voice);
    }
    return voice;
  }

  private startSources(ctx: AudioContext, from: number) {
    const playable = this.mode === "solo" ? this.tracks.filter((t) => t.id === this.activeId) : this.tracks;
    const when = ctx.currentTime + 0.02; // a beat of headroom so every source starts together
    for (const track of playable) {
      const length = this.trackLength(track);
      if (from >= length) continue;
      const voice = this.voiceFor(ctx, track.id);
      const source = ctx.createBufferSource();
      source.buffer = track.buffer;
      source.connect(voice.analyser);
      source.start(when, from, length - from);
      voice.source = source;
    }
    this.startedAt = when;
    this.applyGains(false);
  }

  private stopSources() {
    for (const voice of this.voices.values()) {
      if (!voice.source) continue;
      try {
        voice.source.stop();
      } catch {
        // Already stopped; nothing to do.
      }
      voice.source.disconnect();
      voice.source = null;
    }
  }

  private applyGains(fade: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const [id, voice] of this.voices) {
      const target = id === this.activeId ? 1 : 0;
      voice.gain.gain.cancelScheduledValues(now);
      if (fade) {
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(target, now + CROSSFADE_SECONDS);
      } else {
        voice.gain.gain.setValueAtTime(target, now);
      }
    }
  }

  private tick = () => {
    if (!this.running) return;
    if (this.position >= this.duration - 1e-3) {
      this.running = false;
      this.offset = 0;
      this.stopSources();
      this.publish(true);
      return;
    }
    this.publish(false);
    this.raf = requestAnimationFrame(this.tick);
  };

  private publish(force: boolean) {
    const now = typeof performance === "undefined" ? 0 : performance.now();
    if (!force && now - this.lastPublish < PUBLISH_INTERVAL_MS) return;
    this.lastPublish = now;
    this.snapshot = { playing: this.running, activeId: this.activeId, time: this.position, duration: this.duration };
    for (const listener of this.listeners) listener();
  }

  // ---------- teardown ----------

  private releaseNodes() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stopSources();
    for (const voice of this.voices.values()) {
      voice.analyser.disconnect();
      voice.gain.disconnect();
    }
    this.voices.clear();
    liveTransports.delete(this);
  }

  /** Drops every node but leaves the instance reusable (React may remount it). */
  teardown() {
    this.releaseNodes();
    this.tracks = [];
    this.offset = 0;
    this.activeId = null;
    this.ctx = null;
    this.snapshot = IDLE_STATE;
  }
}
