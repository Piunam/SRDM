"use client";

import { useEffect, useState } from "react";
import type { Envelope } from "@/components/plots/plot-utils";
import { AudioLoadError, decodeUrl, isAbort } from "@/lib/audio/decode";
import { envelopeFromMono, mixToMono } from "@/lib/audio/envelope";
import { averageSpectrumDb, DEFAULT_FFT_SIZE } from "@/lib/audio/spectrum";
import { baseName } from "./manifest";

export type ClipData = {
  id: string;
  name: string;
  /** null for a file the visitor picked from disk. */
  url: string | null;
  buffer: AudioBuffer;
  envelope: Envelope;
  /** Average spectrum in dBFS per linear bin, computed once after decoding. */
  average: Float32Array;
  sampleRate: number;
  duration: number;
};

export const FFT_SIZE = DEFAULT_FFT_SIZE;

/** Reduces a decoded buffer to everything the plots need, in one pass over the samples. */
export function clipFromBuffer(id: string, name: string, url: string | null, buffer: AudioBuffer): ClipData {
  const mono = mixToMono(buffer);
  return {
    id,
    name,
    url,
    buffer,
    envelope: envelopeFromMono(mono),
    average: averageSpectrumDb(mono, FFT_SIZE),
    sampleRate: buffer.sampleRate,
    duration: buffer.duration,
  };
}

export type ClipSource = { id: string; url: string };
export type ClipStatus = "idle" | "loading" | "ready" | "error";

const sourceKey = (sources: ClipSource[], nonce: number) => `${nonce}:${sources.map((s) => `${s.id}=${s.url}`).join("|")}`;

const describe = (error: unknown) =>
  error instanceof AudioLoadError ? `${baseName(error.url)} ${error.message}` : "Audio could not be loaded.";

/**
 * Decodes a fixed set of clips, aborting whatever is in flight when the set
 * changes — pass a memoised array so the identity is stable across renders.
 * Bumping `nonce` retries the same set, which is what the LOAD button does.
 */
export function useClips(
  sources: ClipSource[],
  nonce = 0,
): { clips: Map<string, ClipData> | null; status: ClipStatus; error: string | null } {
  const key = sourceKey(sources, nonce);
  const [done, setDone] = useState<{ key: string; clips: Map<string, ClipData> | null; error: string | null }>({
    key: "",
    clips: null,
    error: null,
  });

  useEffect(() => {
    if (sources.length === 0) return;
    const controller = new AbortController();
    const signal = controller.signal;
    const current = sourceKey(sources, nonce);

    void (async () => {
      try {
        const entries = await Promise.all(
          sources.map(async (source) => [source.id, await loadClip(source, signal)] as const),
        );
        if (signal.aborted) return;
        setDone({ key: current, clips: new Map(entries), error: null });
      } catch (error) {
        if (signal.aborted || isAbort(error)) return;
        setDone({ key: current, clips: null, error: describe(error) });
      }
    })();

    return () => controller.abort();
  }, [sources, nonce]);

  if (sources.length === 0) return { clips: null, status: "idle", error: null };
  if (done.key !== key) return { clips: null, status: "loading", error: null };
  if (done.error) return { clips: null, status: "error", error: done.error };
  return { clips: done.clips, status: done.clips ? "ready" : "loading", error: null };
}

async function loadClip(source: ClipSource, signal: AbortSignal): Promise<ClipData> {
  const buffer = await decodeUrl(source.url, signal);
  return clipFromBuffer(source.id, baseName(source.url), source.url, buffer);
}
