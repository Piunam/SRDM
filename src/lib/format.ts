// Number formatters. Every figure on the site renders through one of these so
// tabular alignment and rounding stay consistent.

export const fmt = (value: number, decimals = 1) =>
  Number.isFinite(value) ? value.toFixed(decimals) : "—";

export const fmtDb = (value: number | null | undefined, decimals = 1) =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(decimals)} dB`;

export const fmtMs = (value: number | null | undefined, decimals = 0) =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" : `${value.toFixed(decimals)} ms`;

export const fmtPct = (value: number | null | undefined, decimals = 0) =>
  value === null || value === undefined || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(decimals)} %`;

/** mm:ss for audio transports. */
export const fmtTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};
