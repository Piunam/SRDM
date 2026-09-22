// All hero text. Numbers come from hero-config.ts, never from here.

import type { NoiseKey } from "./hero-config";

export type ActCopy = {
  num: string; // mono stage number / tag
  title: string;
  sub: string; // technical sub-label
  body: string;
  micro?: string;
  mobileInline?: string; // key instrument number, shown inline on mobile
};

export const COPY = {
  eyebrow: "AI / DSP hybrid noise suppression · edge hardware",
  h1: "A voice that survives the battlefield.",
  lede: "Real-time speech enhancement on a microcontroller, built for gunfire, rotors, engines and sirens.",

  legend: [
    { key: "gunshot", name: "Gunshot", desc: "impulsive" },
    { key: "rotor", name: "Rotor", desc: "periodic" },
    { key: "engine", name: "Engine", desc: "stationary" },
    { key: "siren", name: "Siren", desc: "tonal sweep" },
    { key: "wind", name: "Wind", desc: "broadband" },
  ] satisfies { key: NoiseKey; name: string; desc: string }[],

  acts: {
    act1: {
      num: "Input",
      title: "Noise that won't hold still",
      sub: "impulsive · periodic · stationary · tonal · broadband",
      body: "Classical filters assume noise stands still. Gunfire, rotors and sirens don't, so spectral subtraction and Wiener filters smear the speech they are meant to protect.",
    },
    act2: {
      num: "Capture",
      title: "Two ears",
      sub: "primary at the mouth · reference on the device",
      body: "The primary mic sits at the mouth; the reference sits on the device and hears mostly the world around it. The difference between them is the first clue.",
    },
    act3: {
      num: "01",
      title: "Prefilter",
      sub: "beamforming · NLMS",
      body: "An adaptive filter learns what the reference hears and subtracts it from the primary. Steady noise falls away; sudden noise doesn't.",
      mobileInline: "16 NLMS taps converge",
    },
    act4: {
      num: "02",
      title: "Routing",
      sub: "SNR gate at +5 dB",
      body: "Above +5 dB the noise is steady and DSP alone cleans it best. Below that, or when impulses hit, the neural stage takes over.",
    },
    act5: {
      num: "03",
      title: "RNNoise",
      sub: "GRU · quantisation-aware",
      body: "A recurrent network trained on our own impulsive and non-stationary noise sets a gain for every band, every 10 ms. It was quantised during training, so it behaves on the microcontroller as it did on the GPU.",
      micro:
        "loss · perceptual + L1 + L2 — data · MS-SNSD-style pipeline, scaled",
      mobileInline: "GRU · 128 units, a gain per band every 10 ms",
    },
    act6: {
      num: "04",
      title: "Post-filter",
      sub: "pitch-locked comb",
      body: "A comb filter locks to the speaker's pitch and clears what's left between the harmonics.",
    },
  } satisfies Record<string, ActCopy>,

  streamPrimary: "primary",
  streamRef: "reference",
  link: "wireless · 20 ms",

  tapsTitle: "NLMS · 16 taps",
  tapsSub: "weights converging",

  gate: {
    question: "SNR ≥ 5 dB",
    yes: "yes · steady noise → post-filter",
    no: "no · impulsive / low SNR → RNNoise",
    yesShort: "yes · steady",
    noShort: "no · impulsive",
    boxYes: "Post-filter",
    boxNo: "RNNoise",
  },

  gruTitle: "GRU · 128 units",
  quant: "int8 · QAT",
  impulse: "impulse suppressed",

  readout: { label: "SNR", gate: "gate" },

  h2: "Heard clearly. Processed at the edge.",

  sound: { off: "Sound off", on: "Sound on" },

  stages: [
    {
      short: "Signal",
      summary: "A clean voice, before anything happens to it.",
    },
    {
      short: "Chaos",
      summary:
        "Gunshots, rotors, engines, sirens and wind bury the voice at −5 dB.",
    },
    {
      short: "Two ears",
      summary: "A primary mic at the mouth and a reference mic on the device.",
    },
    {
      short: "Prefilter",
      summary: "Beamforming and NLMS cancel steady noise. SNR climbs to +3 dB.",
    },
    {
      short: "Routing",
      summary: "A gate sends low-SNR frames to the neural stage.",
    },
    {
      short: "RNNoise",
      summary:
        "A quantisation-aware GRU applies per-band gains and clamps impulses. SNR reaches +14 dB.",
    },
    {
      short: "Post-filter",
      summary:
        "A pitch-locked comb clears residue between harmonics. SNR reaches +18 dB.",
    },
    { short: "Clean", summary: "The original voice, recovered on the device." },
  ],
} as const;
