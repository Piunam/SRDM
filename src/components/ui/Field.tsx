"use client";

import { useId, type ReactNode } from "react";

/** Labelled wrapper for the select and file inputs on /demo and /live. */
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: (props: { id: string; className: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const control =
    "h-9 w-full rounded-[4px] border border-line bg-abyss px-2.5 font-mono text-[12px] text-white transition-colors duration-200 hover:border-line3 focus:border-cy focus:outline-none";
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-dim">
        {label}
      </label>
      {children({ id, className: control })}
      {hint && <p className="mt-1.5 font-mono text-[10px] text-faint">{hint}</p>}
    </div>
  );
}
