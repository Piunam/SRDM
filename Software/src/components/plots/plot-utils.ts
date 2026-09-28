// Shared canvas helpers for the waveform and spectrum plots.

export type Envelope = { min: Float32Array; max: Float32Array };

export const PLOT_COLORS = {
  fault: "#E05A6B",
  cy: "#2DD4C8",
  amber: "#F0A63C",
  silver: "#9FB0BF",
  dim: "#6D7E8C",
  line: "rgba(159,176,191,.13)",
  line3: "rgba(159,176,191,.22)",
} as const;

export type PlotColor = keyof typeof PLOT_COLORS;

/** Sizes a canvas to its CSS box at the device pixel ratio. Returns CSS px size. */
export function fitCanvas(canvas: HTMLCanvasElement, maxDpr = 2) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** Log-frequency axis ticks used by the spectrum plots. */
export const FREQ_TICKS = [100, 500, 1000, 2000, 4000, 8000];
export const freqLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : String(hz));

export const logX = (hz: number, min: number, max: number) =>
  (Math.log10(Math.max(hz, min)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));

/** Peak of an envelope in dBFS, for the visually hidden plot summary. */
export function peakDbfs(env: Envelope) {
  let peak = 0;
  for (let i = 0; i < env.max.length; i++) peak = Math.max(peak, Math.abs(env.max[i]), Math.abs(env.min[i]));
  return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
}
