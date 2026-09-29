"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { HERO, type NoiseKey } from "./hero-config";
import { COPY, type ActCopy } from "./hero-copy";

export function Intro({ animate = true }: { animate?: boolean }) {
  const item = (i: number) =>
    animate
      ? {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] as const },
        }
      : {};
  return (
    <>
      <motion.p {...item(0)} className="mono-caps mb-6 text-dim">
        {COPY.eyebrow}
      </motion.p>
      <motion.h1 {...item(1)} className="headline max-w-[12ch] text-white">
        {COPY.h1}
      </motion.h1>
      <motion.p {...item(2)} className="body-copy mt-6">
        {COPY.lede}
      </motion.p>
    </>
  );
}

type CopyBlockProps = React.HTMLAttributes<HTMLDivElement> & { copy: ActCopy; mobile?: boolean };

// Stage number, one-line title, technical sub-label, 1–2 sentences. No card.
export const CopyBlock = forwardRef<HTMLDivElement, CopyBlockProps>(function CopyBlock(
  { copy, mobile = false, className = "", ...rest },
  ref,
) {
  return (
    <div ref={ref} {...rest} className={`scrim ${className}`}>
      <p className="flex items-baseline gap-3">
        <span className="mono-label text-dim">{copy.num}</span>
        <span className="text-dim" aria-hidden="true">
          —
        </span>
        <span className="text-[20px] font-medium tracking-[-0.01em] text-white">{copy.title}</span>
      </p>
      {copy.sub && <p className="mono-label mt-1.5 text-dim">{copy.sub}</p>}
      <p className="body-copy mt-4">{copy.body}</p>
      {mobile && copy.mobileInline && <p className="mono-label mt-3 text-cy">{copy.mobileInline}</p>}
      {copy.micro && !mobile && <p className="mono-label mt-4 text-[10px] text-dim">{copy.micro}</p>}
    </div>
  );
});

/* ------------------------------------------------------------ noise legend */

function Swatch({ kind }: { kind: NoiseKey }) {
  const common = { stroke: "currentColor", strokeWidth: 1.2, fill: "none", strokeLinecap: "round" as const };
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
      {kind === "gunshot" && <path d="M0 6h3.5l1-5 1.5 10 1-5H12" {...common} />}
      {kind === "rotor" && <path d="M0 6c1.5-4 3-4 4 0s2.5 4 4 0 2.5-4 4 0" {...common} />}
      {kind === "engine" && <rect x="0" y="4" width="12" height="4" rx="1" fill="currentColor" opacity="0.8" />}
      {kind === "siren" && <path d="M0 10C3 10 4 2 6 2s3 8 6 8" {...common} />}
      {kind === "wind" &&
        [
          [1, 3],
          [4, 8],
          [6, 4],
          [9, 9],
          [10, 2],
          [3, 11],
          [8, 6],
        ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.8" fill="currentColor" />)}
    </svg>
  );
}

export function NoiseLegend({
  rowRefs,
  mobile,
}: {
  rowRefs: React.RefObject<(HTMLLIElement | null)[]>;
  mobile: boolean;
}) {
  return (
    <ul className={mobile ? "grid grid-cols-2 gap-x-6 gap-y-2" : "flex flex-col gap-2.5"} aria-label="Noise types">
      {COPY.legend.map((row, i) => (
        <li
          key={row.key}
          ref={(el) => {
            rowRefs.current[i] = el;
          }}
          data-lit="false"
          className="flex items-center gap-3 text-silver opacity-35 transition-[opacity,color] duration-300 data-[lit=true]:text-fault data-[lit=true]:opacity-100"
        >
          <Swatch kind={row.key} />
          <span className="mono-label w-16 text-white">{row.name}</span>
          {!mobile && <span className="mono-label text-dim">{row.desc}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ SNR readout */

type SpanRef = React.RefObject<HTMLSpanElement | null>;

export function SnrReadout({ valueRef, fillRef, inline = false }: { valueRef: SpanRef; fillRef: SpanRef; inline?: boolean }) {
  const { meterMin, meterMax, gateThreshold } = HERO.snr;
  const gatePct = ((gateThreshold - meterMin) / (meterMax - meterMin)) * 100;
  return (
    <div className={inline ? "flex items-end gap-4" : ""} role="status" aria-live="off">
      <div>
        <p className="mono-label text-dim">{COPY.readout.label}</p>
        <p className="tnum mt-1 flex items-baseline gap-1.5 leading-none">
          <span ref={valueRef} className="text-[44px] font-medium tracking-[-0.02em] text-cy">
            +∞
          </span>
          <span className="mono-label text-dim">dB</span>
        </p>
      </div>
      <div className={`relative w-[120px] ${inline ? "mb-2" : "mt-3"}`}>
        <span className="block h-px w-full bg-line3" />
        <span ref={fillRef} className="absolute left-0 top-[-0.5px] block h-[2px] w-full origin-left bg-cy" style={{ transform: "scaleX(1)" }} />
        <span className="absolute top-[-3px] h-[7px] w-px bg-silver" style={{ left: `${gatePct}%` }} />
        <span className="mono-label absolute top-2 -translate-x-1/2 text-[10px] text-dim" style={{ left: `${gatePct}%` }}>
          {COPY.readout.gate}
        </span>
      </div>
    </div>
  );
}

export function formatSnr(snr: number) {
  if (snr >= HERO.snr.infinity - 0.01) return "+∞";
  const v = Math.round(snr);
  return `${v >= 0 ? "+" : "−"}${Math.abs(v)}`;
}

/* ---------------------------------------------------------------- metrics */

export function formatMetric(value: number, decimals: number, p = 1) {
  return (value * p).toFixed(decimals);
}

export function MetricsRow({
  valueRefs,
  mobile = false,
}: {
  valueRefs?: React.RefObject<(HTMLSpanElement | null)[]>;
  mobile?: boolean;
}) {
  return (
    <dl className={`grid ${mobile ? "grid-cols-2 gap-y-5" : "grid-cols-4"} max-w-[860px]`}>
      {HERO.metrics.map((m, i) => (
        <div
          key={m.key}
          className={
            mobile
              ? "odd:pr-5 even:border-l even:border-line even:pl-5"
              : "border-l border-line px-6 first:border-l-0 first:pl-0"
          }
        >
          <dt className="mono-label text-dim">{m.label}</dt>
          <dd className="mt-2">
            <span className="tnum flex items-baseline gap-1.5 leading-none">
              <span
                ref={(el) => {
                  if (valueRefs?.current) valueRefs.current[i] = el;
                }}
                className={`${mobile ? "text-[32px]" : "text-[40px]"} font-medium tracking-[-0.02em] text-white`}
              >
                {formatMetric(m.value, m.decimals, valueRefs ? 0 : 1)}
              </span>
              {m.unit && <span className="text-[14px] text-dim">{m.unit}</span>}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <span className="mono-label text-dim">{m.target}</span>
              {m.status === "MEASURED" && (
                <span className="mono-label rounded-[3px] border border-cy/40 px-1.5 py-0.5 text-[10px] text-cy">measured</span>
              )}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StageSummary() {
  return (
    <ol className="sr-only">
      {COPY.stages.map((s, i) => (
        <li key={s.short}>
          Stage {i}, {s.short.toLowerCase()}: {s.summary}
        </li>
      ))}
    </ol>
  );
}
