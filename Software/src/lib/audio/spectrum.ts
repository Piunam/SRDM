// Offline spectrum analysis. Plain TypeScript, no library: a radix-2 FFT with a
// Hann window, used for the static AVERAGE view on /demo. The LIVE view uses an
// AnalyserNode instead, which already returns dB per bin.

const twiddleCache = new Map<number, { cos: Float32Array; sin: Float32Array }>();

function twiddles(n: number) {
  let t = twiddleCache.get(n);
  if (!t) {
    const half = n >> 1;
    const cos = new Float32Array(half);
    const sin = new Float32Array(half);
    for (let i = 0; i < half; i++) {
      const a = (-2 * Math.PI * i) / n;
      cos[i] = Math.cos(a);
      sin[i] = Math.sin(a);
    }
    t = { cos, sin };
    twiddleCache.set(n, t);
  }
  return t;
}

/** In-place radix-2 decimation-in-time FFT. Both arrays must share a power-of-two length. */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n !== im.length) throw new Error("fft: real and imaginary parts differ in length");
  if (n < 2 || (n & (n - 1)) !== 0) throw new Error(`fft: length ${n} is not a power of two`);

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }

  const { cos, sin } = twiddles(n);
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const step = n / len;
    for (let base = 0; base < n; base += len) {
      for (let k = 0, tw = 0; k < half; k++, tw += step) {
        const a = base + k;
        const b = a + half;
        const c = cos[tw];
        const s = sin[tw];
        const xr = re[b] * c - im[b] * s;
        const xi = re[b] * s + im[b] * c;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

const windowCache = new Map<number, Float32Array>();

/** Periodic Hann window, cached per size. */
export function hannWindow(size: number): Float32Array {
  let w = windowCache.get(size);
  if (!w) {
    w = new Float32Array(size);
    for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
    windowCache.set(size, w);
  }
  return w;
}

export const DEFAULT_FFT_SIZE = 2048;
const DB_FLOOR = -140;

/**
 * Average magnitude spectrum of a mono signal, in dBFS per linear FFT bin.
 * Frames are Hann-windowed and averaged in the power domain; the window's gain
 * is compensated so a full-scale sine reads about 0 dBFS.
 *
 * Returns `fftSize / 2` bins, where bin i is at `i * sampleRate / fftSize` Hz —
 * exactly what SpectrumPlot expects.
 */
export function averageSpectrumDb(mono: Float32Array, fftSize = DEFAULT_FFT_SIZE, hopSize = fftSize >> 1): Float32Array {
  const bins = fftSize >> 1;
  const power = new Float64Array(bins);
  const win = hannWindow(fftSize);
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);

  let winSum = 0;
  for (let i = 0; i < fftSize; i++) winSum += win[i];
  const scale = 2 / winSum;

  let frames = 0;
  const last = Math.max(0, mono.length - fftSize);
  for (let start = 0; start <= last; start += hopSize) {
    for (let i = 0; i < fftSize; i++) {
      re[i] = (mono[start + i] ?? 0) * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let i = 0; i < bins; i++) {
      const mag = Math.hypot(re[i], im[i]) * scale;
      power[i] += mag * mag;
    }
    frames++;
  }

  const out = new Float32Array(bins);
  if (frames === 0) {
    out.fill(DB_FLOOR);
    return out;
  }
  for (let i = 0; i < bins; i++) out[i] = Math.max(DB_FLOOR, 10 * Math.log10(power[i] / frames + 1e-20));
  return out;
}
