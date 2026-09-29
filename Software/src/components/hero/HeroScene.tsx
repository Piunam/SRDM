"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setHeroTrack } from "@/lib/scroll-store";
import { getLenis } from "../SmoothScroll";
import { HERO, NOISE_KEYS, type ActId } from "./hero-config";
import { COPY } from "./hero-copy";
import { frameLayout, gridLeft, gridWidth } from "./hero-layout";
import { actWindow, addStateTweens, clamp01, copyIn, copyOut, heroState, onHeroFrame, runHeroFrame, sub, type Range } from "./hero-state";
import { GruCanvas, SignalLayer, TapsCanvas } from "./SignalCanvas";
import { StageRail } from "./StageRail";
import { CopyBlock, formatMetric, formatSnr, Intro, MetricsRow, NoiseLegend, SnrReadout, StageSummary } from "./HeroParts";
import { HeroStatic } from "./HeroStatic";

gsap.registerPlugin(ScrollTrigger);

// three.js is split out and only loaded after first paint.
const DeviceModel = dynamic(() => import("./DeviceModel"), { ssr: false });

type Mode = "motion" | "static";

export function HeroScene() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mm = window.matchMedia(`(max-width: ${HERO.mobileBreakpoint - 1}px)`);
    const sync = () => {
      setMode(rm.matches ? "static" : "motion");
      setMobile(mm.matches);
    };
    sync();
    rm.addEventListener("change", sync);
    mm.addEventListener("change", sync);
    return () => {
      rm.removeEventListener("change", sync);
      mm.removeEventListener("change", sync);
    };
  }, []);

  // Until media queries are known, hold the space so the pin is built once.
  if (mode === null) return <div className="h-[100svh] w-full bg-deep" />;
  if (mode === "static") return <HeroStatic />;
  // The wrapper keeps GSAP's pin-spacer inside a node React owns.
  return (
    <div key={mobile ? "m" : "d"}>
      <HeroPinned mobile={mobile} />
    </div>
  );
}

const COPY_ACTS = ["act1", "act2", "act3", "act4", "act5", "act6"] as const;
const lerpRGB = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const FAULT = [224, 90, 107];
const AMBER = [240, 166, 60];
const TEAL = [45, 212, 200];

function snrColor(snr: number) {
  // --fault below 0 dB, --amber 0–10 dB, --cy above 10 dB, blended at the edges.
  const c = snr < 0 ? lerpRGB(FAULT, AMBER, clamp01((snr + 2) / 2)) : lerpRGB(AMBER, TEAL, clamp01((snr - 8) / 4));
  return `rgb(${c.join(",")})`;
}

