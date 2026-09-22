"use client";

import { useEffect, useRef } from "react";
import { HERO, NOISE_KEYS, type NoiseKey } from "./hero-config";
import { frameLayout, type FrameLayout } from "./hero-layout";
import { clamp01, heroState, lerp, onHeroFrame, type HeroState } from "./hero-state";

/* ------------------------------------------------------------------ data */

export type Clip = { envelope: number[]; spectrum: number[] };
export type ClipName = "voice" | NoiseKey;
export type SignalData = Record<ClipName, Clip> & {
  bark: Record<ClipName, number[]>;
  harmonic: boolean[]; // Bark bands that carry voice harmonics (local peaks)
};

const CLIPS: ClipName[] = ["voice", ...NOISE_KEYS];

function toBark(spec: number[], bands: number) {
  // Log-spaced 64 bands → 22 display bands, averaged.
  const out: number[] = [];
  const step = spec.length / bands;
  for (let b = 0; b < bands; b++) {
    let sum = 0;
    let n = 0;
    for (let i = Math.floor(b * step); i < Math.floor((b + 1) * step); i++) {
      sum += spec[i];
      n++;
    }
    out.push(n ? sum / n : 0);
  }
  return out;
}

function fallbackClip(seed: number): Clip {
  const envelope = Array.from({ length: 256 }, (_, i) => 0.5 + 0.5 * Math.sin(i * 0.11 * seed) ** 2);
  const spectrum = Array.from({ length: 64 }, (_, i) => 0.3 + 0.3 * Math.sin(i * 0.2 * seed));
  return { envelope, spectrum };
}

function withBark(clips: Record<ClipName, Clip>): SignalData {
  const bark = {} as Record<ClipName, number[]>;
  CLIPS.forEach((c) => (bark[c] = toBark(clips[c].spectrum, HERO.signal.bands)));
  const v = bark.voice;
  const harmonic = v.map((x, i) => x >= (v[i - 1] ?? 0) && x >= (v[i + 1] ?? 0) && x > 0.15);
  return { ...clips, bark, harmonic };
}

let signalData: SignalData = withBark(
  Object.fromEntries(CLIPS.map((c, i) => [c, fallbackClip(i + 1)])) as Record<ClipName, Clip>,
);
let loading: Promise<SignalData> | null = null;

export function loadSignalData() {
  loading ??= Promise.all(
    CLIPS.map((c) => fetch(`/hero/${c}.json`).then((r) => (r.ok ? (r.json() as Promise<Clip>) : fallbackClip(1)))),
  )
    .then((clips) => {
      signalData = withBark(Object.fromEntries(CLIPS.map((c, i) => [c, clips[i]])) as Record<ClipName, Clip>);
      return signalData;
    })
    .catch(() => signalData);
  return loading;
}

/* --------------------------------------------------------------- helpers */

