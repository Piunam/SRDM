import { Panel } from "@/components/ui/Panel";

const Bar = ({ className = "" }: { className?: string }) => <div className={`rounded-[2px] bg-line ${className}`} />;

/** Structural placeholder — the shape of a panel, not a spinner. */
export function PanelSkeleton({ lanes = 2 }: { lanes?: number }) {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <Panel className="p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Bar className="h-2 w-16" />
              <Bar className="mt-3 h-9 w-full opacity-60" />
            </div>
          ))}
        </div>
      </Panel>
      {Array.from({ length: lanes }, (_, i) => (
        <Panel key={i} className="p-5 md:p-6">
          <Bar className="h-2 w-28" />
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Bar className="h-[132px] w-full opacity-40" />
            <Bar className="h-[132px] w-full opacity-40" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-6">
            {Array.from({ length: 3 }, (_, j) => (
              <div key={j}>
                <Bar className="h-2 w-10" />
                <Bar className="mt-3 h-8 w-20 opacity-60" />
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

/** The rail and a panel, for the route-level loading state. */
export function DemoSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:gap-12" aria-hidden="true">
      <div className="hidden flex-col gap-3 md:flex">
        {Array.from({ length: 4 }, (_, i) => (
          <Bar key={i} className="h-7 w-full opacity-50" />
        ))}
      </div>
      <PanelSkeleton />
    </div>
  );
}
