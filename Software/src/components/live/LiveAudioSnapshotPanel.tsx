"use client";

import { useEffect, useMemo, useState } from "react";
import { AudioLane } from "@/components/demo/AudioLane";
import { Segmented } from "@/components/demo/controls";
import { useClips, type ClipSource } from "@/components/demo/clips";
import { Panel } from "@/components/ui/Panel";
import type { TransportTrack } from "@/lib/audio/transport";
import { useAudioEngine } from "@/lib/audio/useAudioEngine";
import type { PresetMetricSet } from "@/lib/demo/presets";

const INPUT = "input";
const OUTPUT = "output";
const OPTIONS = [
  { value: INPUT, label: "Input" },
  { value: OUTPUT, label: "Output" },
] as const;

type LiveDemoPayload = {
  status: "SIMULATED";
  input: { url: string; name: string; metrics: PresetMetricSet };
  output: { url: string; name: string; metrics: PresetMetricSet };
};

export function LiveAudioSnapshotPanel({ connected }: { connected: boolean }) {
  const [payload, setPayload] = useState<LiveDemoPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { transport, state } = useAudioEngine("sync");

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch("/api/live/audio", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Live demonstration audio is unavailable");
        return (await response.json()) as LiveDemoPayload;
      })
      .then((value) => {
        setPayload(value);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Live demonstration audio is unavailable",
        );
      });
    return () => controller.abort();
  }, [connected]);

  const visiblePayload = connected ? payload : null;
  const sources = useMemo<ClipSource[]>(
    () =>
      visiblePayload
        ? [
            { id: INPUT, url: visiblePayload.input.url },
            { id: OUTPUT, url: visiblePayload.output.url },
          ]
        : [],
    [visiblePayload],
  );
  const { clips, status, error } = useClips(sources);
  const input = clips?.get(INPUT) ?? null;
  const output = clips?.get(OUTPUT) ?? null;

  useEffect(() => {
    const tracks: TransportTrack[] = [];
    if (connected && input && output) {
      tracks.push({ id: INPUT, buffer: input.buffer });
      tracks.push({ id: OUTPUT, buffer: output.buffer });
    }
    transport.setTracks(tracks);
  }, [connected, input, output, transport]);

  const active = state.activeId ?? INPUT;
  const ready = connected && Boolean(input && output);
  const placeholder = connected
    ? status === "loading"
      ? "loading device audio…"
      : "audio unavailable"
    : "waiting for device";
  const note = connected
    ? "metrics from the local Live endpoint"
    : "Connect the device to load audio and metrics";

  return (
    <div className="flex flex-col gap-6">
      <Panel className="p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cy">
              Input / output
            </p>
            <p className="mt-2 text-[16px] leading-[1.5] text-silver">
              {ready
                ? "Input and output audio loaded."
                : connected
                  ? "Loading the local audio pair…"
                  : "The two lanes stay blank until the device connects."}
            </p>
          </div>
          {ready && (
            <Segmented
              label="Audible signal"
              options={OPTIONS}
              value={active === OUTPUT ? OUTPUT : INPUT}
              onChange={(value) => transport.setActive(value)}
            />
          )}
        </div>
        {(loadError ?? error) && (
          <p className="mt-4 font-mono text-[11px] text-fault">
            {loadError ?? error}
          </p>
        )}
      </Panel>

      <AudioLane
        laneName="INPUT"
        trackId={INPUT}
        color="fault"
        clip={connected ? input : null}
        transport={transport}
        playing={state.playing && active === INPUT}
        running={state.playing}
        playhead={state.time}
        metrics={visiblePayload?.input.metrics ?? null}
        metricsNote={note}
        audible={active === INPUT}
        placeholder={placeholder}
      />

      <AudioLane
        laneName="OUTPUT"
        trackId={OUTPUT}
        color="cy"
        clip={connected ? output : null}
        transport={transport}
        playing={state.playing && active === OUTPUT}
        running={state.playing}
        playhead={state.time}
        metrics={visiblePayload?.output.metrics ?? null}
        metricsNote={note}
        audible={active === OUTPUT}
        placeholder={placeholder}
      />
    </div>
  );
}
