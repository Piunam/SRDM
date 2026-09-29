import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDemoSnr, type DemoSnr, type PresetAudioResponse } from "@/lib/demo/presets";

type ManifestItem = {
  inputSnrDb?: unknown;
  noisy?: { file?: unknown };
  enhanced?: { file?: unknown };
};

async function exists(relativePath: string) {
  try {
    await fs.access(path.join(process.cwd(), "public", relativePath));
    return true;
  } catch {
    return false;
  }
}

/**
 * Future drop-in contracts, checked in this order:
 *   public/demo/presets/-15/input.wav + output.wav
 *   public/demo/presets/-15.wav + public/demo/presets/clean.wav
 */
async function presetFiles(snrDb: DemoSnr) {
  const directoryInput = `demo/presets/${snrDb}/input.wav`;
  const directoryOutput = `demo/presets/${snrDb}/output.wav`;
  if ((await exists(directoryInput)) && (await exists(directoryOutput))) {
    return { input: directoryInput, output: directoryOutput };
  }

  const flatInput = `demo/presets/${snrDb}.wav`;
  const flatOutput = "demo/presets/clean.wav";
  if ((await exists(flatInput)) && (await exists(flatOutput))) return { input: flatInput, output: flatOutput };
  return null;
}

async function evaluatedPair(snrDb: number) {
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

  const files = await presetFiles(snrDb);
  const item = files ? null : await evaluatedPair(snrDb);
  const noisyFile = item?.noisy?.file;
  const cleanFile = item?.enhanced?.file;
  let payload: PresetAudioResponse;

  if (files) {
    payload = {
      snrDb,
      simulated: false,
      input: { url: `/${files.input}`, name: `${snrDb} dB input` },
      output: { url: `/${files.output}`, name: `${snrDb} dB output` },
    };
  } else if (typeof noisyFile === "string" && typeof cleanFile === "string") {
    payload = {
      snrDb,
      simulated: false,
      input: { url: `/demo/${noisyFile.replace(/^\/+/, "")}`, name: noisyFile.split("/").pop() ?? "Noisy input" },
      output: { url: `/demo/${cleanFile.replace(/^\/+/, "")}`, name: cleanFile.split("/").pop() ?? "Clean output" },
    };
  } else {
    payload = {
      snrDb,
      simulated: true,
      input: {
        voiceUrl: "/hero/audio/voice.wav",
        noiseUrl: "/hero/audio/gunshot.wav",
        name: `Temporary preview · ${snrDb} dB`,
      },
      output: { url: "/hero/audio/voice.wav", name: "Temporary clean reference" },
    };
  }

  return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
}
