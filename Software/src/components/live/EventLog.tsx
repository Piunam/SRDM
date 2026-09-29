"use client";

import { Panel } from "@/components/ui/Panel";
import { PROTOCOL } from "@/lib/live/protocol";

export type LogKind = "link" | "gate" | "error" | "info" | "sim" | "rec";

export type LogEntry = {
  id: number;
  at: number;
  kind: LogKind;
  message: string;
};

const TONE: Record<LogKind, string> = {
  link: "text-white",
  gate: "text-cy",
  error: "text-fault",
  info: "text-dim",
  sim: "text-amber",
  rec: "text-silver",
};

const stamp = (at: number) =>
  new Date(at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

/** Newest first, so nothing has to scroll to stay readable. Capped at 200. */
export function EventLog({ entries }: { entries: LogEntry[] }) {
  return (
    <Panel className="flex h-full flex-col p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
          Event log
        </h2>
        <p className="font-mono text-[10px] tabular-nums text-faint">
          {entries.length} / {PROTOCOL.logLines} · newest first
        </p>
      </div>

      <ol
        className="no-native-scroll mt-3 max-h-[240px] min-h-[120px] overflow-y-auto"
        aria-label="Session events"
      >
        {entries.length === 0 && (
          <li className="font-mono text-[11px] text-faint">no events yet</li>
        )}
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex gap-3 border-b border-line2 py-1.5 last:border-b-0"
          >
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">
              {stamp(entry.at)}
            </span>
            <span
              className={`font-mono text-[11px] leading-[1.5] ${TONE[entry.kind]}`}
            >
              {entry.message}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
