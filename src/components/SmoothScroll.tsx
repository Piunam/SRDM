"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";

let instance: Lenis | null = null;
const subs = new Set<(lenis: Lenis | null) => void>();

export const getLenis = () => instance;

/** Subscribe to the Lenis instance (called now and whenever it changes). */
export function onLenis(fn: (lenis: Lenis | null) => void) {
  subs.add(fn);
  fn(instance);
  return () => {
    subs.delete(fn);
  };
}

function setInstance(next: Lenis | null) {
  instance = next;
  subs.forEach((fn) => fn(next));
}

// Lenis driven by gsap.ticker so scroll, ScrollTrigger and the hero share one loop.
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Smooth scrolling is part of the cinematic home hero. Content and tool
    // pages stay native, which avoids downloading Lenis + GSAP for /system.
    if (pathname !== "/" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let lenis: Lenis | null = null;
    let removeTicker: (() => void) | null = null;

    void Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(([lenisModule, gsapModule, triggerModule]) => {
      if (cancelled) return;
      const LenisClass = lenisModule.default;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = triggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      lenis = new LenisClass({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
      });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      removeTicker = () => gsap.ticker.remove(raf);
      setInstance(lenis);
    });

    return () => {
      cancelled = true;
      removeTicker?.();
      lenis?.destroy();
      setInstance(null);
    };
  }, [pathname]);

  return <>{children}</>;
}

export default SmoothScroll;
