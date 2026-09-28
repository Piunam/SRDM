"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Envelope } from "@/components/plots/plot-utils";
import { PROTOCOL, type LiveFrame, type Stage } from "./protocol";
import { LaneWindow, RollingMean } from "./rolling";

/** What is driving the visuals right now. Never inferred: it is always shown. */
export type FeedSource = "simulated" | "device" | "none";

/** One snapshot of the feed, handed to the plots. Every field can be absent. */
export type LiveView = {
  input: Envelope | null;
  output: Envelope | null;
  fftIn: Float32Array | null;
  fftOut: Float32Array | null;
  snrDb: number | null;
  snrMeanDb: number | null;
  latencyMs: number | null;
  stage: Stage | null;
  frames: number;
  /** No frame for longer than PROTOCOL.stallMs: the view below is frozen. */
  stalled: boolean;
};

const EMPTY_VIEW: LiveView = {
  input: null,
  output: null,
  fftIn: null,
  fftOut: null,
  snrDb: null,
  snrMeanDb: null,
  latencyMs: null,
  stage: null,
  frames: 0,
  stalled: false,
};

/** Frames arrive faster than the eye; the UI is repainted on its own clock. */
const PUBLISH_MS = 50;

type Buffers = {
  input: LaneWindow;
  output: LaneWindow;
  mean: RollingMean;
  last: LiveFrame | null;
  frames: number;
  lastAt: number;
  dirty: boolean;
};

const makeBuffers = (): Buffers => ({
  input: new LaneWindow(PROTOCOL.windowSeconds),
  output: new LaneWindow(PROTOCOL.windowSeconds),
  mean: new RollingMean(PROTOCOL.meanSeconds * 1000),
  last: null,
  frames: 0,
  lastAt: 0,
  dirty: false,
});

/**
 * Collects frames into the scrolling window and republishes them to React at a
 * fixed rate, whatever the device does. `active` starts and stops the repaint
 * loop; the buffers themselves live in a ref and are never touched in render.
 */
export function useLiveFeed(active: boolean, onStall?: (stalled: boolean) => void) {
  const [view, setView] = useState<LiveView>(EMPTY_VIEW);
  const buffersRef = useRef<Buffers | null>(null);
  const stalledRef = useRef(false);
  const getBuffers = useCallback(() => (buffersRef.current ??= makeBuffers()), []);

  const onStallRef = useRef(onStall);
  useEffect(() => {
    onStallRef.current = onStall;
  });

  const pushFrame = useCallback(
    (frame: LiveFrame) => {
      const b = getBuffers();
      const now = performance.now();
      b.input.push(now, frame.inRms);
      b.output.push(now, frame.outRms);
      if (frame.snrDb !== null) b.mean.push(now, frame.snrDb);
      b.last = frame;
      b.frames++;
      b.lastAt = now;
      b.dirty = true;
    },
    [getBuffers],
  );

  const reset = useCallback(() => {
    const b = getBuffers();
    b.input.clear();
    b.output.clear();
    b.mean.clear();
    b.last = null;
    b.frames = 0;
    b.lastAt = 0;
    b.dirty = false;
    stalledRef.current = false;
    setView(EMPTY_VIEW);
  }, [getBuffers]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const b = getBuffers();
      const now = performance.now();
      // A hidden tab throttles timers; that is not a device fault.
      if (b.lastAt > 0 && !document.hidden && now - b.lastAt > PROTOCOL.stallMs) {
        if (!stalledRef.current) {
          stalledRef.current = true;
          onStallRef.current?.(true);
          setView((v) => ({ ...v, stalled: true }));
        }
        return;
      }
      if (stalledRef.current) {
        stalledRef.current = false;
        onStallRef.current?.(false);
      }
      if (!b.dirty) return;
      b.dirty = false;
      const last = b.last;
      setView({
        input: b.input.snapshot(),
        output: b.output.snapshot(),
        fftIn: last?.fftIn ?? null,
        fftOut: last?.fftOut ?? null,
        snrDb: last?.snrDb ?? null,
        snrMeanDb: b.mean.mean(now),
        latencyMs: last?.latencyMs ?? null,
        stage: last?.stage ?? null,
        frames: b.frames,
        stalled: false,
      });
    }, PUBLISH_MS);
    return () => window.clearInterval(id);
  }, [active, getBuffers]);

  return { view, pushFrame, reset };
}
