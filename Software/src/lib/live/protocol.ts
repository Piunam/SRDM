// The link to the prototype: transport constants, a minimal typing of the
// Chromium-only Web Serial API, and the line protocol the firmware speaks.

// ---------------------------------------------------------------------------
// Web Serial. Not in lib.dom, so it is declared here rather than cast away.
// ---------------------------------------------------------------------------

export type SerialPortInfo = { usbVendorId?: number; usbProductId?: number };

export type SerialOpenOptions = {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  bufferSize?: number;
  flowControl?: "none" | "hardware";
};

export interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOpenOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
}

export interface Serial {
  requestPort(options?: { filters?: SerialPortInfo[] }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
  addEventListener(type: "connect" | "disconnect", listener: () => void): void;
  removeEventListener(type: "connect" | "disconnect", listener: () => void): void;
}

declare global {
  interface Navigator {
    readonly serial?: Serial;
  }
}

/** The Serial entry point, or null off Chromium / outside the browser. */
export function getSerial(): Serial | null {
  if (typeof navigator === "undefined") return null;
  return navigator.serial ?? null;
}

export const hexId = (value: number | undefined) => (value === undefined ? "—" : `0x${value.toString(16).padStart(4, "0")}`);

// ---------------------------------------------------------------------------
// Transport and protocol constants
// ---------------------------------------------------------------------------

export const PROTOCOL = {
  // TODO(owner): replace with the firmware's real framing. Everything below is
  // the placeholder contract the page is written against; if the device speaks
  // a binary protocol, keep `LiveFrame` and rewrite `parseFrameLine` only.
  baudRates: [115200, 230400, 460800, 921600, 1000000],
  defaultBaudRate: 921600,

  /** Device audio sample rate, used for the spectrum's frequency axis. */
  sampleRate: 16000,
  /** FFT behind the `fft` field: the array holds fftSize / 2 magnitude bins in dB. */
  fftSize: 256,
  /** DSP frame length on the MCU. */
  frameMs: 10,
  /** Nominal telemetry rate; the UI never assumes it. */
  telemetryHz: 20,

  /** Gate threshold: at or above this input SNR the network is skipped. */
  gateSnrDb: 5,
  /** No frame for longer than this and the link counts as stalled. */
  stallMs: 2000,
  /** Visible time-domain history. */
  windowSeconds: 5,
  /** Span of the rolling SNR mean. */
  meanSeconds: 10,
  /** Event log cap. */
  logLines: 200,
  /** Recorder cap, ≈ 16 min at 20 Hz. */
  maxRecordedFrames: 20000,
  /** Floor for magnitudes reported in dB. */
  dbFloor: -90,
  /** A single line longer than this is treated as garbage and dropped. */
  // Audio snapshots are base64 PCM and can be a few hundred KiB on one line.
  maxLineChars: 1_000_000,
} as const;

export const STAGES = ["dsp", "dsp+rnnoise"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  dsp: "DSP only",
  "dsp+rnnoise": "DSP + RNNoise",
};

/**
 * One telemetry frame. The default wire format is newline-delimited JSON:
 *
 *   {"t":128340,"snr":4.2,"stage":"dsp+rnnoise","rms":[0.31,0.12],"fft":[-42.1,…],"lat":24}
 *
 * `rms` is [input, output] in linear units, `fft` holds fftSize / 2 dB bins of
 * the output, `fftIn` the same for the input when the firmware sends it, and
 * `lat` is the measured end-to-end latency in ms. Anything the device omits is
 * rendered as "—" rather than guessed at.
 */
export type LiveFrame = {
  /** Device timestamp in ms since boot. */
  t: number;
  snrDb: number | null;
  stage: Stage | null;
  inRms: number;
  outRms: number;
  fftOut: Float32Array | null;
  fftIn: Float32Array | null;
  latencyMs: number | null;
};

export type LiveAudioSnapshot = {
  sampleRate: number;
  input: Float32Array;
  output: Float32Array;
  metrics: {
    inputSnrDb: number | null;
    outputSnrDb: number | null;
    stoi: number | null;
    pesq: number | null;
    latencyMs: number | null;
  };
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const bins = (v: unknown): Float32Array | null => {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    const n = num(v[i]);
    out[i] = n === null ? PROTOCOL.dbFloor : n;
  }
  return out;
};

const stage = (v: unknown): Stage | null => (typeof v === "string" && (STAGES as readonly string[]).includes(v) ? (v as Stage) : null);

/** Parses one line. Returns null for blank, malformed or foreign lines. */
export function parseFrameLine(line: string): LiveFrame | null {
  const text = line.trim();
  if (!text || text[0] !== "{") return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const f = raw as Record<string, unknown>;
  const rms = Array.isArray(f.rms) ? f.rms.map(num) : [];
  return {
    t: num(f.t) ?? 0,
    snrDb: num(f.snr),
    stage: stage(f.stage),
    inRms: Math.min(1, Math.abs(rms[0] ?? 0)),
    outRms: Math.min(1, Math.abs(rms[1] ?? rms[0] ?? 0)),
    fftOut: bins(f.fft),
    fftIn: bins(f.fftIn),
    latencyMs: num(f.lat),
  };
}

function pcm16Base64(value: unknown): Float32Array | null {
  if (typeof value !== "string" || value.length === 0 || typeof atob === "undefined") return null;
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    if (bytes.length < 2 || bytes.length % 2 !== 0) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const samples = new Float32Array(bytes.length / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    return samples;
  } catch {
    return null;
  }
}

/**
 * Snapshot response expected after {"cmd":"fetch_audio"}:
 * {"type":"audio","sampleRate":16000,"inputPcm16":"…","outputPcm16":"…",
 *  "metrics":{"inputSnr":-5,"outputSnr":14,"stoi":0.89,"pesq":2.6,"lat":24}}
 */
export function parseAudioSnapshotLine(line: string): LiveAudioSnapshot | null {
  const text = line.trim();
  if (!text || text[0] !== "{") return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (value.type !== "audio") return null;
  const input = pcm16Base64(value.inputPcm16);
  const output = pcm16Base64(value.outputPcm16);
  const sampleRate = num(value.sampleRate);
  if (!input || !output || !sampleRate || sampleRate <= 0) return null;
  const rawMetrics = typeof value.metrics === "object" && value.metrics !== null ? (value.metrics as Record<string, unknown>) : {};
  return {
    sampleRate,
    input,
    output,
    metrics: {
      inputSnrDb: num(rawMetrics.inputSnr),
      outputSnrDb: num(rawMetrics.outputSnr),
      stoi: num(rawMetrics.stoi),
      pesq: num(rawMetrics.pesq),
      latencyMs: num(rawMetrics.lat),
    },
  };
}

/** The frame as it is written to a recording, i.e. back in wire shape. */
export function frameToJson(f: LiveFrame) {
  return {
    t: f.t,
    snr: f.snrDb,
    stage: f.stage,
    rms: [Number(f.inRms.toFixed(5)), Number(f.outRms.toFixed(5))],
    lat: f.latencyMs,
  };
}
