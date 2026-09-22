import { StatusTag, type Status } from "./StatusTag";
import { fmt } from "@/lib/format";

export type MetricCellProps = {
  label: string;
  value: number | string | null;
  decimals?: number;
  unit?: string;
  sub?: string;
  status?: Status;
  className?: string;
};

/** A single figure with its label, sub-line and optional status. No box. */
export function MetricCell({ label, value, decimals = 1, unit, sub, status, className = "" }: MetricCellProps) {
  const text = value === null ? "—" : typeof value === "number" ? fmt(value, decimals) : value;
  return (
    <div className={className}>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5 leading-none">
        <span className="text-[40px] font-medium tracking-[-0.02em] text-white tabular-nums">{text}</span>
        {unit && <span className="text-[14px] text-dim">{unit}</span>}
      </p>
      {(sub || status) && (
        <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-dim">
          {sub}
          {status && <StatusTag status={status} />}
        </p>
      )}
    </div>
  );
}

/** A row of cells separated by hairlines. */
export function MetricRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 gap-y-8 md:grid-cols-4 [&>*]:px-0 md:[&>*+*]:border-l md:[&>*+*]:border-line md:[&>*+*]:pl-6 md:[&>*]:pr-6 ${className}`}
    >
      {children}
    </div>
  );
}
