// Simulated feed. It replays the recorded noise profiles the hero already ships
// (public/hero/*.json) and synthesises telemetry frames from them, so the live
// panels can be exercised with no hardware present.
//
// Nothing here is measured. Every screen driven by this source carries a
// SIMULATED tag for as long as it is running.

import { PROTOCOL, type LiveFrame, type Stage } from "./protocol";

export const SIM_SCENES = ["gunshot", "rotor", "engine", "siren", "wind"] as const;
export type SimScene = (typeof SIM_SCENES)[number];

export type NoiseProfile = {
  name: string;
  sampleRate: number;
  seconds: number;
  envelope: Float32Array;
  spectrum: Float32Array;
};

export type SimProfiles = { scenes: NoiseProfile[]; voice: NoiseProfile };

const floats = (v: unknown): Float32Array => (Array.isArray(v) ? Float32Array.from(v, (n) => (typeof n === "number" && Number.isFinite(n) ? n : 0)) : new Float32Array(1));

async function loadProfile(name: string): Promise<NoiseProfile> {
  const response = await fetch(`/hero/${name}.json`, { cache: "force-cache" });
  if (!response.ok) throw new Error(`${name}.json — ${response.status}`);
  const raw = (await response.json()) as Record<string, unknown>;
  return {
    name,
    sampleRate: typeof raw.sampleRate === "number" ? raw.sampleRate : PROTOCOL.sampleRate,
    seconds: typeof raw.seconds === "number" && raw.seconds > 0 ? raw.seconds : 3.5,
    envelope: floats(raw.envelope),
    spectrum: floats(raw.spectrum),
  };
}

let cache: Promise<SimProfiles> | null = null;

/**
 * Loads the hero profiles once per page load. The requests are deliberately not
 * abortable: the result is shared, so one caller going away must not cancel it
 * for the next one.
 */
export function loadSimProfiles(): Promise<SimProfiles> {
  cache ??= Promise.all([...SIM_SCENES.map((n) => loadProfile(n)), loadProfile("voice")])
    .then((all) => ({ scenes: all.slice(0, SIM_SCENES.length), voice: all[all.length - 1] }))
    .catch((error: unknown) => {
      cache = null; // a failed load must not poison the next attempt
      throw error;
    });
  return cache;
}

const SCENE_MS = 7000;
const BINS = PROTOCOL.fftSize / 2;
const EPS = 1e-4;

const sampleEnvelope = (p: NoiseProfile, ms: number) => {
  const period = p.seconds * 1000;
  const u = ((ms % period) + period) % period / period;
  return p.envelope[Math.min(p.envelope.length - 1, Math.floor(u * p.envelope.length))];
};

const toDb = (magnitude: number) => Math.max(PROTOCOL.dbFloor, 20 * Math.log10(magnitude + EPS));

function spectrum(noise: NoiseProfile, noiseLevel: number, voice: NoiseProfile, voiceLevel: number, residual: number) {
  const out = new Float32Array(BINS);
  for (let i = 0; i < BINS; i++) {
    const j = Math.min(noise.spectrum.length - 1, Math.floor((i / BINS) * noise.spectrum.length));
    const k = Math.min(voice.spectrum.length - 1, Math.floor((i / BINS) * voice.spectrum.length));
    const jitter = 0.85 + Math.random() * 0.3;
    out[i] = toDb((noise.spectrum[j] * noiseLevel * residual + voice.spectrum[k] * voiceLevel) * jitter * 0.6);
  }
  return out;
}

export type SimulatedFeed = { start: () => void; stop: () => void };

/**
 * Emits frames at the nominal telemetry rate, pausing while the tab is hidden
 * so a backgrounded page never looks like a stalled device.
 */
export function createSimulatedFeed(
  profiles: SimProfiles,
  onFrame: (frame: LiveFrame) => void,
  onScene?: (scene: string) => void,
): SimulatedFeed {
  let timer = 0;
  let started = 0;
  let sceneIndex = -1;
  let running = false;

  const tick = () => {
    const now = performance.now();
    const t = now - started;

    const next = Math.floor(t / SCENE_MS) % profiles.scenes.length;
    if (next !== sceneIndex) {
      sceneIndex = next;
      onScene?.(profiles.scenes[sceneIndex].name);
    }
    const noise = profiles.scenes[sceneIndex];

    // Speech comes and goes and the noise floor drifts, so the gate flips on its
    // own and both branches of the chain get exercised.
    const noiseLevel = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t / 5200));
    const voiceLevel = 0.55;
    const noiseRms = sampleEnvelope(noise, t) * noiseLevel;
    const voiceRms = sampleEnvelope(profiles.voice, t * 0.83) * voiceLevel;

    const snrDb = Math.max(-15, Math.min(25, 20 * Math.log10((voiceRms + EPS) / (noiseRms + EPS))));
    const stage: Stage = snrDb >= PROTOCOL.gateSnrDb ? "dsp" : "dsp+rnnoise";
    const residual = stage === "dsp" ? 0.3 : 0.08;

    const inRms = Math.min(1, Math.hypot(voiceRms, noiseRms));
    const outRms = Math.min(1, Math.hypot(voiceRms, noiseRms * residual));

    onFrame({
      t: Math.round(t),
      snrDb: Number(snrDb.toFixed(2)),
      stage,
      inRms,
      outRms,
      fftIn: spectrum(noise, noiseLevel, profiles.voice, voiceLevel, 1),
      fftOut: spectrum(noise, noiseLevel, profiles.voice, voiceLevel, residual),
      latencyMs: Number((24 + 1.5 * Math.sin(t / 1700) + Math.random() * 0.6).toFixed(1)),
    });
  };

  const run = () => {
    if (timer || !running) return;
    timer = window.setInterval(tick, Math.round(1000 / PROTOCOL.telemetryHz));
  };
  const halt = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = 0;
  };
  const onVisibility = () => (document.hidden ? halt() : run());

  return {
    start() {
      if (running) return;
      running = true;
      started = performance.now();
      sceneIndex = -1;
      document.addEventListener("visibilitychange", onVisibility);
      if (!document.hidden) run();
    },
    stop() {
      running = false;
      halt();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
