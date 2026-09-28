"use client";

import { useEffect, useRef, useState } from "react";
import { SpectrumPlot } from "@/components/plots/SpectrumPlot";
import { WaveformPlot } from "@/components/plots/WaveformPlot";
import type { PlotColor } from "@/components/plots/plot-utils";
import { MetricCell } from "@/components/ui/MetricCell";
import { Panel } from "@/components/ui/Panel";
import type { Transport } from "@/lib/audio/transport";
import { ANALYSER_FFT_SIZE } from "@/lib/audio/transport";
import type { ClipData } from "./clips";
import { FFT_SIZE } from "./clips";
import { MonoNote, Segmented, TransportButton } from "./controls";
import type { DemoMetricSet } from "./manifest";

export type SpectrumMode = "average" | "live";

const SPECTRUM_MODES = [
  { value: "average", label: "Average" },
  { value: "live", label: "Live" },
] as const;

// Two buffers alternate so React always sees a new reference without a fresh
// allocation every frame.
const makeBinPool = (size: number) => [new Float32Array(size), new Float32Array(size)];

/** Polls the lane's AnalyserNode while the transport runs; idle otherwise. */
function useLiveBins(transport: Transport, trackId: string, active: boolean): Float32Array | null {
  const [bins, setBins] = useState<Float32Array | null>(null);
  const pool = useRef<ReturnType<typeof makeBinPool> | null>(null);
  const flip = useRef(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33) return; // ~30 fps is plenty for a spectrum
      last = now;
      const analyser = transport.analyser(trackId);
      if (!analyser) return;
      pool.current ??= makeBinPool(analyser.frequencyBinCount);
      flip.current ^= 1;
      const target = pool.current[flip.current];
      analyser.getFloatFrequencyData(target);
      setBins(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transport, trackId, active]);

  return active ? bins : null;
}

function LaneMetrics({ metrics, note }: { metrics: DemoMetricSet | null; note: string }) {
  return (
    <div className="mt-6 border-t border-line pt-6">
      <div className="grid grid-cols-3 [&>*+*]:border-l [&>*+*]:border-line [&>*+*]:pl-4 [&>*]:pr-4 md:[&>*+*]:pl-6 md:[&>*]:pr-6">
        <MetricCell label="SNR" value={metrics?.snrDb ?? null} unit="dB" decimals={1} />
        <MetricCell label="STOI" value={metrics?.stoi ?? null} decimals={2} />
        <MetricCell label="PESQ" value={metrics?.pesq ?? null} decimals={2} />
      </div>
      <MonoNote className="mt-4">{note}</MonoNote>
    </div>
  );
}

export type AudioLaneProps = {
  laneName: string;
  trackId: string;
  color: PlotColor;
  clip: ClipData | null;
  overlay?: ClipData | null;
  overlayColor?: PlotColor;
  transport: Transport;
  playing: boolean;
  playhead: number;
  metrics: DemoMetricSet | null;
  metricsNote: string;
  /** Replaces the plots when there is nothing to draw yet. */
  placeholder?: string;
  audible?: boolean;
  /** Whether the transport is running at all — the lane's analyser has signal even when muted. */
  running?: boolean;
  /** Called immediately before a stopped lane starts playback. */
  onPlay?: () => void;
};

/** One before/after lane: header, waveform, spectrum and its manifest metrics. */
export function AudioLane({
  laneName,
  trackId,
  color,
  clip,
  overlay = null,
  overlayColor = "cy",
  transport,
  playing,
  playhead,
  metrics,
  metricsNote,
  placeholder = "no audio loaded",
  audible = true,
  running,
  onPlay,
}: AudioLaneProps) {
  const [mode, setMode] = useState<SpectrumMode>("average");
  const isRunning = running ?? playing;
  const live = useLiveBins(transport, trackId, mode === "live" && isRunning);
  const showingLive = mode === "live";

  return (
    <Panel className="p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-white">{laneName}</h3>
        <span className="min-w-0 truncate font-mono text-[11px] text-dim">{clip?.name ?? "—"}</span>
        {!audible && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">muted · A/B</span>}
        <div className="ml-auto">
          <TransportButton
            playing={playing}
            onToggle={() => {
              if (!playing) onPlay?.();
              transport.toggle(trackId);
            }}
            laneName={laneName}
            disabled={!clip}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">TIME · AMPLITUDE −1 … +1</p>
          <WaveformPlot
            envelope={clip?.envelope ?? null}
            overlay={overlay?.envelope ?? null}
            color={color}
            overlayColor={overlayColor}
            duration={clip?.duration ?? 0}
            playhead={clip ? playhead : undefined}
            onSeek={clip ? (seconds) => transport.seek(seconds) : undefined}
            height={132}
            label={`${laneName} waveform`}
            emptyLabel={placeholder}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">FREQUENCY · dBFS</p>
            <Segmented label={`${laneName} spectrum mode`} options={SPECTRUM_MODES} value={mode} onChange={setMode} />
          </div>
          <SpectrumPlot
            bins={showingLive ? live : (clip?.average ?? null)}
            sampleRate={clip?.sampleRate ?? 48000}
            fftSize={showingLive ? ANALYSER_FFT_SIZE : FFT_SIZE}
            color={color}
            filled={!showingLive}
            height={132}
            label={`${laneName} ${showingLive ? "live" : "average"} spectrum`}
            emptyLabel={showingLive ? "press play for the live spectrum" : placeholder}
          />
        </div>
      </div>

      <LaneMetrics metrics={metrics} note={metricsNote} />
    </Panel>
  );
}
