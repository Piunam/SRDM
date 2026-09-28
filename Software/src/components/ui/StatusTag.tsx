export const STATUS_VALUES = ["MEASURED", "SIMULATED", "TARGET", "PLANNED", "WORKING", "IN DEMO", "IN PROGRESS"] as const;
export type Status = (typeof STATUS_VALUES)[number];

// Teal = confirmed, amber = partial, dim = not yet.
const TONE: Record<Status, string> = {
  MEASURED: "text-cy border-cy/45",
  WORKING: "text-cy border-cy/45",
  SIMULATED: "text-amber border-amber/45",
  "IN DEMO": "text-amber border-amber/45",
  "IN PROGRESS": "text-amber border-amber/45",
  TARGET: "text-dim border-line3",
  PLANNED: "text-dim border-line3",
};

export function StatusTag({ status, className = "" }: { status: Status; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-[1.4] tracking-[0.08em] ${TONE[status]} ${className}`}
    >
      {status}
    </span>
  );
}
