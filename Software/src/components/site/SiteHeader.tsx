"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";
import { getHeroTrack } from "@/lib/scroll-store";
import { subscribeScroll } from "./scroll-source";

function Glyph() {
  // A small monochrome mark: a waveform resolving to a line.
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h2l1.5-4 2 8 2-6 1.5 2H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Lock() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(
    () =>
      subscribeScroll(({ scroll, direction }) => {
        setScrolled(scroll > 40);
        // While the hero is pinned, get out of the way on the way down.
        const hero = getHeroTrack();
        const inHero = !!hero && scroll > hero.start + 4 && scroll < hero.end;
        if (!inHero) setHidden(false);
        else if (direction > 0) setHidden(true);
        else if (direction < 0) setHidden(false);
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const solid = scrolled || open;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-14 border-b transition-[background-color,border-color,transform,backdrop-filter] duration-200 ${
          solid ? "border-line bg-[rgba(6,11,18,.72)] backdrop-blur-[12px]" : "border-transparent bg-transparent"
        } ${hidden && !open ? "-translate-y-full" : "translate-y-0"}`}
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center gap-8 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-white" onClick={() => setOpen(false)}>
            <Glyph />
            <span className="text-[14px] font-semibold tracking-[-0.2px]">{siteConfig.name}</span>
          </Link>

          <nav aria-label="Primary" className="ml-auto hidden items-center gap-7 md:flex">
            {siteConfig.nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 text-[14px] transition-colors duration-200 ${
                    active ? "text-white underline decoration-1 underline-offset-[6px]" : "text-silver hover:text-white"
                  }`}
                >
                  {item.label}
                  {item.locked && <Lock />}
                </Link>
              );
            })}
          </nav>

          <span className="mono-caps hidden items-center gap-2 text-[10px] text-dim md:flex" aria-label="Build status">
            <span className="h-1.5 w-1.5 rounded-full bg-cy" aria-hidden="true" />
            {siteConfig.status}
          </span>

          <button
            type="button"
            className="ml-auto flex h-9 w-9 flex-col items-center justify-center gap-[5px] md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`block h-px w-5 bg-white transition-transform duration-200 ${open ? "translate-y-[3px] rotate-45" : ""}`} />
            <span className={`block h-px w-5 bg-white transition-transform duration-200 ${open ? "-translate-y-[3px] -rotate-45" : ""}`} />
          </button>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`no-native-scroll fixed inset-0 z-40 flex flex-col bg-abyss px-4 pb-10 pt-24 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-5">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 text-[28px] font-medium tracking-[-0.02em] ${isActive(item.href) ? "text-white" : "text-silver"}`}
            >
              {item.label}
              {item.locked && <Lock />}
            </Link>
          ))}
        </nav>
        <span className="mono-caps mt-auto flex items-center gap-2 text-[10px] text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-cy" aria-hidden="true" />
          {siteConfig.status}
        </span>
      </div>
    </>
  );
}
