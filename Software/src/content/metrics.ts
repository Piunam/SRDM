import type { Status } from "@/components/ui/StatusTag";

export type BestResult = {
  key: string;
  label: string;
  value: number;
  decimals: number;
  unit?: string;
  /** Sub-line under the figure: the acceptance target it is measured against. */
  target: string;
  status: Status;
};

/** Seeded from HERO.metrics. Every status stays TARGET until the owner says otherwise. */
export const bestResults: BestResult[] = [
  {
    key: "snr",
    label: "SNR",
    value: 20.2,
    decimals: 1,
    unit: "dB",
    target: "target > 15",
    status: "TARGET",
  },
  {
    key: "stoi",
    label: "STOI",
    value: 0.88,
    decimals: 2,
    target: "target > 0.85",
    status: "TARGET",
  },
  {
    key: "pesq",
    label: "PESQ",
    value: 2.6,
    decimals: 2,
    target: "target > 2.5",
    status: "TARGET",
  },
  {
    key: "latency",
    label: "Latency",
    value: 20,
    decimals: 0,
    unit: "ms",
    target: "wireless link",
    status: "TARGET",
  },
];

export const metricsEyebrow = "BEST RESULT · EVALUATION SET";

/** Set to "" once every row above is MEASURED. */
export const footnote =
  "These results are measured on moderate noisy conditions. In sever noise, the SNR gain is > 18 dB, STOI > 0.8, PESQ > 2.3 and this is going to improve with increase in training data.";
