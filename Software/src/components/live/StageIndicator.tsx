"use client";

import { Panel } from "@/components/ui/Panel";
import { fmtDb } from "@/lib/format";
import { PROTOCOL, STAGES, STAGE_LABEL, type Stage } from "@/lib/live/protocol";

/** Which path the gate is taking right now, lit from the current frame. */
export function StageIndicator({
  stage,
  snrDb,
  stale,
}: {
  stage: Stage | null;
  snrDb: number | null;
  stale: boolean;
}) {
  return (
    <Panel className="flex h-full flex-col p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          Gate
        </h2>
        <p className="font-mono text-[10px] tabular-nums text-faint">
          threshold {fmtDb(PROTOCOL.gateSnrDb)}
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {STAGES.map((value) => {
          const active = !stale && stage === value;
          return (
            <li
              key={value}
              className={`flex items-center gap-2.5 rounded-[4px] border px-3 py-2 font-mono text-[12px] transition-colors duration-200 ${
                active ? "border-cy/45 text-cy" : "border-line text-faint"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-cy" : "bg-faint"}`}
                aria-hidden="true"
              />
              {STAGE_LABEL[value]}
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="sr-only">
        {stage === null || stale
          ? "Gate state unknown."
          : `Gate: ${STAGE_LABEL[stage]}.`}
      </p>

      <p className="mt-4 border-t border-line pt-3 font-mono text-[10px] leading-[1.6] text-faint">
        At or above {fmtDb(PROTOCOL.gateSnrDb)} input SNR the network is skipped
        and the DSP chain runs alone. Current input{" "}
        {snrDb === null || stale ? "—" : fmtDb(snrDb)}.
      </p>
    </Panel>
  );
}
