// Every timing, number and hardware string used by the hero lives here.
// Scroll positions are percentages (0–100) of the pinned span.

export type MetricStatus = "MEASURED" | "SIMULATED" | "TARGET";

export type Metric = {
  key: string;
  label: string;
  value: number;
  decimals: number;
  unit?: string;
  target: string;
  status: MetricStatus;
};

export const NOISE_KEYS = [
  "gunshot",
  "rotor",
  "engine",
  "siren",
  "wind",
] as const;
export type NoiseKey = (typeof NOISE_KEYS)[number];

export const ACT_IDS = [
  "act0",
  "act1",
  "act2",
  "act3",
  "act4",
  "act5",
  "act6",
  "act7",
] as const;
export type ActId = (typeof ACT_IDS)[number];

export const HERO = {
  pin: { desktopVh: 600, mobileVh: 450 },
  scrub: 0.8,
  mobileBreakpoint: 768,

  hardware: {
    mcu: "NXP MCU",
    // Exact part number, printed on the package. Leave empty until confirmed.
    partNumber: "",
    enclosureMarking: "ANC-01 · IP67 · 5 V ⎓ 1 A",
    stlUrl: undefined as string | undefined,
  },

  readout: {
    frameMs: 10,
    latencyMs: 25,
  },

  // SNR the readout shows at each beat. Values ≥ `infinity` render as +∞.
  snr: {
    infinity: 30,
    buried: -5,
    afterPrefilter: 3,
    gateThreshold: 5,
    afterRnnoise: 14,
    afterPostfilter: 18,
    meterMin: -10,
    meterMax: 20,
  },

  // Placeholders until the evaluation set is final. Only "MEASURED" renders a tag.
  metrics: [
    {
      key: "snr",
      label: "SNR",
      value: 20.2,
      decimals: 1,
      unit: "dB",
      target: "target > 15",
      status: "TARGET",
    },
    {
      key: "stoi",
      label: "STOI",
      value: 0.88,
      decimals: 2,
      target: "target > 0.85",
      status: "TARGET",
    },
    {
      key: "pesq",
      label: "PESQ",
      value: 2.6,
      decimals: 2,
      target: "target > 2.5",
      status: "TARGET",
    },
    {
      key: "lat",
      label: "Latency",
      value: 20,
      decimals: 0,
      unit: "ms",
      target: "wireless link",
      status: "TARGET",
    },
  ] satisfies Metric[] as Metric[],

  // Act boundaries, as % of the pinned scroll.
  acts: [
    { id: "act0", start: 0, end: 8 },
    { id: "act1", start: 8, end: 22 },
    { id: "act2", start: 22, end: 32 },
    { id: "act3", start: 32, end: 45 },
    { id: "act4", start: 45, end: 52 },
    { id: "act5", start: 52, end: 72 },
    { id: "act6", start: 72, end: 84 },
    { id: "act7", start: 84, end: 100 },
  ] satisfies { id: ActId; start: number; end: number }[],

  // Enter/exit share of each act (hold is the rest, ≥ 60%), and the dead zone
  // between an outgoing and an incoming copy block.
  window: { edge: 0.18, copyGap: 0.35 },

  // Frame grid (px) and fixed anchors.
  frame: {
    margin: 80,
    gutter: 24,
    header: 56,
    instrumentTop: 120, // below the header
    copyBottom: 96,
    baseline: 0.58, // signal band, fraction of viewport height
    ampFrac: 0.06,
    barsFrac: 0.2,
    deviceWidthFrac: 0.85, // of columns 9–11
    mobile: {
      margin: 16,
      stageFrac: 0.55,
      baseline: 0.5,
      ampFrac: 0.035,
      barsFrac: 0.26,
      deviceY: 0.28,
      deviceX: 0.64,
      // Front-face width; leaves room for the headset on the left.
      deviceWidthFrac: 0.44,
      headsetX: 0.2,
      headsetY: 0.3,
    },
  },

  signal: {
    bands: 22, // Bark bands shown in Act 5
    axis: [
      { band: 0, label: "0.1k" },
      { band: 4, label: "0.5k" },
      { band: 8, label: "1k" },
      { band: 12, label: "2k" },
      { band: 16, label: "4k" },
      { band: 20, label: "8k" },
    ],
    taps: 16,
    gruCells: 28,
    gruRows: 3,
    gruUnits: 128,
    quantSteps: 8,
    gunshotX: [0.3, 0.52, 0.74],
    rotorBladeHz: 1.6, // visual rate, slowed down
    gruCadenceHz: 4, // visual rate of the 10 ms hidden-state loop
    maxDpr: 2,
    mobileMaxDpr: 1.5,
  },

  colors: {
    abyss: "#060B12",
    deep: "#0A121C",
    panel: "#101C28",
    white: "#EAF1F6",
    silver: "#9FB0BF",
    dim: "#6D7E8C",
    cy: "#2DD4C8",
    amber: "#F0A63C",
    fault: "#E05A6B",
    enclosure: "#1B222A",
    headset: "#15191E",
    pcb: "#0C1A14",
  },
} as const;
