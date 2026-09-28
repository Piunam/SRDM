"use client";

import { useEffect, useRef, useState } from "react";
import { getHeroTrack, onHeroTrack } from "@/lib/scroll-store";
import { getLenis } from "../SmoothScroll";
import { subscribeScroll, type ScrollInfo } from "./scroll-source";

const TOP = 72;
const BOTTOM = 16;
const MIN_THUMB = 32;
const IDLE_MS = 1200;
const EDGE_PX = 24;

// Quiet position indicator on the right edge. The native bar is hidden in CSS.
export function ScrollIndicator() {
  const [enabled, setEnabled] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const ticks = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Touch devices keep native (hidden) scrolling only.
    const coarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setEnabled(!coarse.matches);
    sync();
    coarse.addEventListener("change", sync);
    return () => coarse.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const tr = track.current!;
    const th = thumb.current!;
    const tk = ticks.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let info: ScrollInfo = { scroll: 0, limit: 1, direction: 0 };
    let idle: number | undefined;
    let hovering = false;
    let dragging = false;
    let grab = 0;

    const geom = () => {
      const trackH = tr.clientHeight;
      const docH = info.limit + window.innerHeight;
      const thumbH = Math.max(MIN_THUMB, (trackH * window.innerHeight) / Math.max(docH, 1));
      return { trackH, thumbH, travel: Math.max(1, trackH - thumbH) };
    };
    const yFor = (scroll: number) => {
      const g = geom();
      return (scroll / Math.max(info.limit, 1)) * g.travel;
    };

    const show = () => {
      tr.dataset.visible = "true";
      window.clearTimeout(idle);
      if (reduced) return;
      idle = window.setTimeout(() => {
        if (!hovering && !dragging) tr.dataset.visible = "false";
      }, IDLE_MS);
    };

    const renderTicks = () => {
      const hero = getHeroTrack();
      tk.replaceChildren();
      if (!hero) return;
      const { thumbH } = geom();
      for (const p of hero.acts) {
        const doc = hero.start + p * (hero.end - hero.start);
        const el = document.createElement("span");
        el.className = "absolute left-1/2 h-px w-[5px] -translate-x-1/2 bg-silver/60";
        el.style.top = `${yFor(doc) + thumbH / 2}px`;
        tk.appendChild(el);
      }
    };

    const render = () => {
      const g = geom();
      th.style.height = `${g.thumbH}px`;
      th.style.transform = `translateY(${yFor(info.scroll)}px)`;
      const hero = getHeroTrack();
      const inHero = !!hero && info.scroll >= hero.start && info.scroll <= hero.end;
      tr.dataset.hero = String(inHero);
    };

    const offScroll = subscribeScroll((next) => {
      const changed = Math.abs(next.scroll - info.scroll) > 0.5 || next.limit !== info.limit;
      const limitChanged = next.limit !== info.limit;
      info = next;
      render();
      if (limitChanged) renderTicks();
      if (changed) show();
    });
    const offHero = onHeroTrack(() => {
      renderTicks();
      render();
    });

    const scrollTo = (y: number, immediate: boolean) => {
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, immediate ? { immediate: true } : { duration: 1 });
      else window.scrollTo({ top: y, behavior: immediate || reduced ? "auto" : "smooth" });
    };
    const docYFromPointer = (clientY: number, offset: number) => {
      const rect = tr.getBoundingClientRect();
      const { travel } = geom();
      const f = (clientY - rect.top - offset) / travel;
      return Math.min(1, Math.max(0, f)) * info.limit;
    };

    const onThumbDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      tr.dataset.drag = "true";
      th.setPointerCapture(e.pointerId);
      grab = e.clientY - th.getBoundingClientRect().top;
      show();
    };
    const onThumbMove = (e: PointerEvent) => {
      if (!dragging) return;
      scrollTo(docYFromPointer(e.clientY, grab), true);
    };
    const onThumbUp = (e: PointerEvent) => {
      dragging = false;
      tr.dataset.drag = "false";
      if (th.hasPointerCapture(e.pointerId)) th.releasePointerCapture(e.pointerId);
      show();
    };
    const onTrackDown = (e: PointerEvent) => {
      if (e.target === th) return;
      scrollTo(docYFromPointer(e.clientY, geom().thumbH / 2), false);
    };
    const onEnter = () => {
      hovering = true;
      show();
    };
    const onLeave = () => {
      hovering = false;
      show();
    };
    const onWindowMove = (e: PointerEvent) => {
      if (window.innerWidth - e.clientX <= EDGE_PX) show();
    };
    const onResize = () => {
      render();
      renderTicks();
    };

    th.addEventListener("pointerdown", onThumbDown);
    th.addEventListener("pointermove", onThumbMove);
    th.addEventListener("pointerup", onThumbUp);
    th.addEventListener("pointercancel", onThumbUp);
    tr.addEventListener("pointerdown", onTrackDown);
    tr.addEventListener("pointerenter", onEnter);
    tr.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointermove", onWindowMove, { passive: true });
    window.addEventListener("resize", onResize);
    if (reduced) tr.dataset.visible = "true";

    return () => {
      offScroll();
      offHero();
      window.clearTimeout(idle);
      th.removeEventListener("pointerdown", onThumbDown);
      th.removeEventListener("pointermove", onThumbMove);
      th.removeEventListener("pointerup", onThumbUp);
      th.removeEventListener("pointercancel", onThumbUp);
      tr.removeEventListener("pointerdown", onTrackDown);
      tr.removeEventListener("pointerenter", onEnter);
      tr.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={track}
      aria-hidden="true"
      data-visible="false"
      data-hero="false"
      data-drag="false"
      className="group/track fixed right-2 z-[60] w-[2px] rounded-[3px] bg-line opacity-0 transition-[opacity,width] duration-300 hover:w-[6px] data-[drag=true]:w-[6px] data-[visible=true]:opacity-100 motion-reduce:transition-none"
      style={{ top: TOP, bottom: BOTTOM }}
    >
      <div ref={ticks} className="pointer-events-none absolute inset-0 hidden group-data-[hero=true]/track:block" />
      <div
        ref={thumb}
        className="absolute left-0 top-0 w-full cursor-grab touch-none rounded-[3px] bg-silver transition-colors duration-200 group-hover/track:bg-white group-data-[drag=true]/track:cursor-grabbing group-data-[drag=true]/track:bg-white group-data-[hero=true]/track:bg-cy"
      />
    </div>
  );
}
