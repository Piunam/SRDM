"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { HERO } from "./hero-config";
import { COPY, type ActCopy } from "./hero-copy";
import { frameLayout } from "./hero-layout";
import { addStateTweens, createHeroState, type HeroState } from "./hero-state";
import { drawSignal, loadSignalData } from "./SignalCanvas";
import { CopyBlock, Intro, MetricsRow } from "./HeroParts";

// prefers-reduced-motion: no pin, eight stacked panels, each with one still frame.

const ACT_COPY: ActCopy[] = [
  { num: "00", title: COPY.stages[0].short, sub: "", body: COPY.stages[0].summary },
  COPY.acts.act1,
  COPY.acts.act2,
  COPY.acts.act3,
  COPY.acts.act4,
  COPY.acts.act5,
  COPY.acts.act6,
  { num: "Output", title: COPY.stages[7].short, sub: "", body: COPY.stages[7].summary },
];

// Where in each act the still is taken (% of the pinned span).
const STILL_AT = [4, 18, 28, 41, 44, 63, 78, 99];

function snapshot(pct: number): HeroState {
  const s = createHeroState();
  const tl = addStateTweens(gsap.timeline({ paused: true }), s);
  tl.progress(pct / 100);
  tl.kill();
  // No device in the static layout, so streams run the full width.
  return { ...s, noise: { ...s.noise }, devA: 0, deviceRect: null, wave: s.spectrum > 0.5 ? s.wave : 1 };
}

function Still({ pct }: { pct: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    loadSignalData().then((data) => {
      const c = ref.current;
      if (!alive || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = c.clientWidth;
      const H = c.clientHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const L = {
        ...frameLayout(W, H, false),
        bandL: 16,
        bandR: W - 16,
        barsL: 24,
        barsR: W - 24,
        baseline: H * 0.62,
        amp: H * 0.13,
        gap: H * 0.3,
        maxH: H * 0.48,
      };
      drawSignal(ctx, L, snapshot(pct), 1.3, "back", data);
    });
    return () => {
      alive = false;
    };
  }, [pct]);
  return <canvas ref={ref} aria-hidden="true" className="block h-48 w-full rounded-[5px] border border-line bg-deep md:h-56" />;
}

export function HeroStatic() {
  return (
    <section aria-label="How the system recovers a voice from battlefield noise" className="bg-deep">
      <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-28 md:px-10">
        <Intro animate={false} />
        <ol className="mt-16 flex flex-col gap-10">
          {HERO.acts.map((a, i) => (
            <li key={a.id} className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
              <Still pct={STILL_AT[i]} />
              <CopyBlock copy={ACT_COPY[i]} />
            </li>
          ))}
        </ol>
        <div className="mt-16">
          <h2 className="h2-display mb-8 text-white">{COPY.h2}</h2>
          <MetricsRow />
          <p className="mono-label mt-6 text-dim">{COPY.footnote}</p>
        </div>
      </div>
    </section>
  );
}
