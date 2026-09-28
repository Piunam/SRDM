"use client";

import type { MouseEvent } from "react";
import { scrollToAnchor, useActiveHeading, useSectionHeadings } from "./docs-nav";

/** The h3 headings of the section currently being read. Hidden below 1024px. */
export function OnThisPage() {
  const { sectionId, headingId } = useActiveHeading();
  const headings = useSectionHeadings(sectionId);

  const click = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    scrollToAnchor(id);
  };

  return (
    <nav
      aria-label="On this page"
      data-print-hide
      className="hidden lg:sticky lg:top-[88px] lg:block lg:self-start"
    >
      <p className="mono-caps text-dim">On this page</p>
      {headings.length === 0 ? (
        <p className="mt-3 font-mono text-[11px] leading-[1.6] text-faint">No sub-headings</p>
      ) : (
        <ul className="mt-3 space-y-[2px]">
          {headings.map((heading) => {
            const active = heading.id === headingId;
            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  onClick={(event) => click(event, heading.id)}
                  aria-current={active ? "true" : undefined}
                  className={`block py-1 text-[13px] leading-[1.45] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy ${
                    active ? "text-white" : "text-silver hover:text-white"
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