const C = HERO.colors;
type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const RGB_CY = hex(C.cy);
const RGB_AMBER = hex(C.amber);
const RGB_FAULT = hex(C.fault);
const RGB_WHITE = hex(C.white);
const RGB_DIM = hex(C.dim);
const RGB_SILVER = hex(C.silver);
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp01(a)})`;

function sampleLoop(arr: number[], x: number) {
  const n = arr.length;
  const f = (((x % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const t = f - i;
  return arr[i % n] * (1 - t) + arr[(i + 1) % n] * t;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const bump = (x: number, w: number) => Math.max(0, 1 - Math.abs(x) / w);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/* ----------------------------------------------------------- signal math */

// The clean voice. Deterministic in (u, t) so Act 7 matches Act 0 exactly.
function voiceAt(d: SignalData, u: number, t: number) {
  const e = 0.15 + 0.85 * sampleLoop(d.voice.envelope, u * 0.55 + t * 0.11);
  const breath = 0.82 + 0.18 * Math.sin(t * 1.25);
  const carrier = 0.65 * Math.sin(u * 60 + t * 5.5) + 0.35 * Math.sin(u * 151 - t * 3.7);
  return e * breath * carrier;
}

function gunIntensity(s: HeroState, k: number, t: number) {
  const fired = clamp01(s.gunT - k);
  const refire = 0.55 + 0.45 * Math.exp(-((t * 0.7 + k * 0.33) % 1) * 5);
  return fired * refire * s.noise.gunshot;
}

function noiseAt(d: SignalData, s: HeroState, u: number, t: number) {
  const n = s.noise;
  const eEnv = 0.6 + 0.4 * sampleLoop(d.engine.envelope, u * 0.8 + t * 0.2);
  const engine = eEnv * (0.55 * Math.sin(u * 420 + t * 9) + 0.45 * Math.sin(u * 977 - t * 13 + Math.sin(u * 37)));
  const pitch = lerp(40, 130, 0.5 + 0.5 * Math.sin(t * 0.9));
  const siren = Math.sin(u * pitch + t * 8);
  const windE = sampleLoop(d.wind.envelope, u * 1.3 + t * 0.35);
  const wind = windE * Math.sin(u * 2300 + t * 31) * 0.5;
  let gun = 0;
  HERO.signal.gunshotX.forEach((x, k) => {
    const dx = u - x;
    gun += gunIntensity(s, k, t) * Math.exp(-Math.abs(dx) * 70) * Math.sin(dx * 420);
  });
  const rotorMod = 1 + n.rotor * 0.8 * (0.5 + 0.5 * Math.sin(Math.PI * 2 * HERO.signal.rotorBladeHz * t));
  return (engine * n.engine * 0.8 + siren * n.siren * 0.55 + wind * n.wind + gun * 2.2) * rotorMod;
}

function noiseLoad(s: HeroState) {
  const n = s.noise;
  return n.engine + n.rotor * 0.6 + n.siren * 0.7 + n.wind * 0.5 + n.gunshot * 0.8;
}

// 0 = raw noise (red), 1 = noise a stage is removing (amber).
function handling(s: HeroState) {
  const n = s.noise;
  const h: Record<NoiseKey, number> = { engine: s.cancel, rotor: s.cancel, wind: s.cancel, siren: s.mask, gunshot: s.clamp };
  let sw = 0;
  let sh = 0;
  NOISE_KEYS.forEach((k) => {
    sw += n[k];
    sh += n[k] * h[k];
  });
  return sw > 1e-4 ? sh / sw : 0;
}

/** How much the device occludes the band (0 = not at all). */
function occlusion(L: FrameLayout, s: HeroState) {
  const r = s.deviceRect;
  if (!r || s.devA < 0.01) return 0;
  if (r.t > L.baseline || r.b < L.baseline) return 0;
  return clamp01(s.devA / 0.6);
}

/* ------------------------------------------------------------- rendering */

export type Pass = "back" | "front";

export function drawSignal(
  ctx: CanvasRenderingContext2D,
  L: FrameLayout,
  s: HeroState,
  t: number,
  pass: Pass,
  d: SignalData = signalData,
): boolean {
  const { W, H } = L;
  ctx.clearRect(0, 0, W, H);
  const occ = occlusion(L, s);
  const r = s.deviceRect;
  const cy = L.baseline;
  const span = L.bandR - L.bandL;
  const N = Math.max(160, Math.min(520, Math.floor(span / 2.2)));
  const load = noiseLoad(s);
  const noiseCol = handling(s) > 0.5 ? RGB_AMBER : RGB_FAULT;

  const taper = (u: number) => smooth(0, 0.04, u) * smooth(1, 0.96, u);
  const line = (y: number, fn: (u: number) => number, color: string, width: number, scaleY = 1, x0 = L.bandL) => {
    ctx.beginPath();
    let first = true;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = L.bandL + u * span;
      if (x < x0) continue;
      const yy = y + fn(u) * L.amp * taper(u) * scaleY;
      if (first) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
      first = false;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  // Noise is drawn in the exact tokens: red, cross-faded to amber while handled.
  const hand = handling(s);
  const noisy = (y: number, fn: (u: number) => number, alpha: number, width: number, scaleY = 1, x0 = L.bandL) => {
    if (hand < 0.99) line(y, fn, rgba(RGB_FAULT, alpha * (1 - hand)), width, scaleY, x0);
    if (hand > 0.01) line(y, fn, rgba(RGB_AMBER, alpha * hand), width, scaleY, x0);
  };

  if (pass === "front") {
    // Processed stream leaving the device, in front of it.
    if (!r || occ < 0.01 || s.wave < 0.01) return false;
    const resid = (1 - 0.8 * s.cancel) * (1 - s.mask);
    const x0 = r.r - 14;
    line(cy, (u) => voiceAt(d, u, t), rgba(RGB_CY, s.wave), 1.6, 1, x0);
    if (load * resid > 0.01)
      noisy(cy, (u) => voiceAt(d, u, t) + noiseAt(d, s, u, t) * resid * 0.6, clamp01(load * resid) * s.wave, 1.1, 1, x0);
    // Fade in from the device's right edge, scaled by how present the device is.
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const g = ctx.createLinearGradient(r.r - 14, 0, r.r + 14, 0);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, `rgba(0,0,0,${1 - occ})`);
    ctx.fillStyle = g;
    ctx.fillRect(r.r - 14, 0, L.bandR - r.r + 40, H);
    ctx.restore();
    return true;
  }

  /* ---- back pass ---- */

  if (s.wave > 0.01) {
    const A = s.wave;
    const buried = clamp01(load / 2.2);
    const flip = clamp01(s.refFlip * 2);
    const slide = smooth(0, 1, s.refFlip * 2 - 1);
    const primaryY = cy - (L.gap / 2) * s.split;
    const refY = lerp(cy + (L.gap / 2) * s.split, primaryY, slide);

    if (s.ghost > 0.01) {
      const was: HeroState = { ...s, noise: { gunshot: 1, rotor: 1, engine: 1, siren: 1, wind: 1 }, gunT: 3 };
      line(cy, (u) => voiceAt(d, u, t) + noiseAt(d, was, u, t), rgba(RGB_DIM, 0.35 * s.ghost), 1);
    }

    if (s.noise.engine > 0.01) {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = Math.round(L.bandL + u * span) + 0.5;
        const a = L.amp * 0.55 * s.noise.engine * (0.5 + 0.5 * Math.abs(Math.sin(u * 311 + t * 17))) * taper(u);
        ctx.moveTo(x, primaryY - a);
        ctx.lineTo(x, primaryY + a);
      }
      ctx.strokeStyle = rgba(noiseCol, 0.18 * A);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (s.split > 0.01) {
      const refA = s.split * (1 - s.cancel) * A;
      const flipScale = Math.cos(Math.PI * flip);
      const ref = (u: number) => noiseAt(d, s, u, t) + voiceAt(d, u, t) * 0.15;
      if (flip < 0.99) line(refY, ref, rgba(RGB_FAULT, 0.8 * refA * (1 - flip)), 1.1, flipScale);
      if (flip > 0.01) line(refY, ref, rgba(RGB_AMBER, 0.8 * refA * flip), 1.1, flipScale);
    }

    line(primaryY, (u) => voiceAt(d, u, t), rgba(RGB_CY, A * (1 - buried * 0.7)), 1.6);
    if (load > 0.01) noisy(primaryY, (u) => voiceAt(d, u, t) + noiseAt(d, s, u, t), clamp01(load * 0.9) * A, 1.1);

    // The stream passes behind the device: fade it out over 24 px at its left edge.
    if (r && occ > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const g = ctx.createLinearGradient(r.l - 12, 0, r.l + 12, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${occ})`);
      ctx.fillStyle = g;
      ctx.fillRect(r.l - 12, cy - L.gap - L.amp * 3, L.bandR - r.l + 40, 2 * (L.gap + L.amp * 3));
      ctx.restore();
    }

    // Grain, rotor sweep and the bloom sit behind the streams.
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    // The only permitted glow: a soft bloom under the final clean line.
    if (s.bloom > 0.01) {
      const rr = H * 0.22;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
      g.addColorStop(0, rgba(RGB_CY, 0.09 * s.bloom * A));
      g.addColorStop(1, rgba(RGB_CY, 0));
      ctx.save();
      ctx.translate((L.bandL + L.bandR) / 2, cy);
      ctx.scale(span / 2 / rr, 1);
      ctx.fillStyle = g;
      ctx.fillRect(-rr, -rr, 2 * rr, 2 * rr);
      ctx.restore();
    }
    if (s.noise.wind > 0.01) {
      for (let i = 0; i < 240; i++) {
        const x = L.bandL + ((hash(i) + t * (0.02 + hash(i + 9) * 0.05)) % 1) * span;
        const y = cy + (hash(i + 3) - 0.5) * L.amp * 7 + Math.sin(t + i) * 5;
        ctx.fillStyle = rgba(noiseCol, s.noise.wind * (0.12 + hash(i + 5) * 0.28) * A);
        ctx.fillRect(x, y, 1.2, 1.2);
      }
    }
    if (s.noise.rotor > 0.01) {
      const ox = (L.bandL + L.bandR) / 2;
      for (let i = 0; i < 4; i++) {
        const f = (t * HERO.signal.rotorBladeHz * 0.5 + i / 4) % 1;
        ctx.beginPath();
        ctx.arc(ox, cy, 20 + f * span * 0.5, Math.PI * 0.8, Math.PI * 1.2);
        ctx.strokeStyle = rgba(noiseCol, s.noise.rotor * 0.1 * (1 - f) * A);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();

    // Gunshot flash.
    let flash = 0;
    for (let k = 0; k < 3; k++) flash = Math.max(flash, bump(s.gunT - k - 0.04, 0.06));
    flash *= s.noise.gunshot;
    if (flash > 0.01) {
      ctx.fillStyle = rgba(RGB_WHITE, flash * 0.06);
      ctx.fillRect(0, 0, W, H);
    }
  }

  if (s.baseLine > 0.001 || s.spectrum > 0.001) drawSpectrum(ctx, L, s, t, d);
  return true;
}

