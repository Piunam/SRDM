"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { IDLE_STATE, Transport, type TransportMode, type TransportState } from "./transport";

// One AudioContext for the whole page. It is created by the first play() call —
// that is, by a user gesture — and never before, so nothing can autoplay.
let sharedContext: AudioContext | null = null;
let mounted = 0;

export function acquireAudioContext(): AudioContext {
  sharedContext ??= new AudioContext();
  return sharedContext;
}

const serverSnapshot = () => IDLE_STATE;

/**
 * A transport bound to the shared context, plus its state as a React value.
 * Nodes are released on unmount and the context is suspended while the page is
 * hidden or while no panel is mounted.
 */
export function useAudioEngine(mode: TransportMode = "sync"): { transport: Transport; state: TransportState } {
  const [transport] = useState(() => new Transport(acquireAudioContext, mode));
  const state = useSyncExternalStore(transport.subscribe, transport.getSnapshot, serverSnapshot);

  useEffect(() => {
    mounted++;

    const onVisibility = () => {
      const ctx = sharedContext;
      if (!ctx) return;
      if (document.hidden) {
        // Suspending freezes ctx.currentTime, so the playhead survives untouched.
        if (ctx.state === "running") void ctx.suspend();
      } else if (transport.isPlaying && ctx.state === "suspended") {
        void ctx.resume();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      transport.teardown();
      mounted--;
      // Keep the context — panel swaps unmount and remount within one commit —
      // but let the device go idle when nothing is using it.
      if (mounted === 0 && sharedContext?.state === "running") void sharedContext.suspend();
    };
  }, [transport]);

  return { transport, state };
}
