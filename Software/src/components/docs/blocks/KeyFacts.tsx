import { MetricCell, MetricRow } from "@/components/ui/MetricCell";
import type { Status } from "@/components/ui/StatusTag";

export type KeyFact = {
  label: string;
  value: string | number | null;
  decimals?: number;
  unit?: string;
  sub?: string;
  status?: Status;
};

/** A row of 3–4 figures with hairline dividers, in the hero's metric style. */
export function KeyFacts({ items, className = "" }: { items: readonly KeyFact[]; className?: string }) {
  return (
    <MetricRow className={`my-10 ${className}`}>
      {items.map((item) => (
        <MetricCell key={item.label} {...item} />
      ))}
    </MetricRow>
  );
}
