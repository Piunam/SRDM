// Min/max envelope reduction. The waveform plots draw one vertical span per
// pixel column, so the whole clip is reduced once after decoding and reused for
// every redraw and resize.

import type { Envelope } from "@/components/plots/plot-utils";

/** Column count used for cached envelopes: wider than any plot, so resizing never recomputes. */
export const ENVELOPE_COLUMNS = 1024;

/** Down-mixes every channel to a single Float32Array. */
export function mixToMono(buffer: AudioBuffer): Float32Array {
  const n = buffer.length;
  const channels = buffer.numberOfChannels;
  if (channels === 1) return buffer.getChannelData(0);

  const out = new Float32Array(n);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += data[i];
  }
  for (let i = 0; i < n; i++) out[i] /= channels;
  return out;
}

/** Reduces a mono signal to `columns` min/max pairs. */
export function envelopeFromMono(mono: Float32Array, columns = ENVELOPE_COLUMNS): Envelope {
  const min = new Float32Array(columns);
  const max = new Float32Array(columns);
  if (mono.length === 0) return { min, max };

  const step = mono.length / columns;
  for (let c = 0; c < columns; c++) {
    const start = Math.floor(c * step);
    const end = Math.max(start + 1, Math.floor((c + 1) * step));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = start; i < end && i < mono.length; i++) {
      const v = mono[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[c] = Number.isFinite(lo) ? lo : 0;
    max[c] = Number.isFinite(hi) ? hi : 0;
  }
  return { min, max };
}

export const computeEnvelope = (buffer: AudioBuffer, columns = ENVELOPE_COLUMNS): Envelope =>
  envelopeFromMono(mixToMono(buffer), columns);
