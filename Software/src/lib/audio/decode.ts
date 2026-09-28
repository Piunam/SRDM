// Fetching and decoding, with an in-memory cache keyed by URL.
//
// Decoding deliberately runs on an OfflineAudioContext: it needs no user
// gesture and opens no output device, so a panel can draw its waveforms before
// anyone presses play. The playback AudioContext is created separately, on the
// first gesture (see useAudioEngine).

const DECODE_SAMPLE_RATE = 48_000;
const MAX_CACHED = 24;

let decodeCtx: OfflineAudioContext | null = null;
const cache = new Map<string, AudioBuffer>();

function decodeContext(): BaseAudioContext {
  decodeCtx ??= new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE);
  return decodeCtx;
}

export class AudioLoadError extends Error {
  constructor(
    readonly url: string,
    message: string,
  ) {
    super(message);
    this.name = "AudioLoadError";
  }
}

/** True when a rejection is just an aborted request rather than a real failure. */
export const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

function remember(url: string, buffer: AudioBuffer) {
  cache.set(url, buffer);
  // Bounded LRU-ish: Map preserves insertion order, so the oldest key goes first.
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

export async function decodeBytes(bytes: ArrayBuffer, url = "(local)"): Promise<AudioBuffer> {
  try {
    return await decodeContext().decodeAudioData(bytes);
  } catch {
    throw new AudioLoadError(url, "could not be decoded — expected WAV or MP3 audio");
  }
}

/**
 * Fetches and decodes a clip. Results are cached by URL; `signal` aborts both
 * the request and the hand-off, so switching panels drops in-flight work.
 */
export async function decodeUrl(url: string, signal?: AbortSignal): Promise<AudioBuffer> {
  const hit = cache.get(url);
  if (hit) {
    // Refresh recency.
    cache.delete(url);
    cache.set(url, hit);
    return hit;
  }

  const res = await fetch(url, { signal, cache: "force-cache" });
  if (!res.ok) throw new AudioLoadError(url, res.status === 404 ? "file not found" : `request failed (${res.status})`);
  const bytes = await res.arrayBuffer();
  ensureNotAborted(signal);

  const buffer = await decodeBytes(bytes, url);
  ensureNotAborted(signal);
  remember(url, buffer);
  return buffer;
}

/** Decodes a file the visitor picked from disk. Never cached — it has no stable URL. */
export async function decodeFile(file: File): Promise<AudioBuffer> {
  return decodeBytes(await file.arrayBuffer(), file.name);
}

export function clearDecodeCache() {
  cache.clear();
}
