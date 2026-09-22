"use client";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusTag } from "@/components/ui/StatusTag";
import { PROTOCOL } from "@/lib/live/protocol";
import type { FeedSource } from "@/lib/live/useLiveFeed";

export type RecorderProps = {
  recording: boolean;
  count: number;
  source: FeedSource;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
};

export function Recorder({
  recording,
  count,
  source,
  onStart,
  onStop,
  onExport,
}: RecorderProps) {
  const full = count >= PROTOCOL.maxRecordedFrames;

  return (
    <Panel className="flex h-full flex-col p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          Recorder
        </h2>
        {source === "simulated" && <StatusTag status="SIMULATED" />}
      </div>

      <p className="mt-3 flex items-baseline gap-2 font-mono text-[12px] text-silver">
        <span
          className={`h-2 w-2 shrink-0 self-center rounded-full ${recording ? "bg-fault live-pulse" : "bg-faint"}`}
          aria-hidden="true"
        />
        <span className="tabular-nums">{count.toLocaleString("en-GB")}</span>
        <span className="text-dim">frames captured</span>
      </p>
      <p aria-live="polite" className="sr-only">
        {recording ? "Recording frames." : "Recorder idle."}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {recording ? (
          <Button size="sm" onClick={onStop}>
            STOP RECORDING
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={onStart}
            disabled={source === "none"}
          >
            START RECORDING
          </Button>
        )}
        <Button size="sm" onClick={onExport} disabled={count === 0}>
          EXPORT JSON
        </Button>
      </div>

      <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] leading-[1.6] text-faint">
        {full
          ? `Capped at ${PROTOCOL.maxRecordedFrames.toLocaleString("en-GB")} frames · recording stopped. `
          : ""}
        The export carries the telemetry fields only — timestamp, SNR, gate
        stage, input and output RMS and latency — and is stamped with the feed
        it came from. WAV export needs PCM in the stream; the default protocol
        does not carry it. TODO(owner): add a PCM frame type if a recorded
        session should be listened to.
      </p>
    </Panel>
  );
}
