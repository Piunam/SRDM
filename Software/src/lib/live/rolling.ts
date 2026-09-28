// Fixed-size buffers behind the live plots. They are mutated from frame
// callbacks, so they live in refs and hand out fresh copies to React.

import type { Envelope } from "@/components/plots/plot-utils";

/**
 * A scrolling time window of peak amplitude, one column per slice of wall clock.
 * Columns the feed never filled stay at zero, so a gap reads as a gap rather
 * than as a stretched signal.
 */
export class LaneWindow {
  readonly columns: number;
  private readonly columnMs: number;
  private readonly peak: Float32Array;
  private head = 0;
  private columnStart = 0;

  constructor(seconds: number, columns = 220) {
    this.columns = columns;
    this.columnMs = (seconds * 1000) / columns;
    this.peak = new Float32Array(columns);
  }

  clear() {
    this.peak.fill(0);
    this.head = 0;
    this.columnStart = 0;
  }

  /** `now` is wall clock (performance.now()), not the device timestamp. */
  push(now: number, value: number) {
    if (this.columnStart === 0) this.columnStart = now;
    const elapsed = now - this.columnStart;
    if (elapsed >= this.columnMs * this.columns) {
      // Longer than the whole window: nothing old is worth keeping.
      this.peak.fill(0);
      this.head = 0;
      this.columnStart = now;
    } else {
      let steps = Math.floor(elapsed / this.columnMs);
      while (steps-- > 0) {
        this.head = (this.head + 1) % this.columns;
        this.peak[this.head] = 0;
        this.columnStart += this.columnMs;
      }
    }
    const v = Math.min(1, Math.abs(value));
    if (v > this.peak[this.head]) this.peak[this.head] = v;
  }

  /** Oldest column first, as the min/max pair the waveform plot expects. */
  snapshot(): Envelope {
    const n = this.columns;
    const min = new Float32Array(n);
    const max = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = this.peak[(this.head + 1 + i) % n];
      min[i] = -v;
      max[i] = v;
    }
    return { min, max };
  }
}

/** Ring of timestamped samples, for the rolling SNR mean. */
export class RollingMean {
  private readonly at: Float64Array;
  private readonly value: Float64Array;
  private count = 0;
  private head = 0;

  constructor(private readonly spanMs: number, capacity = 2048) {
    this.at = new Float64Array(capacity);
    this.value = new Float64Array(capacity);
  }

  clear() {
    this.count = 0;
    this.head = 0;
  }

  push(now: number, v: number) {
    const cap = this.at.length;
    this.at[this.head] = now;
    this.value[this.head] = v;
    this.head = (this.head + 1) % cap;
    if (this.count < cap) this.count++;
  }

  mean(now: number): number | null {
    let sum = 0;
    let n = 0;
    const cap = this.at.length;
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - 1 - i + cap * 2) % cap;
      if (now - this.at[idx] > this.spanMs) break; // older samples only go further back
      sum += this.value[idx];
      n++;
    }
    return n === 0 ? null : sum / n;
  }
}
