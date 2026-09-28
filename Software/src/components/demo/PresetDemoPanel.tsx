"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { mixToMono } from "@/lib/audio/envelope";
import type { TransportTrack } from "@/lib/audio/transport";
import { useAudioEngine } from "@/lib/audio/useAudioEngine";
import { DEMO_SNR_LEVELS, type DemoSnr, type PresetAudioResponse, type PresetMetricsResponse } from "@/lib/demo/presets";
import { AudioLane } from "./AudioLane";
import { clipFromBuffer, useClips, type ClipData, type ClipSource } from "./clips";
import { MonoNote, Segmented } from "./controls";

const INPUT = "input";
const OUTPUT = "output";
const AB_OPTIONS = [
  { value: INPUT, label: "Input" },
  { value: OUTPUT, label: "Output" },
] as const;

function rms(samples: Float32Array) {
  if (samples.length === 0) return 0;
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  return Math.sqrt(energy / samples.length);
}

/** Temporary preview used until the seven files are added to public/demo/presets. */
function mixAtSnr(voice: AudioBuffer, noise: AudioBuffer, snrDb: number): AudioBuffer {
  const voiceMono = mixToMono(voice);
  const noiseMono = mixToMono(noise);
  const output = new AudioBuffer({ length: voiceMono.length, numberOfChannels: 1, sampleRate: voice.sampleRate });
  const data = output.getChannelData(0);
  const ratio = 10 ** (snrDb / 20);
  const noiseRms = rms(noiseMono);
  const noiseScale = noiseRms > 0 ? rms(voiceMono) / (ratio * noiseRms) : 0;

  let peak = 0;
  for (let i = 0; i < voiceMono.length; i++) {
    const sample = voiceMono[i] + noiseMono[i % noiseMono.length] * noiseScale;
    data[i] = sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  if (peak > 0.95) {
    const scale = 0.95 / peak;
    for (let i = 0; i < data.length; i++) data[i] *= scale;
  }
  return output;
}

export function PresetDemoPanel() {
  const [snrDb, setSnrDb] = useState<DemoSnr>(-5);
  const [preset, setPreset] = useState<PresetAudioResponse | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PresetMetricsResponse | null>(null);
  const [metricsState, setMetricsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const { transport, state } = useAudioEngine("sync");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/demo/preset?snr=${snrDb}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Preset audio is unavailable");
        return (await response.json()) as PresetAudioResponse;
      })
      .then(setPreset)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPresetError(error instanceof Error ? error.message : "Preset audio is unavailable");
      });
    return () => controller.abort();
  }, [snrDb]);

  const sources = useMemo<ClipSource[]>(() => {
    if (!preset) return [];
    if (!preset.simulated && preset.input.url) {
      return [
        { id: INPUT, url: preset.input.url },
        { id: OUTPUT, url: preset.output.url },
      ];
    }
    if (!preset.input.voiceUrl || !preset.input.noiseUrl) return [];
    return [
      { id: "voice", url: preset.input.voiceUrl },
      { id: "noise", url: preset.input.noiseUrl },
    ];
  }, [preset]);
  const { clips, status, error } = useClips(sources);

  const pair = useMemo<{ input: ClipData | null; output: ClipData | null }>(() => {
    if (!clips || !preset) return { input: null, output: null };
    if (!preset.simulated) return { input: clips.get(INPUT) ?? null, output: clips.get(OUTPUT) ?? null };
    const voice = clips.get("voice");
    const noise = clips.get("noise");
    if (!voice || !noise) return { input: null, output: null };
    return {
      input: clipFromBuffer(INPUT, preset.input.name, null, mixAtSnr(voice.buffer, noise.buffer, snrDb)),
      output: clipFromBuffer(OUTPUT, preset.output.name, null, voice.buffer),
    };
  }, [clips, preset, snrDb]);

  useEffect(() => {
    const tracks: TransportTrack[] = [];
    if (pair.input) tracks.push({ id: INPUT, buffer: pair.input.buffer });
    if (pair.output) tracks.push({ id: OUTPUT, buffer: pair.output.buffer });
    transport.setTracks(tracks);
  }, [transport, pair]);

  const fetchMetrics = useCallback(() => {
    if (metricsState === "loading" || metricsState === "ready") return;
    setMetricsState("loading");
    void fetch(`/api/demo/metrics?snr=${snrDb}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Metrics are unavailable");
        return (await response.json()) as PresetMetricsResponse;
      })
      .then((value) => {
        setMetrics(value);
        setMetricsState("ready");
      })
      .catch(() => setMetricsState("error"));
  }, [metricsState, snrDb]);

  const active = state.activeId ?? INPUT;
  const loading = !preset || status === "loading";
  const visibleError = presetError ?? error;
  const chooseSnr = (value: DemoSnr) => {
    if (value === snrDb) return;
    transport.stop();
    setPreset(null);
    setPresetError(null);
    setMetrics(null);
    setMetricsState("idle");
    setSnrDb(value);
  };

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-5 md:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">Choose input SNR</p>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DEMO_SNR_LEVELS.map((level) => {
            const selected = level === snrDb;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseSnr(level)}
                className={`rounded-[4px] border px-2 py-3 text-center font-mono text-[11px] tabular-nums transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy ${
                  selected ? "border-cy bg-deep text-cy" : "border-line text-silver hover:border-line3 hover:text-white"
                }`}
              >
                {level > 0 ? `+${level}` : level} dB
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">Selected preset</p>
            <p className="mt-1 text-[18px] font-medium text-white">{snrDb > 0 ? `+${snrDb}` : snrDb} dB</p>
          </div>
          <Segmented label="Audible signal" options={AB_OPTIONS} value={active === OUTPUT ? OUTPUT : INPUT} onChange={(value) => transport.setActive(value)} />
        </div>

        <MonoNote className="mt-4">
          {visibleError ? (
            <span className="text-fault">{visibleError}</span>
          ) : loading ? (
            "Fetching noisy and clean audio…"
          ) : preset.simulated ? (
            "Temporary built-in preview · add the seven WAV files under public/demo/presets"
          ) : (
            "Preset files loaded"
          )}
          {metricsState === "loading" && " · fetching metrics…"}
          {metricsState === "ready" && " · metrics loaded"}
          {metricsState === "error" && <span className="text-fault"> · metrics unavailable</span>}
        </MonoNote>
      </Panel>

      <AudioLane
        laneName="NOISY INPUT"
        trackId={INPUT}
        color="fault"
        clip={pair.input}
        transport={transport}
        playing={state.playing && active === INPUT}
        running={state.playing}
        playhead={state.time}
        metrics={metrics?.input ?? null}
        metricsNote={metrics ? "Fetched when playback started" : "Press play to fetch metrics"}
        audible={active === INPUT}
        onPlay={fetchMetrics}
        placeholder={loading ? "fetching input…" : "input unavailable"}
      />

      <AudioLane
        laneName="CLEAN OUTPUT"
        trackId={OUTPUT}
        color="cy"
        clip={pair.output}
        transport={transport}
        playing={state.playing && active === OUTPUT}
        running={state.playing}
        playhead={state.time}
        metrics={metrics?.output ?? null}
        metricsNote={metrics ? "Fetched when playback started" : "Press play to fetch metrics"}
        audible={active === OUTPUT}
        onPlay={fetchMetrics}
        placeholder={loading ? "fetching output…" : "output unavailable"}
      />
    </div>
  );
}
