"use client";

import { useEffect, useRef } from "react";
import { fitCanvas, FREQ_TICKS, freqLabel, logX, PLOT_COLORS, type PlotColor } from "./plot-utils";

export type SpectrumPlotProps = {
  /** Magnitudes in dB, one per linear FFT bin (bin i ≙ i * sampleRate / fftSize). */
  bins: Float32Array | null;
  sampleRate: number;
  fftSize: number;
  color?: PlotColor;
  /** dB range shown on the vertical axis. */
  dbFloor?: number;
  dbCeil?: number;
  filled?: boolean;
  height?: number;
  label: string;
  emptyLabel?: string;
  className?: string;
};

/** Frequency view on a log axis, used for both the offline average and the live analyser. */
export function SpectrumPlot({
  bins,
  sampleRate,
  fftSize,
  color = "cy",
  dbFloor = -100,
  dbCeil = 0,
  filled = true,
  height = 120,
  label,
  emptyLabel = "no audio loaded",
  className = "",
}: SpectrumPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const { ctx, w, h } = fitCanvas(canvas);
      ctx.clearRect(0, 0, w, h);
      const fMin = 80;
      const fMax = Math.min(sampleRate / 2, 12000);
      const pad = 16; // room for the axis labels

      // Frequency grid.
      ctx.strokeStyle = PLOT_COLORS.line;
      ctx.lineWidth = 1;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = PLOT_COLORS.dim;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const hz of FREQ_TICKS) {
        if (hz > fMax) continue;
        const x = Math.round(logX(hz, fMin, fMax) * w) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - pad);
        ctx.stroke();
        ctx.fillText(freqLabel(hz), x, h - pad + 3);
      }
      ctx.strokeStyle = PLOT_COLORS.line3;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(h - pad) + 0.5);
      ctx.lineTo(w, Math.round(h - pad) + 0.5);
      ctx.stroke();

      if (!bins || bins.length === 0) {
        ctx.fillStyle = PLOT_COLORS.dim;
        ctx.font = "11px ui-monospace, monospace";
        ctx.textBaseline = "middle";
        ctx.fillText(emptyLabel, w / 2, (h - pad) / 2);
        return;
      }

      const plotH = h - pad;
      const binHz = sampleRate / fftSize;
      const yFor = (db: number) => plotH - ((Math.max(dbFloor, Math.min(dbCeil, db)) - dbFloor) / (dbCeil - dbFloor)) * plotH;

      ctx.beginPath();
      let started = false;
      for (let x = 0; x < w; x++) {
        // Map pixel → frequency → bin (log axis), taking the max over the span.
        const f0 = fMin * (fMax / fMin) ** (x / w);
        const f1 = fMin * (fMax / fMin) ** ((x + 1) / w);
        const i0 = Math.max(1, Math.floor(f0 / binHz));
        const i1 = Math.min(bins.length - 1, Math.max(i0, Math.ceil(f1 / binHz)));
        let db = -Infinity;
        for (let i = i0; i <= i1; i++) db = Math.max(db, bins[i]);
        if (!Number.isFinite(db)) db = dbFloor;
        const y = yFor(db);
        if (started) ctx.lineTo(x + 0.5, y);
        else {
          ctx.moveTo(x + 0.5, y);
          started = true;
        }
      }
      ctx.strokeStyle = PLOT_COLORS[color];
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (filled) {
        ctx.lineTo(w, plotH);
        ctx.lineTo(0, plotH);
        ctx.closePath();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = PLOT_COLORS[color];
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [bins, sampleRate, fftSize, color, dbFloor, dbCeil, filled, emptyLabel]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${label}. Frequency spectrum, ${Math.round(dbFloor)} to ${Math.round(dbCeil)} dB, 80 Hz to ${Math.round(
          Math.min(sampleRate / 2, 12000) / 1000,
        )} kHz.`}
        style={{ height }}
        className="block w-full rounded-[4px] border border-line bg-abyss"
      />
      <p className="sr-only">{bins ? `${label}: spectrum plotted on a logarithmic frequency axis.` : `${label}: ${emptyLabel}.`}</p>
    </div>
  );
}
