import type { Status } from "@/components/ui/StatusTag";
import { STATUS_VALUES } from "@/components/ui/StatusTag";

// The contract the owner fills offline. Nothing on this page computes SNR, STOI
// or PESQ in the browser — those numbers come from the evaluation run and land
// here through scripts/make-demo-manifest.py.

export type DemoMetricSet = {
  file: string;
  snrDb: number | null;
  stoi: number | null;
  pesq: number | null;
};

export const STAGE_KEYS = ["prefilter", "rnnoise", "postfilter"] as const;
export type DemoStageKey = (typeof STAGE_KEYS)[number];

export type DemoItem = {
  id: string;
  noise: string;
  inputSnrDb: number;
  clip: string;
  noisy: DemoMetricSet;
  enhanced: DemoMetricSet;
  stages: Partial<Record<DemoStageKey, string | null>>;
  status: Status | null;
};

export type DemoManifest = {
  version: number;
  generatedAt: string;
  snrLevels: number[];
  noiseTypes: string[];
  items: DemoItem[];
};

export const EMPTY_MANIFEST: DemoManifest = {
  version: 1,
  generatedAt: "",
  snrLevels: [],
  noiseTypes: [],
  items: [],
};

export const EMPTY_MESSAGE = "No demo clips yet. Drop WAVs into public/demo and run npm run demo-manifest.";
export const METRICS_NOTE = "Metrics computed offline · see /system#status-ledger";
export const LOCAL_FILE_NOTE = "local file · metrics unavailable";
/** At or above this input SNR the gate skips RNNoise and runs DSP only. */
export const GATE_SNR_DB = 5;

export const demoUrl = (file: string) => `/demo/${file.replace(/^\/+/, "")}`;
export const baseName = (path: string) => path.split("/").pop() ?? path;

/** Typographic minus, so `−5 dB` lines up with the rest of the mono numerals. */
export const snrLabel = (db: number) => `${db < 0 ? "−" : "+"}${Math.abs(db)} dB`;

// ---------- parsing ----------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const asNumberOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asString = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

function parseMetrics(raw: unknown): DemoMetricSet | null {
  if (!isRecord(raw) || typeof raw.file !== "string" || raw.file.length === 0) return null;
  return { file: raw.file, snrDb: asNumberOrNull(raw.snrDb), stoi: asNumberOrNull(raw.stoi), pesq: asNumberOrNull(raw.pesq) };
}

function parseStages(raw: unknown): Partial<Record<DemoStageKey, string | null>> {
  if (!isRecord(raw)) return {};
  const out: Partial<Record<DemoStageKey, string | null>> = {};
  for (const key of STAGE_KEYS) out[key] = typeof raw[key] === "string" ? raw[key] : null;
  return out;
}

function parseItem(raw: unknown): DemoItem | null {
  if (!isRecord(raw)) return null;
  const noisy = parseMetrics(raw.noisy);
  const enhanced = parseMetrics(raw.enhanced);
  if (!noisy || !enhanced) return null;
  const status = STATUS_VALUES.find((s) => s === raw.status) ?? null;
  return {
    id: asString(raw.id, `${asString(raw.noise, "clip")}_${asNumberOrNull(raw.inputSnrDb) ?? 0}`),
    noise: asString(raw.noise, "unknown"),
    inputSnrDb: asNumberOrNull(raw.inputSnrDb) ?? 0,
    clip: asString(raw.clip, "01"),
    noisy,
    enhanced,
    stages: parseStages(raw.stages),
    status,
  };
}

/**
 * Tolerant reader: anything malformed is dropped rather than thrown, and the
 * caller is told how many entries were skipped so the page can say so.
 */
export function parseManifest(raw: unknown): { manifest: DemoManifest; skipped: number } {
  if (!isRecord(raw)) return { manifest: EMPTY_MANIFEST, skipped: 0 };
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.map(parseItem).filter((i): i is DemoItem => i !== null);
  const snrLevels = Array.isArray(raw.snrLevels) ? raw.snrLevels.filter((v): v is number => typeof v === "number") : [];
  const noiseTypes = Array.isArray(raw.noiseTypes) ? raw.noiseTypes.filter((v): v is string => typeof v === "string") : [];
  return {
    manifest: {
      version: asNumberOrNull(raw.version) ?? 1,
      generatedAt: asString(raw.generatedAt),
      snrLevels: snrLevels.length ? snrLevels : [...new Set(items.map((i) => i.inputSnrDb))].sort((a, b) => a - b),
      noiseTypes: noiseTypes.length ? noiseTypes : [...new Set(items.map((i) => i.noise))],
      items,
    },
    skipped: rawItems.length - items.length,
  };
}

// ---------- selection ----------

export type Selection = { noise: string; snrDb: number; clip: string };

const byNoise = (items: DemoItem[], noise: string) => items.filter((i) => i.noise === noise);

/** Narrows a partial choice to a real item, healing combinations that no longer exist. */
export function resolveSelection(items: DemoItem[], want: Partial<Selection>): { selection: Selection | null; item: DemoItem | null } {
  if (items.length === 0) return { selection: null, item: null };

  const noises = [...new Set(items.map((i) => i.noise))];
  const noise = want.noise && noises.includes(want.noise) ? want.noise : noises[0];

  const snrs = [...new Set(byNoise(items, noise).map((i) => i.inputSnrDb))].sort((a, b) => a - b);
  const snrDb = want.snrDb !== undefined && snrs.includes(want.snrDb) ? want.snrDb : snrs[0];

  const clips = byNoise(items, noise).filter((i) => i.inputSnrDb === snrDb);
  const item = clips.find((i) => i.clip === want.clip) ?? clips[0] ?? null;

  return item ? { selection: { noise, snrDb, clip: item.clip }, item } : { selection: null, item: null };
}

export const noiseOptions = (items: DemoItem[]) => [...new Set(items.map((i) => i.noise))];
export const snrOptions = (items: DemoItem[], noise: string) =>
  [...new Set(byNoise(items, noise).map((i) => i.inputSnrDb))].sort((a, b) => a - b);
export const clipOptions = (items: DemoItem[], noise: string, snrDb: number) =>
  byNoise(items, noise)
    .filter((i) => i.inputSnrDb === snrDb)
    .map((i) => i.clip);

/** Improvement between two manifest figures, or null when either is missing. */
export const delta = (before: number | null, after: number | null) => (before === null || after === null ? null : after - before);