function HeroPinned({ mobile }: { mobile: boolean }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const devWrap = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const snrValue = useRef<HTMLSpanElement>(null);
  const snrFill = useRef<HTMLSpanElement>(null);
  const legendRows = useRef<(HTMLLIElement | null)[]>([]);
  const metricRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const gruTick = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState({ W: 1440, H: 900 });
  const [show3d, setShow3d] = useState(false);

  useEffect(() => {
    const el = root.current!;
    const ro = new ResizeObserver(() => setBox({ W: el.clientWidth, H: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lazy-load the 3D layer once the first frame has painted.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(() => setShow3d(true));
      return;
    }
    const id = window.setTimeout(() => setShow3d(true), 200);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const el = root.current!;
    const vh = mobile ? HERO.pin.mobileVh : HERO.pin.desktopVh;
    const publish = (self: ScrollTrigger) =>
      setHeroTrack({ start: self.start, end: self.end, active: self.isActive, acts: HERO.acts.map((a) => a.start / 100) });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${(window.innerHeight * vh) / 100}`,
          pin: true,
          scrub: HERO.scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: publish,
          onToggle: publish,
        },
      });
      tlRef.current = tl;
      addStateTweens(tl, heroState);

      const q = gsap.utils.selector(el);
      const d = (r: Range) => r[1] - r[0];
      // Copy enters with 12 px of travel; everything exits with a fade only.
      const enter = (sel: string, r: Range, y = 12) =>
        tl.fromTo(q(sel), { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: d(r), ease: "power2.out" }, r[0]);
      const exit = (sel: string, r: Range) =>
        tl.to(q(sel), { autoAlpha: 0, duration: d(r), ease: "none", immediateRender: false }, r[0]);
      const live = (sel: string, id: ActId) => {
        enter(sel, copyIn(id));
        exit(sel, copyOut(id));
      };

      // Act 0
      exit("[data-intro]", copyOut("act0"));
      enter("[data-readout]", copyIn("act1"), 0);

      // Acts 1–6: exactly one copy block at a time.
      COPY_ACTS.forEach((id) => live(`[data-copy='${id}']`, id));
      live("[data-legend]", "act1");
      live("[data-taps]", "act3");
      live("[data-gru]", "act5");

      // Act 4 gate: a clean frame, then the input line becomes the baseline.
      const w4 = actWindow("act4");
      enter("[data-gate]", copyIn("act4"), 0);
      exit("[data-gate]", w4.exit);
      const yes = sub(w4.hold, 0.1, 0.55);
      tl.fromTo(q("[data-rail-yes-pulse]"), { attr: { "stroke-dashoffset": 10 } }, { attr: { "stroke-dashoffset": -95 }, duration: d(yes) }, yes[0]);
      tl.fromTo(q("[data-rail-yes-pulse]"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, yes[0]);
      tl.to(q("[data-rail-yes-pulse]"), { opacity: 0, duration: 0.3 }, yes[1] - 0.3);
      const no = sub(w4.hold, 0.3, 0.75);
      tl.fromTo(q("[data-rail-no]"), { attr: { "stroke-dashoffset": 100 } }, { attr: { "stroke-dashoffset": 0 }, duration: d(no) }, no[0]);
      tl.fromTo(q("[data-box-no]"), { opacity: 0.4 }, { opacity: 1, duration: 0.5 }, no[1] - 0.5);

      // Act 5 details inside the hold.
      const w5 = actWindow("act5");
      enter("[data-impulse]", sub(w5.hold, 0.6, 0.64), 0);
      exit("[data-impulse]", sub(w5.hold, 0.76, 0.82));
      enter("[data-quant]", sub(w5.hold, 0.68, 0.76), 0);

      // Act 7
      const in7 = copyIn("act7");
      enter("[data-final-h2]", in7);
      enter("[data-final-metrics]", [in7[1], in7[1] + 1.5]);
      enter("[data-final-foot]", [in7[1] + 0.8, in7[1] + 2]);
    }, el);

    // One shared loop: timeline progress, canvases, 3D invalidation, DOM readouts.
    let inView = true;
    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting), { threshold: 0 });
    io.observe(el);
    const tick = (time: number) => {
      const tl = tlRef.current;
      if (tl) heroState.progress = tl.progress();
      if (inView) runHeroFrame(time);
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      ctx.revert();
      tlRef.current = null;
      setHeroTrack(null);
    };
  }, [mobile]);

  // Per-frame DOM: layer roles, readout, legend, count-up.
  useEffect(
    () =>
      onHeroFrame((t) => {
        const s = heroState;
        if (grid.current) grid.current.style.opacity = String(0.3 * s.grid);
        if (devWrap.current) {
          devWrap.current.style.opacity = String(s.devA);
          devWrap.current.style.filter = s.devBlur > 0.05 ? `blur(${s.devBlur.toFixed(2)}px)` : "";
        }
        if (stage.current) {
          let flash = 0;
          for (let k = 0; k < 3; k++) flash = Math.max(flash, 1 - Math.abs(s.gunT - k - 0.04) / 0.06);
          const amp = clamp01(flash) * s.noise.gunshot * 3;
          const dx = amp > 0.05 ? Math.sin(t * 173) * amp : 0;
          const dy = amp > 0.05 ? Math.cos(t * 191) * amp : 0;
          stage.current.style.transform = `translate(${dx}px, ${dy}px) scale(${s.zoom})`;
        }
        if (snrValue.current) {
          snrValue.current.textContent = formatSnr(s.snr);
          snrValue.current.style.color = snrColor(s.snr);
        }
        if (snrFill.current) {
          const { meterMin, meterMax } = HERO.snr;
          const v = s.snr >= HERO.snr.infinity - 0.01 ? meterMax : s.snr;
          snrFill.current.style.transform = `scaleX(${clamp01((v - meterMin) / (meterMax - meterMin))})`;
          snrFill.current.style.backgroundColor = snrColor(v);
        }
        NOISE_KEYS.forEach((k, i) => {
          const row = legendRows.current[i];
          if (row) row.dataset.lit = String(s.noise[k] > 0.3);
        });
        HERO.metrics.forEach((m, i) => {
          const el = metricRefs.current[i];
          if (!el) return;
          const p = clamp01(s.metrics * 1.25 - i * 0.08);
          el.textContent = formatMetric(m.value, m.decimals, 1 - (1 - p) ** 3);
        });
        if (gruTick.current) gruTick.current.dataset.on = String(Math.floor(t * HERO.signal.gruCadenceHz) % 2 === 0);
      }),
    [],
  );

  const selectAct = (i: number) => {
    const st = tlRef.current?.scrollTrigger;
    if (!st) return;
    const a = HERO.acts[i];
    const pct = i === 0 ? 0 : (actWindow(a.id).hold[0] + actWindow(a.id).hold[1]) / 2;
    const y = st.start + ((st.end - st.start) * pct) / 100;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y });
  };

  const L = frameLayout(box.W, box.H, mobile);
  const F = HERO.frame;

  // Zones.
  const copyZone: React.CSSProperties = mobile
    ? { left: F.mobile.margin, right: F.mobile.margin, bottom: 28 }
    : { left: F.margin, bottom: F.copyBottom, width: gridWidth(4) };
  const instrumentZone: React.CSSProperties = { left: gridLeft(9), top: F.header + F.instrumentTop, width: gridWidth(4) };
  const readoutPos: React.CSSProperties = mobile
    ? { left: F.mobile.margin, top: 72 }
    : { left: L.bandL, top: L.baseline - L.gap / 2 - L.amp * 3.4 - 92 };

  return (
    <section
      ref={root}
      aria-label="How the system recovers a voice from battlefield noise"
      className="relative h-[100svh] w-full overflow-hidden bg-deep"
    >
      <StageSummary />

      {/* Stage: grid, signal (behind), device, signal (in front) */}
      <div ref={stage} className="absolute inset-0 origin-center will-change-transform" aria-hidden="true">
        <div ref={grid} className="hero-grid absolute inset-0" style={{ opacity: 0.3 }} />
        <SignalLayer pass="back" mobile={mobile} />
        <div ref={devWrap} className="absolute inset-0" style={{ opacity: 0 }}>
          {show3d && <DeviceModel mobile={mobile} stlUrl={HERO.hardware.stlUrl} />}
        </div>
        <SignalLayer pass="front" mobile={mobile} />
      </div>
      <div className="hero-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
      {mobile && <div className="mobile-copy-scrim pointer-events-none absolute inset-x-0 bottom-0 h-[45%]" aria-hidden="true" />}

      <Gate L={L} />

      {/* SNR readout: left end of the signal band */}
      <div data-readout className="invisible absolute z-20" style={readoutPos}>
        <SnrReadout valueRef={snrValue} fillRef={snrFill} inline={mobile} />
      </div>

      {/* Instrument zone (desktop only): one panel per shot */}
      <div data-taps className="panel-active invisible absolute z-20 hidden p-4 md:block" style={instrumentZone}>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="mono-label text-white">{COPY.tapsTitle}</span>
          <span className="mono-label text-dim">{COPY.tapsSub}</span>
        </div>
        <div className="supporting">
          <TapsCanvas />
        </div>
      </div>
      <div data-gru className="panel-active invisible absolute z-20 hidden p-4 md:block" style={instrumentZone}>
        <div className="mb-3 flex items-center justify-between">
          <span className="mono-label text-white">{COPY.gruTitle}</span>
          <span className="mono-label flex items-center gap-1.5 text-dim">
            <span ref={gruTick} data-on="false" className="h-1.5 w-1.5 rounded-full bg-line3 data-[on=true]:bg-cy" />
            10 ms
          </span>
        </div>
        <div className="supporting">
          <GruCanvas />
        </div>
        <p data-quant className="mono-label invisible mt-3 text-dim">
          {COPY.quant}
        </p>
      </div>
      <span
        data-impulse
        className="mono-label invisible absolute z-20 text-white"
        style={{ left: L.barsL, top: L.baseline - L.maxH - 44 }}
      >
        {COPY.impulse}
      </span>

      {/* Act 0 intro */}
      <div
        data-intro
        className="absolute z-20"
        style={mobile ? { left: 16, right: 16, bottom: 32 } : { left: F.margin, top: F.header + 64, width: gridWidth(5) }}
      >
        <Intro />
      </div>

      {/* Copy zone */}
      <div className="absolute z-20" style={copyZone}>
        <div data-legend className="invisible mb-8">
          <NoiseLegend rowRefs={legendRows} mobile={mobile} />
        </div>
        {COPY_ACTS.map((id) => (
          <CopyBlock
            key={id}
            data-copy={id}
            copy={COPY.acts[id]}
            mobile={mobile}
            className={`invisible ${id === "act1" ? "relative" : "absolute bottom-0 left-0 right-0"}`}
          />
        ))}
      </div>

      {/* Act 7 */}
      <div
        className="absolute z-20"
        style={mobile ? { left: 16, right: 16, bottom: 28 } : { left: F.margin, right: F.margin, bottom: F.copyBottom }}
      >
        <h2 data-final-h2 className="h2-display invisible mb-8 max-w-[18ch] text-white">
          {COPY.h2}
        </h2>
        <div data-final-metrics className="invisible">
          <MetricsRow valueRefs={metricRefs} mobile={mobile} />
        </div>
        <p data-final-foot className="mono-label invisible mt-6 text-dim">
          {COPY.footnote}
        </p>
      </div>

      <StageRail mobile={mobile} onSelect={selectAct} />
    </section>
  );
}

/* ------------------------------------------------------------------ gate */

function Gate({ L }: { L: ReturnType<typeof frameLayout> }) {
  const g = COPY.gate;
  const by = Math.round(L.baseline) + 0.5;
  const dx = Math.round(L.mobile ? L.bandL + 100 : L.bandL + (L.bandR - L.bandL) * 0.28);
  const dy = Math.round(L.H * (L.mobile ? 0.085 : 0.13));
  const boxW = L.mobile ? 96 : 140;
  const boxH = 32;
  const bx = L.bandR - boxW;
  const half = 20;
  const upper = `M${dx} ${by - half} V${by - dy} H${bx}`;
  const lower = `M${dx} ${by + half} V${by + dy} H${bx}`;
  const labelX = dx + 14;

  return (
    <div data-gate className="pointer-events-none invisible absolute inset-0 z-10">
      <svg width={L.W} height={L.H} viewBox={`0 0 ${L.W} ${L.H}`} className="absolute inset-0" role="img" aria-label={`${g.question}? ${g.yes}. ${g.no}.`}>
        <g className="mono-svg">
          {/* input */}
          <path d={`M${L.bandL} ${by} H${dx - half}`} stroke="var(--color-cy)" strokeWidth="1" />
          {L.mobile ? (
            <text x={L.bandL} y={by + 20} fill="var(--color-white)">
              {g.question}
            </text>
          ) : (
            <text x={dx - half - 10} y={by - 10} textAnchor="end" fill="var(--color-white)">
              {g.question}
            </text>
          )}
          {/* decision */}
          <path d={`M${dx} ${by - half} L${dx + half} ${by} L${dx} ${by + half} L${dx - half} ${by} Z`} fill="var(--color-deep)" stroke="var(--color-silver)" strokeWidth="1" />
          {/* yes: steady noise → post-filter (dim, dashed) */}
          <path d={upper} fill="none" stroke="var(--color-silver)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 4" />
          <path data-rail-yes-pulse d={upper} fill="none" stroke="var(--color-silver)" strokeWidth="1.5" pathLength={100} strokeDasharray="10 200" strokeDashoffset="10" />
          <text x={labelX} y={by - dy - 10} fill="var(--color-dim)">
            {L.mobile ? g.yesShort : g.yes}
          </text>
          <rect x={bx} y={by - dy - boxH / 2} width={boxW} height={boxH} rx="4" fill="var(--color-deep)" stroke="var(--color-line3)" />
          <text x={bx + boxW / 2} y={by - dy + 4} textAnchor="middle" fill="var(--color-silver)">
            {g.boxYes}
          </text>
          {/* no: impulsive / low SNR → RNNoise (solid teal) */}
          <path d={lower} fill="none" stroke="var(--color-line3)" strokeWidth="1" />
          <path data-rail-no d={lower} fill="none" stroke="var(--color-cy)" strokeWidth="1.5" pathLength={100} strokeDasharray="100" strokeDashoffset="100" />
          <text x={labelX} y={by + dy - 10} fill="var(--color-cy)">
            {L.mobile ? g.noShort : g.no}
          </text>
          <g data-box-no>
            <rect x={bx} y={by + dy - boxH / 2} width={boxW} height={boxH} rx="4" fill="var(--color-deep)" stroke="var(--color-cy)" />
            <text x={bx + boxW / 2} y={by + dy + 4} textAnchor="middle" fill="var(--color-white)">
              {g.boxNo}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
