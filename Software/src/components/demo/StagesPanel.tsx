"use client";

import { useEffect, useMemo } from "react";
import { WaveformPlot } from "@/components/plots/WaveformPlot";
import { Panel } from "@/components/ui/Panel";
import type { TransportTrack } from "@/lib/audio/transport";
import { useAudioEngine } from "@/lib/audio/useAudioEngine";
import { useClips, type ClipSource } from "./clips";
import { MonoNote, TransportButton } from "./controls";
import { EmptyState } from "./EmptyState";
import { baseName, demoUrl, GATE_SNR_DB, snrLabel, type DemoItem } from "./manifest";
import { fmtDb } from "@/lib/format";

type LaneKey = "input" | "prefilter" | "rnnoise" | "postfilter";

const LANES: { key: LaneKey; label: string; detail: string }[] = [
  { key: "input", label: "01 · INPUT", detail: "as captured by the two mics" },
  { key: "prefilter", label: "02 · AFTER PREFILTER", detail: "beamformer and NLMS, before the network" },
  { key: "rnnoise", label: "03 · AFTER RNNOISE", detail: "GRU-128, int8 on the MCU" },
  { key: "postfilter", label: "04 · AFTER POST-FILTER", detail: "comb post-filter, the chain output" },
];

type Resolved = {
  key: LaneKey;
  label: string;
  detail: string;
  file: string | null;
  snrDb: number | null;
  note: string | null;
};

function resolveLanes(item: DemoItem): Resolved[] {
  const gated = item.inputSnrDb >= GATE_SNR_DB;
  return LANES.map(({ key, label, detail }) => {
    if (key === "input") return { key, label, detail, file: item.noisy.file, snrDb: item.noisy.snrDb, note: null };
    if (key === "postfilter") {
      const exported = item.stages.postfilter ?? null;
      // With no separate export the post-filter lane is the enhanced output itself.
      return exported
        ? { key, label, detail, file: exported, snrDb: null, note: null }
        : { key, label, detail, file: item.enhanced.file, snrDb: item.enhanced.snrDb, note: "chain output" };
    }
    if (key === "rnnoise" && gated) {
      return { key, label, detail, file: item.stages.rnnoise ?? null, snrDb: null, note: "skipped (gate)" };
    }
    const exported = item.stages[key] ?? null;
    return { key, label, detail, file: exported, snrDb: null, note: exported ? null : "not exported" };
  });
}

export function StagesPanel({ items, item }: { items: DemoItem[]; item: DemoItem | null }) {
  const { transport, state } = useAudioEngine("sync");

  const lanes = useMemo(() => (item ? resolveLanes(item) : []), [item]);
  const sources = useMemo<ClipSource[]>(
    () => lanes.flatMap((lane) => (lane.file ? [{ id: lane.key, url: demoUrl(lane.file) }] : [])),
    [lanes],
  );
  const { clips, status, error } = useClips(sources);

  useEffect(() => {
    const tracks: TransportTrack[] = [];
    for (const lane of lanes) {
      const clip = clips?.get(lane.key);
      if (clip) tracks.push({ id: lane.key, buffer: clip.buffer });
    }
    transport.setTracks(tracks);
  }, [transport, lanes, clips]);

  if (items.length === 0) return <EmptyState />;
  if (!item) return <EmptyState detail="No clip is selected." />;

  const gated = item.inputSnrDb >= GATE_SNR_DB;

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-5 md:p-6">
        <p className="max-w-[68ch] text-[17px] leading-[1.55] text-silver">
          The same clip tapped at four points in the chain. Input SNR is {snrLabel(item.inputSnrDb)}, so the gate{" "}
          {gated ? (
            <>
              runs <span className="text-white">DSP only</span> — at or above {snrLabel(GATE_SNR_DB)} the network is skipped to save cycles.
            </>
          ) : (
            <>
              runs <span className="text-white">DSP + RNNoise</span> — below {snrLabel(GATE_SNR_DB)} the network earns its power budget.
            </>
          )}
        </p>
        <MonoNote className="mt-3">
          {item.id} · {status === "error" ? <span className="text-fault">{error}</span> : status === "loading" ? "decoding…" : "stage exports"}
        </MonoNote>
      </Panel>

      {lanes.map((lane) => {
        const clip = clips?.get(lane.key) ?? null;
        const playing = state.playing && state.activeId === lane.key;
        const missing = !lane.file;
        return (
          <Panel key={lane.key} className={`p-5 ${missing ? "opacity-45" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-white">{lane.label}</h3>
              <span className="font-mono text-[11px] text-dim">{lane.file ? baseName(lane.file) : (lane.note ?? "not exported")}</span>
              {lane.note && lane.file && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-amber">{lane.note}</span>}
              <span className="ml-auto font-mono text-[12px] tabular-nums text-silver">SNR {fmtDb(lane.snrDb)}</span>
              <TransportButton playing={playing} onToggle={() => transport.toggle(lane.key)} laneName={lane.label} disabled={!clip} />
            </div>
            <p className="mt-2 font-mono text-[10px] text-faint">{lane.detail}</p>
            <div className="mt-3">
              <WaveformPlot
                envelope={clip?.envelope ?? null}
                color={lane.key === "input" ? "fault" : lane.key === "postfilter" ? "cy" : "silver"}
                duration={clip?.duration ?? 0}
                playhead={clip ? state.time : undefined}
                onSeek={clip ? (seconds) => transport.seek(seconds) : undefined}
                height={64}
                label={`${lane.label} waveform`}
                emptyLabel={missing ? (lane.note ?? "not exported") : status === "loading" ? "decoding…" : "no audio loaded"}
              />
            </div>
          </Panel>
        );
      })}

      <MonoNote>
        Stage SNR is only shown where the manifest carries a figure. The intermediate taps have no metrics of their own — add them to the
        evaluation output if you want them here.
      </MonoNote>
    </div>
  );
}
