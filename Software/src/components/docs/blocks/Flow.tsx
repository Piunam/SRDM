import { Fragment, type ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";

export type FlowStep = {
  label: string;
  sub?: string;
  /**
   * Marks this step as the one decision in the chain. The step that follows it
   * sits on the "through" lane; the "bypass" lane skips that step and rejoins.
   */
  branch?: { bypass: string; throughTag?: string; bypassTag?: string };
};

type FlowItem = { kind: "step"; step: FlowStep } | { kind: "branch"; gate: FlowStep; lane: FlowStep };

function group(steps: readonly FlowStep[]): FlowItem[] {
  const items: FlowItem[] = [];
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const next = steps[i + 1];
    if (step.branch && next) {
      items.push({ kind: "step", step });
      items.push({ kind: "branch", gate: step, lane: next });
      i += 1;
    } else {
      items.push({ kind: "step", step });
    }
  }
  return items;
}

function Box({ step, muted = false }: { step: FlowStep; muted?: boolean }) {
  const body = (
    <>
      <p className={`font-mono text-[11px] leading-[1.4] ${muted ? "text-dim" : "text-white"}`}>{step.label}</p>
      {step.sub && <p className="mt-1 font-mono text-[10.5px] leading-[1.4] text-dim">{step.sub}</p>}
    </>
  );
  // The bypass lane is drawn as a dashed outline, so it cannot use Panel.
  return muted ? (
    <div className="rounded-[4px] border border-dashed border-line px-3 py-2.5">{body}</div>
  ) : (
    <Panel className="px-3 py-2.5">{body}</Panel>
  );
}

/** Rotates to point down when the diagram stacks on small screens. */
function Arrow() {
  return (
    <div className="@min-[620px]:py-0 flex shrink-0 items-center justify-center py-1.5 text-faint" aria-hidden="true">
      <svg viewBox="0 0 24 8" className="@min-[620px]:rotate-0 h-2 w-4 rotate-90" fill="none">
        <path d="M0 4h20m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="square" />
      </svg>
    </div>
  );
}

function Lane({ tag, accent = false, children }: { tag: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-stretch gap-2.5">
      <span className={`mono-caps flex w-7 shrink-0 items-center ${accent ? "text-cy" : "text-dim"}`}>{tag}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Pipeline diagram: boxes joined by arrows. It turns horizontal once the reading
 * column is wide enough for it — a container query, not a viewport one, because
 * the column is narrowest at 1024px where the three columns are all on screen.
 * One step may branch, which renders the following step on the "through" lane
 * and a dashed bypass lane beside it.
 */
export function Flow({ steps, caption, className = "" }: { steps: readonly FlowStep[]; caption?: string; className?: string }) {
  const items = group(steps);

  return (
    <figure className={`my-8 ${className}`}>
      <div className="@min-[620px]:flex-row @min-[620px]:items-center flex flex-col items-stretch">
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && <Arrow />}
            {item.kind === "step" ? (
              <div className="@min-[620px]:flex-1 min-w-0">
                <Box step={item.step} />
              </div>
            ) : (
              <div className="@min-[620px]:flex-[1.35] flex min-w-0 flex-col gap-2">
                <Lane tag={item.gate.branch?.throughTag ?? "No"} accent>
                  <Box step={item.lane} />
                </Lane>
                <Lane tag={item.gate.branch?.bypassTag ?? "Yes"}>
                  <Box step={{ label: item.gate.branch?.bypass ?? "" }} muted />
                </Lane>
              </div>
            )}
          </Fragment>
        ))}
      </div>
      {caption && <figcaption className="mt-3 font-mono text-[11px] leading-[1.5] text-dim">{caption}</figcaption>}
    </figure>
  );
}
