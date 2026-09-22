import { gsap } from "gsap";
import { ACT_IDS, HERO, NOISE_KEYS, type ActId, type NoiseKey } from "./hero-config";

// Mutable scene state. The GSAP timeline writes it; the canvases, the 3D device,
// the DOM readouts and the sound graph read it every frame. Scroll is the only
// clock for these values, so reversing the scroll reverses the story exactly.
export type HeroState = {
  progress: number; // 0–1 of the pinned span
  noise: Record<NoiseKey, number>; // mix weight per stem
  gunT: number; // 0–3, how many gunshot spikes have fired
  cancel: number; // Act 3: stationary noise being cancelled (amber)
  split: number; // primary + ref streams
  refFlip: number; // ref ghost inverts (0–0.5) and slides onto primary (0.5–1)
  taps: number; // NLMS convergence
  wave: number; // waveform drawn (content alpha)
  spectrum: number; // Bark bars grown out of the baseline
  baseLine: number; // Act 4→5 match cut: baseline drawn across the band
  mask: number; // RNNoise gain mask descent
  imp: number; // late impulses arriving
  clamp: number; // impulses clamped by the mask
  quant: number; // int8 step look
  comb: number; // post-filter comb teeth
  floor: number; // residual energy between harmonics
  ghost: number; // Act 7 before/after ghost
  bloom: number; // the one permitted glow, under the final clean line
  snr: number;
  // Layer roles (primary = 1 / 0 blur, supporting = 0.5 / 1.5 px).
  waveA: number;
  waveBlur: number;
  devA: number;
  devBlur: number;
  // Device and camera.
  devIn: number; // enters from the right
  devScale: number;
  lid: number; // lid opacity
  tilt: number; // 0 rest, 1 looking into the enclosure
  headset: number;
  link: number;
  led: number;
  // Frame.
  grid: number;
  zoom: number;
  metrics: number;
  // Written by DeviceModel each frame: device screen bounds in CSS px.
  deviceRect: { l: number; t: number; r: number; b: number } | null;
};

export function createHeroState(): HeroState {
  return {
    progress: 0,
    noise: { gunshot: 0, rotor: 0, engine: 0, siren: 0, wind: 0 },
    gunT: 0,
    cancel: 0,
    split: 0,
    refFlip: 0,
    taps: 0,
    wave: 1,
    spectrum: 0,
    baseLine: 0,
    mask: 0,
    imp: 0,
    clamp: 0,
    quant: 0,
    comb: 0,
    floor: 1,
    ghost: 0,
    bloom: 0,
    snr: HERO.snr.infinity,
    waveA: 0.5,
    waveBlur: 1.5,
    devA: 0,
    devBlur: 0,
    devIn: 0,
    devScale: 1,
    lid: 1,
    tilt: 0,
    headset: 0,
    link: 0,
    led: 0,
    grid: 1,
    zoom: 1,
    metrics: 0,
    deviceRect: null,
  };
}

// Shared instance for the live scene.
export const heroState = createHeroState();

/* ------------------------------------------------------------ act windows */

export type Range = readonly [number, number];
export type ActWindow = { span: Range; enter: Range; hold: Range; exit: Range };

/** Enter / hold / exit ranges (in % of the pin) derived from HERO.acts. */
export function actWindow(id: ActId): ActWindow {
  const a = HERO.acts.find((x) => x.id === id)!;
  const edge = (a.end - a.start) * HERO.window.edge;
  return {
    span: [a.start, a.end],
    enter: [a.start, a.start + edge],
    hold: [a.start + edge, a.end - edge],
    exit: [a.end - edge, a.end],
  };
}

/** A slice of a range, by fraction. */
export const sub = (r: Range, f0: number, f1: number): Range => [r[0] + (r[1] - r[0]) * f0, r[0] + (r[1] - r[0]) * f1];

// Copy blocks leave a dead zone at every act boundary, so two never overlap.
export const copyIn = (id: ActId): Range => {
  const w = actWindow(id);
  return [w.enter[0] + HERO.window.copyGap, w.enter[1]];
};
export const copyOut = (id: ActId): Range => {
  const w = actWindow(id);
  return [w.exit[0], w.exit[1] - HERO.window.copyGap];
};

const at = (r: Range) => r[0];
const dur = (r: Range) => r[1] - r[0];

/**
 * Adds every stage tween to a timeline whose total duration is 100 (one unit
 * per % of the pinned span). DOM tweens are added in HeroScene, so the
 * reduced-motion build can reuse this to snapshot still frames.
 */
