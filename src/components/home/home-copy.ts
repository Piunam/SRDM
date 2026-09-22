// Every string used by the home-page sections below the hero.
// Numbers live in src/content/metrics.ts; nothing numeric belongs here.

import type { Status } from "@/components/ui/StatusTag";

export type PipelineNode = {
  id: string;
  title: string;
  sub: string;
  /** Anchor on /system. Section ids follow the slugified titles of its sidebar. */
  href: string;
  /** The neural stage sits on the branch lane; everything else is on the main lane. */
  lane?: "branch";
};

export const HOME = {
  problem: {
    number: "01",
    label: "The problem",
    title: "Three things make this hard.",
    blocks: [
      {
        num: "01",
        title: "Noise doesn't stand still.",
        body: "Gunfire, rotors and sirens change faster than classical filters can track.",
      },
      {
        num: "02",
        title: "Filters distort speech.",
        body: "Spectral subtraction and Wiener filtering smear consonants and add artefacts when they over-subtract.",
      },
      {
        num: "03",
        title: "The hardware is tiny.",
        body: "It all has to run in real time on a microcontroller, within a 10 ms frame.",
      },
    ],
  },

  pipeline: {
    number: "02",
    label: "Signal chain",
    title: "How it works",
    lede: "Every 10 ms frame walks the same chain. A gate decides whether it needs the neural stage at all.",
    nodes: [
      {
        id: "mics",
        title: "Mics",
        sub: "primary · reference",
        href: "/system#hardware",
      },
      {
        id: "prefilter",
        title: "DSP prefilter",
        sub: "beamforming · NLMS",
        href: "/system#dsp-prefilter",
      },
      {
        id: "gate",
        title: "Gate",
        sub: "SNR ≥ 5 dB",
        href: "/system#signal-chain",
      },
      {
        id: "rnnoise",
        title: "RNNoise",
        sub: "GRU · int8",
        href: "/system#rnnoise",
        lane: "branch",
      },
      {
        id: "postfilter",
        title: "Post-filter",
        sub: "pitch-locked comb",
        href: "/system#post-filter",
      },
      {
        id: "output",
        title: "Output",
        sub: "clean speech",
        href: "/system#overview",
      },
    ] satisfies PipelineNode[] as PipelineNode[],
    branchLabel: "SNR < 5 dB · impulsive",
    skipLabel: "skip · SNR ≥ 5 dB",
    captions: [
      {
        title: "Prefilter",
        body: "The reference mic hears the world, the primary hears the mouth. An NLMS filter subtracts one from the other and steady noise falls away.",
      },
      {
        title: "Gate",
        body: "Above +5 dB the DSP has already done the job, so the frame skips the network and saves the cycles.",
      },
      {
        title: "Network",
        body: "Below that, a quantisation-aware GRU sets a gain per band every 10 ms and clamps what the filter couldn't follow.",
      },
    ],
    cta: "Read the system documentation",
  },

  model: {
    number: "03",
    label: "Hardware",
    title: "The prototype",
    lede: "A sealed, printed enclosure carrying the MCU, the reference mic and the battery. Drag to look around it.",
    caption: "FIG 2 — Printed enclosure, outline",
    pendingLabel: "[ STL pending ]",
    hint: "DRAG TO ROTATE",
    specs: [
      { label: "Material", value: "TODO(owner)", note: "filament and colour" },
      {
        label: "Print settings",
        value: "TODO(owner)",
        note: "layer height, walls, infill",
      },
      {
        label: "Sealing",
        value: "TODO(owner)",
        note: "gasket, gland, IP rating",
      },
      { label: "Mass", value: "TODO(owner)", note: "assembled, with battery" },
    ],
  },

  video: {
    number: "04",
    label: "Bench test",
    title: "Running on the device",
    lede: "The whole chain on the microcontroller, recorded in one take with no post-processing.",
    // Edit this caption; it is the one line under the video frame.
    caption: "FIG 1 — Prototype, bench test",
    pendingLabel: "[ video pending ]",
  },

  build: {
    number: "05",
    label: "Build",
    title: "What's inside",
    cards: [
      {
        num: "03",
        title: "Hardware",
        body: "MCU, two mics, sealed enclosure",
        href: "/system#hardware",
        status: "WORKING" as Status,
      },
      {
        num: "04",
        title: "DSP",
        body: "Beamforming and NLMS prefilter, comb post-filter",
        href: "/system#dsp-prefilter",
        status: "WORKING" as Status,
      },
      {
        num: "05",
        title: "RNNoise",
        body: "GRU-128, quantisation-aware, int8 on the MCU",
        href: "/system#rnnoise",
        status: "WORKING" as Status,
      },
    ],
  },

  closing: {
    line: "Built to be heard in the loudest places.",
    links: [
      { label: "See the demo", href: "/demo" },
      { label: "System documentation", href: "/system" },
    ],
  },

  footer: {
    tagline: "Prototype · demo build",
  },
} as const;
