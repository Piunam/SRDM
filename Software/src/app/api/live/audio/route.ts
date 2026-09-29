import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { PresetMetricSet } from "@/lib/demo/presets";

type RawMetricSet = { snrDb?: unknown; stoi?: unknown; pesq?: unknown };

const numberOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

async function exists(relativePath: string) {
  try {
    await fs.access(path.join(process.cwd(), "public", relativePath));
    return true;
  } catch {
    return false;
  }
}

async function localAudio() {
  if ((await exists("live/input.wav")) && (await exists("live/output.wav"))) {
    return { input: "/live/input.wav", output: "/live/output.wav", label: "Local Live pair" };
  }
  if (await exists("live/audio.wav")) {
    return { input: "/live/audio.wav", output: "/live/audio.wav", label: "Local Live audio" };
  }
  return { input: "/hero/audio/voice.wav", output: "/hero/audio/voice.wav", label: "Built-in dummy audio" };
}

function metric(raw: RawMetricSet | undefined, file: string, fallback: Omit<PresetMetricSet, "file">): PresetMetricSet {
  if (!raw) return { file, ...fallback };
  return {
    file,
    snrDb: numberOrNull(raw.snrDb),
    stoi: numberOrNull(raw.stoi),
    pesq: numberOrNull(raw.pesq),
  };
}

async function localMetrics() {
  try {
    const text = await fs.readFile(path.join(process.cwd(), "public", "live", "metrics.json"), "utf8");
    return JSON.parse(text) as { input?: RawMetricSet; output?: RawMetricSet };
  } catch {
    return null;
  }
}

export async function GET() {
  const [audio, metrics] = await Promise.all([localAudio(), localMetrics()]);
  return NextResponse.json(
    {
      status: "SIMULATED",
      input: {
        url: audio.input,
        name: `${audio.label} · input`,
        metrics: metric(metrics?.input, "Dummy input", { snrDb: -5, stoi: 0.58, pesq: 1.6 }),
      },
      output: {
        url: audio.output,
        name: `${audio.label} · output`,
        metrics: metric(metrics?.output, "Dummy output", { snrDb: 14.2, stoi: 0.89, pesq: 2.6 }),
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
