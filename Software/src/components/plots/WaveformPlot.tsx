"use client";

import { useEffect, useRef } from "react";
import { fitCanvas, peakDbfs, PLOT_COLORS, type Envelope, type PlotColor } from "./plot-utils";
import { fmtTime } from "@/lib/format";

export type WaveformPlotProps = {
  /** Min/max envelope, one pair per pixel column. Null renders an empty frame. */
  envelope: Envelope | null;
  /** Second envelope drawn over the first, for the difference view. */
  overlay?: Envelope | null;
  color?: PlotColor;
  overlayColor?: PlotColor;
  /** Clip length in seconds, for the time axis. */
  duration?: number;
  /** Playhead position in seconds. */
  playhead?: number;
  onSeek?: (seconds: number) => void;
  height?: number;
  label: string;
  emptyLabel?: string;
  className?: string;
};

/**
 * Time-domain view drawn as a min/max envelope. Keyboard-operable when it can
 * seek, and carries a text summary for screen readers.
 */
export function WaveformPlot({
  envelope,
  overlay = null,
  color = "cy",
  overlayColor = "fault",
  duration = 0,
  playhead,
  onSeek,
  height = 120,
  label,
  emptyLabel = "no audio loaded",
  className = "",
}: WaveformPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const { ctx, w, h } = fitCanvas(canvas);
      ctx.clearRect(0, 0, w, h);
      const mid = h / 2;

      // Axes: -1 / 0 / +1.
      ctx.strokeStyle = PLOT_COLORS.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const y of [0.5, mid, h - 0.5]) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(w, Math.round(y) + 0.5);
      }
      ctx.stroke();

      if (!envelope) {
        ctx.fillStyle = PLOT_COLORS.dim;
        ctx.font = "11px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emptyLabel, w / 2, mid);
        return;
      }

      const band = (env: Envelope, stroke: string, alpha: number) => {
        const n = env.min.length;
        ctx.strokeStyle = stroke;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const i = Math.min(n - 1, Math.floor((x / w) * n));
          const top = mid - env.max[i] * (mid - 2);
          const bottom = mid - env.min[i] * (mid - 2);
          ctx.moveTo(x + 0.5, top);
          ctx.lineTo(x + 0.5, Math.max(bottom, top + 0.6));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      band(envelope, PLOT_COLORS[color], 1);
      if (overlay) band(overlay, PLOT_COLORS[overlayColor], 0.55);

      if (playhead !== undefined && duration > 0) {
        const x = Math.round((playhead / duration) * w) + 0.5;
        ctx.strokeStyle = PLOT_COLORS.silver;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [envelope, overlay, color, overlayColor, playhead, duration, emptyLabel]);

  const seekFromClientX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSeek || !duration) return;
    const rect = canvas.getBoundingClientRect();
    onSeek(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration);
  };

  const peak = envelope ? peakDbfs(envelope) : null;
  const summary = envelope
    ? `${label}. ${duration ? `${duration.toFixed(1)} seconds.` : ""} Peak ${peak === null || peak === -Infinity ? "silent" : `${peak.toFixed(1)} dBFS`}.`
    : `${label}. ${emptyLabel}.`;

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={summary}
        tabIndex={onSeek ? 0 : -1}
        style={{ height }}
        className={`block w-full rounded-[4px] border border-line bg-abyss ${
          onSeek ? "cursor-crosshair focus-visible:outline focus-visible:outline-1 focus-visible:outline-cy" : ""
        }`}
        onClick={(e) => seekFromClientX(e.clientX)}
        onKeyDown={(e) => {
          if (!onSeek || !duration || playhead === undefined) return;
          if (e.key === "ArrowRight") onSeek(Math.min(duration, playhead + 1));
          if (e.key === "ArrowLeft") onSeek(Math.max(0, playhead - 1));
        }}
      />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
        <span>0:00</span>
        <span className="sr-only">{summary}</span>
        <span>{duration ? fmtTime(duration) : "—"}</span>
      </div>
    </div>
  );
}
