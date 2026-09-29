import { HERO } from "@/components/hero/hero-config";
import { fmt } from "@/lib/format";
import type { SpecRowObject } from "@/components/docs/blocks/SpecTable";

/**
 * Section 11. Every figure quoted anywhere on the site appears here once, with
 * how it was arrived at. The four headline metrics are read straight from the
 * hero's config so the two can never disagree.
 */
export const LEDGER: SpecRowObject[] = [
  ...HERO.metrics.map((metric) => ({
    key: metric.label,
    value: `${fmt(metric.value, metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`,
    note: `${metric.target} · placeholder until the evaluation set is final`,
    status: metric.status,
  })),
  {
    key: "Frame length",
    value: `${HERO.readout.frameMs} ms`,
    note: "design constant; every stage runs on it",
    status: "TARGET",
  },
  {
    key: "SNR gate threshold",
    value: `+${HERO.snr.gateThreshold} dB`,
    note: "TODO(owner): chosen from offline sweeps; the sweep has not been published",
    status: "TARGET",
  },
  {
    key: "GRU hidden size",
    value: "128 units",
    note: "TODO(owner): source notes say “128 GRU layers”; confirm before publishing",
    status: "TARGET",
  },
  {
    key: "Bark bands",
    value: `${HERO.signal.bands}`,
    note: "band count used by the hero visualisation; confirm against the model",
    status: "TARGET",
  },
  {
    key: "Model size / RAM",
    value: "—",
    note: "not yet profiled on the target",
    status: "PLANNED",
  },
  {
    key: "Per-frame compute",
    value: "—",
    note: "not yet profiled on the target",
    status: "PLANNED",
  },
  {
    key: "Field performance",
    value: "—",
    note: "no evaluation on real recordings yet",
    status: "PLANNED",
  },
  {
    key: "FPGA DSP stage",
    value: "—",
    note: "explored only; no hardware result",
    status: "PLANNED",
  },
];
