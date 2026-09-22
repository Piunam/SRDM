"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Copies `text` to the clipboard and confirms in place for a moment. */
export function CopyButton({
  text,
  label = "Copy",
  doneLabel = "Copied",
  className = "",
}: {
  text: string;
  label?: string;
  doneLabel?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // No clipboard permission: fail quietly rather than alarm the reader.
    }
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1600);
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-[3px] px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy ${
        done ? "text-cy" : "text-dim hover:text-white"
      } ${className}`}
    >
      {done ? doneLabel : label}
    </button>
  );
}
