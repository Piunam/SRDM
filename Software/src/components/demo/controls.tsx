"use client";

import { Button } from "@/components/ui/Button";

export type SegmentedOption<T extends string> = { value: T; label: string; disabled?: boolean };

/** Two- or three-way switch used for the A/B lane and the spectrum mode. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`inline-flex overflow-hidden rounded-[4px] border border-line ${className}`}>
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={`h-7 px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-cy disabled:cursor-not-allowed disabled:opacity-40 ${
              i > 0 ? "border-l border-line" : ""
            } ${active ? "bg-deep text-cy" : "text-dim hover:text-white"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PlayGlyph({ playing }: { playing: boolean }) {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true" fill="currentColor">
      {playing ? (
        <>
          <rect x="0.5" y="0.5" width="3" height="9" />
          <rect x="5.5" y="0.5" width="3" height="9" />
        </>
      ) : (
        <path d="M1 0.5 L8.5 5 L1 9.5 Z" />
      )}
    </svg>
  );
}

/** Play / pause for one lane. Labelled so the state is announced, not just drawn. */
export function TransportButton({
  playing,
  onToggle,
  laneName,
  disabled,
  size = "sm",
}: {
  playing: boolean;
  onToggle: () => void;
  laneName: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <Button size={size} variant={playing ? "primary" : "ghost"} disabled={disabled} onClick={onToggle} aria-label={`${playing ? "Pause" : "Play"} ${laneName}`}>
      <PlayGlyph playing={playing} />
      {playing ? "PAUSE" : "PLAY"}
    </Button>
  );
}

/** A dim mono footnote. Used for the offline-metrics disclaimer and file paths. */
export function MonoNote({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`font-mono text-[10px] leading-[1.6] text-faint ${className}`}>{children}</p>;
}
