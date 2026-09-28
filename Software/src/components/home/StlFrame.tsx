"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { EnclosureOutline } from "./EnclosureOutline";
import { HOME } from "./home-copy";

const RATIO = "16 / 10";
const { model } = HOME;

function Skeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-panel">
      <span className="mono-label text-faint">loading viewer…</span>
    </div>
  );
}

const ModelCanvas = dynamic(() => import("./ModelCanvas"), { ssr: false, loading: () => <Skeleton /> });

function Toggle({ wireframe, onChange }: { wireframe: boolean; onChange: (v: boolean) => void }) {
  const item = (active: boolean) =>
    `h-7 px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-cy ${
      active ? "bg-cy text-[#04121A]" : "text-dim hover:text-white"
    }`;
  return (
    <div role="group" aria-label="Model display mode" className="flex overflow-hidden rounded-[4px] border border-line bg-abyss/80">
      <button type="button" aria-pressed={!wireframe} className={item(!wireframe)} onClick={() => onChange(false)}>
        Solid
      </button>
      <span aria-hidden="true" className="w-px bg-line" />
      <button type="button" aria-pressed={wireframe} className={item(wireframe)} onClick={() => onChange(true)}>
        Wireframe
      </button>
    </div>
  );
}

/** Lazy STL canvas shared by the home prototype block and /system hardware. */
export function StlFrame({
  label = "Interactive 3D model of the printed enclosure. Drag to rotate.",
}: {
  label?: string;
}) {
  const stlUrl = siteConfig.assets.stlUrl;
  const host = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [wireframe, setWireframe] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!stlUrl || !el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stlUrl, inView]);

  const onInteract = useCallback(() => setInteracted(true), []);

  return (
    <div ref={host} className="relative w-full" style={{ aspectRatio: RATIO }}>
      {stlUrl ? (
        <>
          {inView ? (
            <ModelCanvas
              url={stlUrl}
              wireframe={wireframe}
              autoRotate={!interacted}
              onInteract={onInteract}
              label={label}
            />
          ) : (
            <Skeleton />
          )}
          <p
            aria-hidden={interacted}
            className={`pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.14em] text-dim transition-opacity duration-500 ${
              interacted ? "opacity-0" : "opacity-100"
            }`}
          >
            {model.hint}
          </p>
          <div className="absolute right-3 top-3">
            <Toggle wireframe={wireframe} onChange={setWireframe} />
          </div>
        </>
      ) : (
        <>
          <div className="h-full w-full p-5 md:p-8">
            <EnclosureOutline />
          </div>
          <p className="pointer-events-none absolute bottom-3 left-3 font-mono text-[11px] tracking-[0.08em] text-dim">
            {model.pendingLabel}
          </p>
        </>
      )}
    </div>
  );
}
