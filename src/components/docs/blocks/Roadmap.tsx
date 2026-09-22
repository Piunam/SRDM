import { StatusTag, type Status } from "@/components/ui/StatusTag";

export type RoadmapItem = {
  /** Date or quarter, e.g. "Q4 2026". */
  when: string;
  title: string;
  detail: string;
  status: Status;
};

const DOT: Record<Status, string> = {
  MEASURED: "bg-cy",
  WORKING: "bg-cy",
  SIMULATED: "bg-amber",
  "IN DEMO": "bg-amber",
  "IN PROGRESS": "bg-amber",
  TARGET: "bg-faint",
  PLANNED: "bg-faint",
};

/** Vertical timeline: one hairline rule, a marker per item, no boxes. */
export function Roadmap({ items, className = "" }: { items: readonly RoadmapItem[]; className?: string }) {
  return (
    <ol className={`my-8 list-none border-l border-line pl-0 ${className}`}>
      {items.map((item) => (
        <li key={item.title} className="relative pb-9 pl-6 last:pb-0">
          <span className={`absolute -left-[3px] top-[6px] h-[5px] w-[5px] rounded-full ${DOT[item.status]}`} aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim tabular-nums">{item.when}</span>
            <StatusTag status={item.status} />
          </div>
          <p className="mt-2 text-[16px] leading-[1.5] text-white">{item.title}</p>
          <p className="mt-1 text-[14px] leading-[1.65] text-silver">{item.detail}</p>
        </li>
      ))}
    </ol>
  );
}