function bandValues(d: SignalData, s: HeroState, t: number, b: number) {
  const n = s.noise;
  const vEnv = 0.35 + 0.65 * sampleLoop(d.voice.envelope, t * 0.11 + b * 0.004);
  const v = d.bark.voice[b] * vEnv * (0.8 + 0.2 * Math.sin(t * 3 + b));
  let noise = 0;
  noise += n.engine * d.bark.engine[b] * (0.8 + 0.2 * Math.sin(t * 11 + b * 2));
  noise += n.rotor * d.bark.rotor[b] * (0.5 + 0.5 * Math.sin(Math.PI * 2 * HERO.signal.rotorBladeHz * t));
  noise += n.siren * d.bark.siren[b] * bump(b / HERO.signal.bands - (0.55 + 0.2 * Math.sin(t * 0.9)), 0.12) * 1.6;
  noise += n.wind * d.bark.wind[b] * (0.6 + 0.4 * Math.sin(t * 2.3 + b * 0.7)) * 0.7;
  noise += n.gunshot * d.bark.gunshot[b] * 0.4 * (0.5 + 0.5 * Math.sin(t * 7));
  noise += s.imp * (1 - s.clamp) * (0.6 + 0.3 * d.bark.gunshot[b]);
  return { v, noise: noise * 0.6 };
}

