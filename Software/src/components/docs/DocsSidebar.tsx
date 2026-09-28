"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getLenis } from "@/components/SmoothScroll";
import { scrollToAnchor, useActiveHeading, useScrollProgress } from "./docs-nav";

export type DocsNavItem = { id: string; number: string; title: string };
export type DocsNavGroup = { label: string; items: readonly DocsNavItem[] };

function NavList({
  groups,
  activeId,
  onNavigate,
}: {
  groups: readonly DocsNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  const click = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(id);
  };

  return (
    <ul className="space-y-7">
      {groups.map((group) => (
        <li key={group.label}>
          <p className="mono-caps text-dim">{group.label}</p>
          <ul className="mt-2.5">
            {group.items.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(event) => click(event, item.id)}
                    aria-current={active ? "true" : undefined}
                    className={`relative flex items-baseline gap-3 py-[7px] pl-4 text-[14px] leading-[1.35] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy ${
                      active ? "text-white" : "text-silver hover:text-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-[3px] left-0 top-[3px] w-[2px] ${active ? "bg-cy" : "bg-transparent"}`}
                    />
                    <span className="font-mono text-[11px] text-dim tabular-nums">{item.number}</span>
                    <span>{item.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/**
 * Mobile and tablet nav: a bar under the header naming the current section,
 * which opens the full list as a sheet. It must be a direct child of the page
 * container so it stays stuck for the whole document.
 */
export function DocsSectionBar({ groups }: { groups: readonly DocsNavGroup[] }) {
  const { sectionId } = useActiveHeading();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  const items = groups.flatMap((group) => group.items);
  const current = items.find((item) => item.id === sectionId) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    sheet.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    scrollToAnchor(id);
  };

  return (
    <div data-print-hide className="sticky top-14 z-30 -mx-5 md:-mx-6 lg:hidden">
      <div className="border-b border-line bg-abyss/90 backdrop-blur-[10px]">
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="docs-section-sheet"
          className="flex w-full items-center gap-3 px-5 py-3 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-cy md:px-6"
        >
          <span className="font-mono text-[11px] text-cy tabular-nums">{current?.number}</span>
          <span className="text-[14px] text-white">{current?.title}</span>
          <svg
            viewBox="0 0 10 6"
            className={`ml-auto h-[6px] w-[10px] text-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            aria-hidden="true"
          >
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="sr-only">{open ? "Close section list" : "Open section list"}</span>
        </button>
      </div>

      <div
        id="docs-section-sheet"
        ref={sheet}
        hidden={!open}
        className="no-native-scroll fixed inset-x-0 bottom-0 top-14 z-30 overflow-y-auto bg-abyss px-5 pb-16 pt-8 md:px-6"
      >
        <nav aria-label="Sections">
          <NavList groups={groups} activeId={sectionId} onNavigate={go} />
        </nav>
      </div>
    </div>
  );
}

/** Desktop column: the numbered nav, sticky under the header, with reading progress. */
export function DocsSidebar({ groups }: { groups: readonly DocsNavGroup[] }) {
  const { sectionId } = useActiveHeading();
  const progress = useScrollProgress();
  const percent = Math.round(progress * 100);

  return (
    <nav
      aria-label="Sections"
      data-print-hide
      className="hidden lg:sticky lg:top-[88px] lg:block lg:self-start"
    >
      <NavList groups={groups} activeId={sectionId} onNavigate={scrollToAnchor} />
      {/* Reading progress; decorative, and duplicated by the global scroll indicator. */}
      <div className="mt-8" aria-hidden="true">
        <div className="h-px w-full bg-line">
          <div className="h-px bg-cy" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-faint tabular-nums">{percent}% read</p>
      </div>
    </nav>
  );
}
