"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scrollToAnchor } from "./docs-nav";

/**
 * The `#` affordance on a heading: navigates to the anchor and copies its URL.
 * Hidden until the heading is hovered or the link itself is focused.
 */
export function CopyLink({ targetId, label, className = "" }: { targetId: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      scrollToAnchor(targetId);
      navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}#${targetId}`).then(
        () => {
          setCopied(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1600);
        },
        () => undefined,
      );
    },
    [targetId],
  );

  return (
    <a
      href={`#${targetId}`}
      onClick={onClick}
      aria-label={`Copy link to “${label}”`}
      className={`rounded-[3px] font-mono text-[13px] leading-none opacity-0 transition-[color,opacity] duration-200 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-cy group-hover/h:opacity-100 ${
        copied ? "text-cy" : "text-faint hover:text-cy"
      } ${className}`}
    >
      <span aria-hidden="true">#</span>
    </a>
  );
}