function gainFor(s: HeroState, v: number, noise: number) {
  const ratio = v / (v + noise + 1e-4);
  const g = lerp(1, clamp01(ratio * 1.15), s.mask);
  const steps = HERO.signal.quantSteps;
  return lerp(g, Math.round(g * steps) / steps, s.quant);
}

let monoFont = "";

function drawSpectrum(ctx: CanvasRenderingContext2D, L: FrameLayout, s: HeroState, t: number, d: SignalData) {
  const B = HERO.signal.bands;
  const base = L.baseline;
  const a = s.spectrum;
  const slot = (L.barsR - L.barsL) / B;
  const bw = slot * 0.6;
  const cx = (b: number) => L.barsL + b * slot + slot / 2;

  // Baseline. In the match cut it is the gate's input line (teal) stretching
  // across the band, then it settles to a hairline.
  const len = Math.max(s.baseLine, a > 0.001 ? 1 : 0);
  ctx.fillStyle = rgba(mix(RGB_CY, RGB_SILVER, a), lerp(0.9, 0.18, a) * Math.max(s.baseLine, a));
  ctx.fillRect(L.bandL, Math.round(base), (L.bandR - L.bandL) * len, 1);
  if (a < 0.001) return;

  const tops: number[] = [];
  const gains: number[] = [];
  for (let b = 0; b < B; b++) {
    const { v, noise } = bandValues(d, s, t, b);
    const g = gainFor(s, v, noise);
    gains.push(g);
    const x = cx(b) - bw / 2;
    const hv = Math.min(1, v * g) * L.maxH * a;
    const resid = d.harmonic[b] ? 0 : s.floor * s.comb * 0.12 * L.maxH * a;
    const hn = Math.min(1, noise * g) * L.maxH * a + resid;
    tops.push(base - hv - hn);
    ctx.fillStyle = rgba(RGB_CY, d.harmonic[b] ? 1 : 1 - 0.55 * s.comb);
    ctx.beginPath();
    ctx.roundRect(x, base - hv, bw, hv, hn > 0.5 ? 0 : [2, 2, 0, 0]);
    ctx.fill();
    if (hn > 0.5) {
      ctx.fillStyle = rgba(RGB_AMBER, 1);
      ctx.beginPath();
      ctx.roundRect(x, base - hv - hn, bw, hn, [2, 2, 0, 0]);
      ctx.fill();
    }
  }

  // Axis.
  monoFont ||= getComputedStyle(document.body).getPropertyValue("--font-geist-mono").trim() || "monospace";
  ctx.font = `500 10px ${monoFont}, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = rgba(RGB_DIM, a);
  for (const tick of HERO.signal.axis) ctx.fillText(tick.label, cx(tick.band), base + 10);

  // Gain mask: one white line with a dot per band, descending from above.
  const maskA = Math.min(1, s.mask * 4) * (1 - s.comb) * a;
  if (maskA > 0.01) {
    const top = base - L.maxH - 14;
    const pts = gains.map((g, b) => [cx(b), lerp(top, base - g * L.maxH, Math.min(1, s.mask * 1.4))] as const);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = rgba(RGB_WHITE, maskA);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = rgba(RGB_WHITE, maskA);
    for (const [x, y] of pts) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Post-filter comb: thin teeth over the harmonic bars only.
  if (s.comb > 0.01) {
    const slideIn = (1 - smooth(0, 1, s.comb)) * slot * 3;
    ctx.beginPath();
    for (let b = 0; b < B; b++) {
      if (!d.harmonic[b]) continue;
      const x = Math.round(cx(b) + slideIn + Math.sin(t * 2.1 + b) * 1.2) + 0.5;
      if (x > L.barsR) continue;
      ctx.moveTo(x, base);
      ctx.lineTo(x, Math.min(tops[b] - 12, base - L.maxH));
    }
    ctx.strokeStyle = rgba(RGB_CY, 0.7 * s.comb * a);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/* ------------------------------------------------------------ component */

export function SignalLayer({ pass, mobile }: { pass: Pass; mobile: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadSignalData();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let layout = frameLayout(1, 1, mobile);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? HERO.signal.mobileMaxDpr : HERO.signal.maxDpr);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout = frameLayout(r.width, r.height, mobile);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const off = onHeroFrame((time) => {
      const drew = drawSignal(ctx, layout, heroState, time, pass);
      // An empty canvas is hidden outright so no stale frame can be composited.
      canvas.style.visibility = drew ? "visible" : "hidden";
      if (pass === "back") {
        canvas.style.opacity = String(heroState.waveA);
        canvas.style.filter = heroState.waveBlur > 0.05 ? `blur(${heroState.waveBlur.toFixed(2)}px)` : "";
      }
    });

    return () => {
      off();
      ro.disconnect();
    };
  }, [mobile, pass]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />;
}

/* Small instrument canvases, drawn from the same loop. */

type SmallDraw = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => void;

function useSmallCanvas(draw: SmallDraw) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return onHeroFrame((t) => {
      ctx.clearRect(0, 0, W, H);
      draw(ctx, W, H, t);
    });
  }, [draw]);
  return ref;
}

const drawTaps: SmallDraw = (ctx, W, H, t) => {
  const n = HERO.signal.taps;
  const mid = H / 2;
  const slot = W / n;
  const jitter = 1 - heroState.taps;
  ctx.fillStyle = rgba(mix(RGB_AMBER, RGB_CY, heroState.taps), 1);
  for (let i = 0; i < n; i++) {
    const target = Math.exp(-i * 0.22) * Math.cos(i * 0.9);
    const noise = (hash(i + Math.floor(t * 12) * 17) - 0.5) * 1.6;
    const h = lerp(target, noise, jitter) * (H / 2 - 2);
    ctx.fillRect(i * slot + slot * 0.25, Math.min(mid, mid - h), slot * 0.5, Math.abs(h) || 1);
  }
  ctx.fillStyle = rgba(RGB_SILVER, 0.2);
  ctx.fillRect(0, Math.round(mid), W, 1);
};

const drawGru: SmallDraw = (ctx, W, H, t) => {
  const { gruRows: rows, gruCells: cells, gruCadenceHz } = HERO.signal;
  const gap = 2;
  const frame = Math.floor(t * gruCadenceHz);
  const cw = (W - gap * (cells - 1)) / cells;
  const ch = (H - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cells; i++) {
      const act = hash(i * 7 + r * 131 + frame * 3) * (0.35 + 0.65 * heroState.mask);
      const v = lerp(act, Math.round(act * 4) / 4, heroState.quant);
      ctx.fillStyle = rgba(RGB_CY, 0.08 + v * 0.92);
      ctx.fillRect(i * (cw + gap), r * (ch + gap), cw, ch);
    }
  }
};

export function TapsCanvas() {
  const ref = useSmallCanvas(drawTaps);
  return <canvas ref={ref} aria-hidden="true" className="block h-12 w-full" />;
}

export function GruCanvas() {
  const ref = useSmallCanvas(drawGru);
  return <canvas ref={ref} aria-hidden="true" className="block h-[46px] w-full" />;
}
