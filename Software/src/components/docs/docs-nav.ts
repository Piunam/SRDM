"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getLenis } from "@/components/SmoothScroll";
import { subscribeScroll } from "@/components/site/scroll-source";

/** Fixed header (56px) plus breathing room, used for every anchor landing. */
export const DOC_OFFSET = 88;

export type ActiveHeading = { sectionId: string; headingId: string };
export type DocHeading = { id: string; text: string };

const EMPTY: ActiveHeading = { sectionId: "", headingId: "" };
const NO_HEADINGS: DocHeading[] = [];

// One observer for the whole page, shared by the sidebar and the right rail.
let active: ActiveHeading = EMPTY;
let observer: IntersectionObserver | null = null;
let headings: HTMLElement[] = [];
let subheadings = new Map<string, DocHeading[]>();
const visible = new Set<Element>();
const listeners = new Set<() => void>();

const sectionOf = (el: Element) => el.closest<HTMLElement>("[data-doc-section]")?.dataset.docSection ?? "";

function setActive(next: ActiveHeading) {
  if (next.sectionId === active.sectionId && next.headingId === active.headingId) return;
  active = next;
  listeners.forEach((listener) => listener());
}

/** The h3 headings of every section, read once from the rendered MDX. */
function collectSubheadings() {
  subheadings = new Map(
    Array.from(document.querySelectorAll<HTMLElement>("[data-doc-section]"), (section) => [
      section.dataset.docSection ?? "",
      Array.from(section.querySelectorAll<HTMLElement>("h3[id]"), (heading) => ({
        id: heading.id,
        text: (heading.querySelector("[data-doc-text]") ?? heading).textContent?.trim() ?? "",
      })),
    ]),
  );
}

function start() {
  collectSubheadings();
  headings = Array.from(document.querySelectorAll<HTMLElement>("[data-doc-root] :is(h2,h3)[id]"));
  const first = headings[0];
  if (!first) return;
  setActive({ sectionId: sectionOf(first), headingId: first.id });

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      // The topmost heading inside the band wins; otherwise the last one sticks.
      const current = headings.find((heading) => visible.has(heading));
      if (current) setActive({ sectionId: sectionOf(current), headingId: current.id });
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );
  headings.forEach((heading) => observer?.observe(heading));
}

function stop() {
  observer?.disconnect();
  observer = null;
  headings = [];
  subheadings = new Map();
  visible.clear();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

const getSnapshot = () => active;
const getServerSnapshot = () => EMPTY;

export function useActiveHeading(): ActiveHeading {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Fraction of the document scrolled, from Lenis when it runs. */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);
  useEffect(
    () =>
      subscribeScroll(({ scroll, limit }) => {
        setProgress(limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0);
      }),
    [],
  );
  return progress;
}

/** The h3 headings of one section. */
export function useSectionHeadings(sectionId: string): DocHeading[] {
  return useSyncExternalStore(
    subscribe,
    () => subheadings.get(sectionId) ?? NO_HEADINGS,
    () => NO_HEADINGS,
  );
}

/** Smooth-scroll to an anchor under the header and update the hash without a jump. */
export function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(el, { offset: -DOC_OFFSET });
  } else {
    // No Lenis means reduced motion is on; scroll-margin supplies the offset.
    el.scrollIntoView({ behavior: "auto", block: "start" });
  }
  window.history.replaceState(null, "", `#${id}`);
}
