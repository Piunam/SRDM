"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Figure } from "@/components/ui/Figure";
import { siteConfig } from "@/lib/site-config";
import { EnclosureOutline } from "./EnclosureOutline";
import { HOME } from "./home-copy";
import { Reveal } from "./Reveal";

const { model } = HOME;
const RATIO = "16 / 10";

function Skeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-panel">
      <span className="mono-label text-faint">loading viewer…</span>
    </div>
  );
}

// three.js only ships on this page, and only once the frame is near the viewport.
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

export function ModelViewer() {
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
    <Section id="prototype" className="border-t border-line bg-abyss">
      <Reveal>
        <SectionHeader
          number={model.number}
          label={model.label}
          title={model.title}
          lede={stlUrl ? model.lede : undefined}
          headingId="prototype-title"
        />
      </Reveal>

      <Reveal delay={0.06} className="mt-4">
        <Figure caption={stlUrl ? model.caption : `${model.caption} · ${model.pendingLabel}`}>
          <div ref={host} className="relative w-full" style={{ aspectRatio: RATIO }}>
            {stlUrl ? (
              <>
                {inView ? (
                  <ModelCanvas
                    url={stlUrl}
                    wireframe={wireframe}
                    autoRotate={!interacted}
                    onInteract={onInteract}
                    label="Interactive 3D model of the printed enclosure. Drag to rotate."
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
        </Figure>
      </Reveal>

      <Reveal delay={0.1}>
        <dl className="mt-4 max-w-[720px] border-t border-line">
          {model.specs.map((s) => (
            <div key={s.label} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-4 border-b border-line py-3.5 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
              <dt className="mono-label pt-0.5 text-dim">{s.label}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px] text-white">
                <span className="font-mono text-faint">{s.value}</span>
                <span className="text-[13px] text-dim">{s.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Section>
  );
}