export function addStateTweens(tl: gsap.core.Timeline, s: HeroState) {
  const snr = HERO.snr;
  const lin = "none";
  const cam = "power3.inOut";
  const to = (target: object, r: Range, vars: gsap.TweenVars, ease = lin) =>
    tl.to(target, { ...vars, ease, duration: dur(r) }, at(r));
  const [, w1, w2, w3, w4, w5, w6, w7] = ACT_IDS.map(actWindow);

  // Act 1 — chaos. Slow push-in while noise arrives one stem at a time.
  to(s, w1.enter, { waveA: 1, waveBlur: 0 }, cam);
  to(s, [w1.enter[0], w1.exit[1]], { zoom: 1.04 });
  NOISE_KEYS.forEach((k, i) => to(s.noise, sub(w1.hold, i / 5, (i + 0.8) / 5), { [k]: 1 }));
  to(s, sub(w1.hold, 0, 0.8 / 5), { gunT: 3 });
  tl.fromTo(s, { snr: snr.infinity }, { snr: snr.buried, duration: dur(w1.hold), ease: lin }, at(w1.hold));

  // Act 2 — two ears. Pull back; device enters from the right.
  to(s, w2.enter, { zoom: 1, devIn: 1, devA: 1, headset: 1, split: 1, waveA: 0.5, waveBlur: 1.5 }, cam);
  to(s, sub(w2.hold, 0.05, 0.3), { link: 1 });
  to(s, w2.exit, { headset: 0, link: 0 }, cam);

  // Act 3 — prefilter. Close-up on the chip, cancellation.
  to(s, w3.enter, { waveA: 1, waveBlur: 0, devScale: 1.35, lid: 0.12, tilt: 1 }, cam);
  to(s, sub(w3.hold, 0, 0.4), { refFlip: 1 });
  to(s, sub(w3.hold, 0.1, 0.8), { taps: 1 });
  to(s, sub(w3.hold, 0.35, 0.6), { cancel: 1 });
  to(s.noise, sub(w3.hold, 0.5, 0.85), { engine: 0.1, rotor: 0.1, wind: 0.1 });
  to(s, sub(w3.hold, 0.45, 0.8), { split: 0 }, cam);
  to(s, sub(w3.hold, 0.35, 0.9), { snr: snr.afterPrefilter });
  // Camera pushes into the chip; the device fades at the end of the push.
  to(s, w3.exit, { devScale: 1.9, devA: 0, wave: 0 }, cam);

  // Act 4 — gate (insert shot). Match cut: the input line becomes the baseline.
  to(s, w4.exit, { baseLine: 1 }, cam);

  // Act 5 — RNNoise. Bars grow out of the baseline.
  to(s, w5.enter, { spectrum: 1, grid: 0 }, cam);
  to(s, sub(w5.hold, 0, 0.55), { mask: 1 });
  to(s.noise, sub(w5.hold, 0, 0.55), { engine: 0, rotor: 0, wind: 0, siren: 0 });
  to(s, sub(w5.hold, 0.5, 0.6), { imp: 1 });
  to(s, sub(w5.hold, 0.6, 0.64), { clamp: 1 });
  to(s.noise, sub(w5.hold, 0.6, 0.64), { gunshot: 0 });
  to(s, sub(w5.hold, 0.68, 0.95), { quant: 1 });
  to(s, sub(w5.hold, 0, 0.9), { snr: snr.afterRnnoise });

  // Act 6 — post-filter. Then morph: bars collapse back into the waveform.
  to(s, w6.enter, { comb: 1 }, cam);
  to(s, sub(w6.hold, 0.1, 0.6), { floor: 0 });
  to(s, sub(w6.hold, 0.1, 0.8), { snr: snr.afterPostfilter });
  to(s, w6.exit, { comb: 0, spectrum: 0, wave: 1, baseLine: 0 }, cam);

  // Act 7 — clean. Device and headset return, linked, as the supporting frame.
  to(s, w7.enter, { grid: 1, devA: 0.6, devBlur: 1.5, devScale: 1, lid: 1, tilt: 0, bloom: 1, headset: 1 }, cam);
  to(s, sub(w7.hold, 0.05, 0.3), { link: 1 });
  to(s, sub(w7.hold, 0, 0.2), { led: 1 });
  to(s, sub(w7.hold, 0, 0.1), { ghost: 1 });
  to(s, sub(w7.hold, 0.1, 0.25), { ghost: 0 });
  to(s, sub(w7.hold, 0.05, 0.45), { metrics: 1 });

  // Pad to exactly 100 units so labels map 1:1 to scroll %.
  tl.to({}, { duration: 0 }, 100);
  HERO.acts.forEach((a) => tl.addLabel(a.id, a.start));
  return tl;
}

export function actIndexAt(progress: number) {
  const p = progress * 100;
  let idx = 0;
  HERO.acts.forEach((a, i) => {
    if (p >= a.start) idx = i;
  });
  return idx;
}

// One shared frame loop (driven by gsap.ticker in HeroScene). Subscribers only
// run while the hero is in view.
export type FrameFn = (time: number) => void;
const frameSubs = new Set<FrameFn>();
export function onHeroFrame(fn: FrameFn) {
  frameSubs.add(fn);
  return () => {
    frameSubs.delete(fn);
  };
}
export function runHeroFrame(time: number) {
  frameSubs.forEach((fn) => fn(time));
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
