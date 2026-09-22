"use client";

import Link from "next/link";
import { MetricCell } from "@/components/ui/MetricCell";
import { Panel } from "@/components/ui/Panel";
import type { Status } from "@/components/ui/StatusTag";
import { PROTOCOL } from "@/lib/live/protocol";
import type { FeedSource, LiveView } from "@/lib/live/useLiveFeed";

/**
 * The live readout. Nothing here is ever tagged MEASURED: a number off the wire
 * is telemetry, not an evaluation result, and STOI and PESQ are not computed
 * live at all.
 */
export function LiveMetrics({
  view,
  source,
}: {
  view: LiveView;
  source: FeedSource;
}) {
  const stale = view.stalled || source === "none";
  const status: Status | undefined =
    source === "simulated"
      ? "SIMULATED"
      : source === "device"
        ? "IN DEMO"
        : undefined;
  const value = (v: number | null) => (stale ? null : v);

  return (
    <Panel className="p-5 md:p-6">
      <div className="grid grid-cols-2 gap-y-8 md:grid-cols-5 md:[&>*+*]:border-l md:[&>*+*]:border-line md:[&>*+*]:pl-6 md:[&>*]:pr-6">
        <MetricCell
          label="SNR now"
          value={value(view.snrDb)}
          decimals={1}
          unit="dB"
          sub="current frame"
          status={status}
        />
        <MetricCell
          label={`SNR ${PROTOCOL.meanSeconds}s mean`}
          value={value(view.snrMeanDb)}
          decimals={1}
          unit="dB"
          sub="rolling"
          status={status}
        />
        <MetricCell
          label="Latency"
          value={value(view.latencyMs)}
          decimals={0}
          unit="ms"
          sub={source === "device" ? "reported by device" : "simulated"}
          status={status}
        />
        <MetricCell label="STOI" value={null} sub="offline metrics only" />
        <MetricCell label="PESQ" value={null} sub="offline metrics only" />
      </div>

      <p className="mt-6 border-t border-line pt-4 font-mono text-[11px] leading-[1.6] text-dim">
        Live figures are telemetry from the running chain, not evaluation
        results. STOI and PESQ are computed offline against a clean reference —{" "}
        <Link
          href="/system#status-ledger"
          className="text-silver underline decoration-line3 underline-offset-[3px] hover:text-cy"
        >
          see the status ledger
        </Link>
        .
      </p>
    </Panel>
  );
}
