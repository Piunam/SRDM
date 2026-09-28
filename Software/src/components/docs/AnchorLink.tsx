"use client";

import type { MouseEvent, ReactNode } from "react";
import { scrollToAnchor } from "./docs-nav";

/** In-page link that scrolls smoothly under the header and updates the hash. */
export function AnchorLink({
  targetId,
  children,
  className = "",
  ariaLabel,
}: {
  targetId: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    scrollToAnchor(targetId);
  };

  return (
    <a href={`#${targetId}`} onClick={click} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  );
}
