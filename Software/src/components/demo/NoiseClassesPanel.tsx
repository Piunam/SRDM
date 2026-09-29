"use client";

import { useEffect } from "react";
import { WaveformPlot } from "@/components/plots/WaveformPlot";
import { Panel } from "@/components/ui/Panel";
import type { TransportTrack } from "@/lib/audio/transport";
import { useAudioEngine } from "@/lib/audio/useAudioEngine";
import { useClips, type ClipSource } from "./clips";
import { MonoNote, TransportButton } from "./controls";

const SAMPLE_SECONDS = 2;

// Qualitative description of each class and the part of the chain that earns its
// keep on it. TODO(owner): confirm against the evaluation once it is final.
const NOISE_CLASSES = [
  { id: "gunshot", title: "Gunshot", character: "impulsive", handledBy: "DSP", note: "Milliseconds of broadband energy 40 dB above speech." },
  { id: "rotor", title: "Rotor", character: "periodic", handledBy: "both", note: "A stable blade rate with sidebands that drift as the craft loads." },
  { id: "engine", title: "Engine", character: "stationary", handledBy: "network", note: "Harmonic low end, slow to change, masks vowels not consonants." },
  { id: "siren", title: "Siren", character: "tonal", handledBy: "network", note: "A swept tone that crosses the formants it hides." },
  { id: "wind", title: "Wind", character: "broadband", handledBy: "DSP", note: "Pink, gusting, and mostly a microphone problem before it is a DSP one." },
] as const;

// The hero scene's clips, read in place. Never moved or renamed.
const SOURCES: ClipSource[] = NOISE_CLASSES.map((n) => ({ id: n.id, url: `/hero/audio/${n.id}.wav` }));

export function NoiseClassesPanel() {
  const { transport, state } = useAudioEngine("solo");
  const { clips, status, error } = useClips(SOURCES);

  useEffect(() => {
    const tracks: TransportTrack[] = [];
    for (const { id } of NOISE_CLASSES) {
      const clip = clips?.get(id);
      if (clip) tracks.push({ id, buffer: clip.buffer, limitSeconds: SAMPLE_SECONDS });
    }
    transport.setTracks(tracks);
  }, [transport, clips]);

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-5 md:p-6">
        <p className="max-w-[68ch] text-[17px] leading-[1.55] text-silver">
          Five classes the prototype is built for. Each behaves differently in time and in frequency, which is why one filter cannot cover
          them all.
        </p>
        <MonoNote className="mt-3">
          {status === "error" ? <span className="text-fault">{error}</span> : `${SAMPLE_SECONDS}-second samples · /public/hero/audio`}
        </MonoNote>
      </Panel>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {NOISE_CLASSES.map((noise) => {
          const clip = clips?.get(noise.id) ?? null;
          const playing = state.playing && state.activeId === noise.id;
          return (
            <Panel key={noise.id} className="flex flex-col p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[19px] font-medium tracking-[-0.01em] text-white">{noise.title}</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-dim">{noise.character}</span>
              </div>

              <div className="mt-4">
                <WaveformPlot
                  envelope={clip?.envelope ?? null}
                  color="silver"
                  duration={clip?.duration ?? 0}
                  playhead={playing ? state.time : undefined}
                  height={56}
                  label={`${noise.title} sample waveform`}
                  emptyLabel={status === "loading" ? "decoding…" : "sample unavailable"}
                />
              </div>

              <p className="mt-4 text-[15px] leading-[1.5] text-silver">{noise.note}</p>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
                  handled by <span className="text-cy">{noise.handledBy}</span>
                </span>
                <TransportButton playing={playing} onToggle={() => transport.toggle(noise.id)} laneName={`${noise.title} sample`} disabled={!clip} />
              </div>
            </Panel>
          );
        })}
      </div>

      <MonoNote>
        TODO(owner): these are the hero scene&rsquo;s stand-in clips, synthesised by scripts/make-hero-data.py. Replace them with field
        recordings before this page is shown as evidence.
      </MonoNote>
    </div>
  );
}
