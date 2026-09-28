import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDemoSnr, type PresetMetricsResponse } from "@/lib/demo/presets";

type MetricSet = { file?: unknown; snrDb?: unknown; stoi?: unknown; pesq?: unknown };
type MetricsEntry = { status?: unknown; input?: MetricSet; output?: MetricSet };
type ManifestItem = {
  inputSnrDb?: unknown;
  status?: unknown;
  audio?: { sampleRate?: unknown; seconds?: unknown };
  noisy?: MetricSet;
  enhanced?: MetricSet;
};

const numberOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const validStatus = (value: unknown) =>
  value === "MEASURED" || value === "SIMULATED" || value === "TARGET" || value === "PLANNED" ? value : null;
const metrics = (raw: MetricSet | undefined, fallbackFile: string) => ({
  file: typeof raw?.file === "string" ? raw.file : fallbackFile,
  snrDb: numberOrNull(raw?.snrDb),
  stoi: numberOrNull(raw?.stoi),
  pesq: numberOrNull(raw?.pesq),
});

async function presetMetrics(snrDb: number): Promise<MetricsEntry | null> {
  try {
    const text = await fs.readFile(path.join(process.cwd(), "public", "demo", "presets", "metrics.json"), "utf8");
    const data = JSON.parse(text) as { levels?: Record<string, MetricsEntry> };
    return data.levels?.[String(snrDb)] ?? null;
  } catch {
    return null;
  }
}

async function manifestItem(snrDb: number) {
  try {
    const text = await fs.readFile(path.join(process.cwd(), "public", "demo", "manifest.json"), "utf8");
    const data = JSON.parse(text) as { items?: ManifestItem[] };
    return data.items?.find((item) => item.inputSnrDb === snrDb) ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const snrDb = Number(new URL(request.url).searchParams.get("snr"));
  if (!isDemoSnr(snrDb)) return NextResponse.json({ error: "Unsupported SNR preset" }, { status: 400 });

  const preset = await presetMetrics(snrDb);
  const manifest = preset ? null : await manifestItem(snrDb);
  let payload: PresetMetricsResponse;

  if (preset) {
    const status = validStatus(preset.status);
    payload = {
      simulated: status === "SIMULATED",
      status,
      sampleRate: null,
      durationSeconds: null,
      input: metrics(preset.input, `${snrDb} dB input`),
      output: metrics(preset.output, `${snrDb} dB output`),
    };
  } else if (manifest) {
    const status = validStatus(manifest.status);
    payload = {
      simulated: status === "SIMULATED",
      status,
      sampleRate: numberOrNull(manifest.audio?.sampleRate),
      durationSeconds: numberOrNull(manifest.audio?.seconds),
      input: metrics(manifest.noisy, "Noisy input"),
      output: metrics(manifest.enhanced, "Clean output"),
    };
  } else {
    payload = {
      simulated: true,
      status: "SIMULATED",
      sampleRate: 16000,
      durationSeconds: 3.5,
      input: { file: "Temporary preview", snrDb, stoi: null, pesq: null },
      output: { file: "Temporary clean reference", snrDb: null, stoi: null, pesq: null },
    };
  }

  return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
}
