import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-[2px] bg-line ${className}`} />
);

export default function Loading() {
  return (
    <main className="bg-abyss">
      <Section className="pt-20 pb-24 md:pt-24 md:pb-28">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          Live session
        </p>
        <Bar className="mt-4 h-9 w-[320px] max-w-full" />

        <div className="mt-10 flex flex-col gap-6" aria-hidden="true">
          <Panel className="p-5">
            <Bar className="h-4 w-[180px]" />
          </Panel>
          <Panel className="p-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Bar className="h-3 w-16" />
                  <Bar className="mt-3 h-8 w-20" />
                </div>
              ))}
            </div>
          </Panel>
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_320px]">
            {[0, 1].map((i) => (
              <Panel key={i} className="p-5">
                <Bar className="h-3 w-20" />
                <Bar className="mt-4 h-[132px] w-full" />
                <Bar className="mt-4 h-[132px] w-full" />
              </Panel>
            ))}
            <Panel className="p-5">
              <Bar className="h-3 w-16" />
              <Bar className="mt-4 h-9 w-full" />
              <Bar className="mt-2 h-9 w-full" />
            </Panel>
          </div>
        </div>

        <p className="mt-8 font-mono text-[11px] text-faint">
          loading session…
        </p>
      </Section>
    </main>
  );
}
