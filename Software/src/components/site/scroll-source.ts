"use client";

import { onLenis } from "../SmoothScroll";

export type ScrollInfo = { scroll: number; limit: number; direction: number };

/**
 * Scroll position from Lenis when it runs, or native scroll when it doesn't
 * (reduced motion). Calls `fn` on every change.
 */
export function subscribeScroll(fn: (info: ScrollInfo) => void) {
  let detachLenis: (() => void) | null = null;
  let last = window.scrollY;

  const native = () => {
    const scroll = window.scrollY;
    const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    fn({ scroll, limit, direction: Math.sign(scroll - last) });
    last = scroll;
  };

  const offLenis = onLenis((lenis) => {
    detachLenis?.();
    detachLenis = null;
    window.removeEventListener("scroll", native);
    window.removeEventListener("resize", native);
    if (lenis) {
      const handler = () => fn({ scroll: lenis.scroll, limit: lenis.limit, direction: lenis.direction });
      detachLenis = lenis.on("scroll", handler);
      handler();
    } else {
      window.addEventListener("scroll", native, { passive: true });
      window.addEventListener("resize", native);
      native();
    }
  });

  return () => {
    offLenis();
    detachLenis?.();
    window.removeEventListener("scroll", native);
    window.removeEventListener("resize", native);
  };
}
