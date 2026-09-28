"use client";

import { useEffect, useRef, useState } from "react";
import { NOISE_KEYS } from "./hero-config";
import { COPY } from "./hero-copy";
import { heroState, onHeroFrame } from "./hero-state";

type Graph = { ctx: AudioContext; gains: Record<string, GainNode>; master: GainNode };

// Off by default. The AudioContext is only created/resumed on the user's click.
// Each stem's gain follows the same timeline weights as the visuals.
export function SoundToggle() {
  const [on, setOn] = useState(false);
  const graph = useRef<Graph | null>(null);

  async function build(): Promise<Graph> {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    const gains: Record<string, GainNode> = {};
    const names = ["voice", ...NOISE_KEYS];
    const buffers = await Promise.all(
      names.map((n) =>
        fetch(`/hero/audio/${n}.wav`)
          .then((r) => r.arrayBuffer())
          .then((b) => ctx.decodeAudioData(b)),
      ),
    );
    names.forEach((n, i) => {
      const src = ctx.createBufferSource();
      src.buffer = buffers[i];
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(g).connect(master);
      src.start();
      gains[n] = g;
    });
    return { ctx, gains, master };
  }

  async function toggle() {
    if (!on) {
      graph.current ??= await build();
      await graph.current.ctx.resume();
      setOn(true);
    } else {
      await graph.current?.ctx.suspend();
      setOn(false);
    }
  }

  useEffect(() => {
    if (!on) return;
    return onHeroFrame(() => {
      const g = graph.current;
      if (!g) return;
      const now = g.ctx.currentTime;
      g.gains.voice.gain.setTargetAtTime(0.9, now, 0.05);
      for (const k of NOISE_KEYS) {
        const w = heroState.noise[k] + (k === "gunshot" ? heroState.imp * (1 - heroState.clamp) : 0);
        g.gains[k].gain.setTargetAtTime(Math.min(1, w) * 0.8, now, 0.05);
      }
    });
  }, [on]);

  useEffect(() => () => void graph.current?.ctx.close(), []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`hud-btn ${on ? "border-cy text-cy" : ""}`}
    >
      <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${on ? "bg-cy" : "bg-dim"}`} />
      {on ? COPY.sound.on : COPY.sound.off}
    </button>
  );
}
