"use client";

import { useEffect, useMemo, useState } from "react";
import { WaveformPlot } from "@/components/plots/WaveformPlot";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { StatusTag } from "@/components/ui/StatusTag";
import { AudioLoadError, decodeFile } from "@/lib/audio/decode";
import type { TransportTrack } from "@/lib/audio/transport";
import { useAudioEngine } from "@/lib/audio/useAudioEngine";
import { AudioLane } from "./AudioLane";
import { clipFromBuffer, useClips, type ClipData, type ClipSource } from "./clips";
import { EmptyState } from "./EmptyState";
import { MonoNote, Segmented } from "./controls";
import {
  clipOptions,
  delta,
  demoUrl,
  LOCAL_FILE_NOTE,
  METRICS_NOTE,
  noiseOptions,
  snrLabel,
  snrOptions,
  type DemoItem,
  type Selection,
} from "./manifest";

const NOISY = "noisy";
const ENHANCED = "enhanced";

const AB_OPTIONS = [
  { value: NOISY, label: "Noisy" },
  { value: ENHANCED, label: "Enhanced" },
] as const;

type LocalUpload = { forUrl: string | null; clip: ClipData | null; error: string | null; name: string };

function buildSources(noisyUrl: string | null, enhancedUrl: string | null): ClipSource[] {
  if (!noisyUrl || !enhancedUrl) return [];
  return [
    { id: NOISY, url: noisyUrl },
    { id: ENHANCED, url: enhancedUrl },
  ];
}

function Delta({ label, value, decimals, unit }: { label: string; value: number | null; decimals: number; unit?: string }) {
  const improved = value !== null && value > 0;
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim">Δ {label}</span>
      <span className={`font-mono text-[15px] tabular-nums ${improved ? "text-cy" : "text-silver"}`}>
        {value === null ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(decimals)}${unit ? ` ${unit}` : ""}`}
      </span>
      {value !== null && value !== 0 && (
        <span aria-hidden="true" className={`font-mono text-[12px] ${improved ? "text-cy" : "text-dim"}`}>
          {improved ? "↑" : "↓"}
        </span>
      )}
    </div>
  );
}

export function EvidencePanel({
  items,
  selection,
  item,
  onSelect,
}: {
  items: DemoItem[];
  selection: Selection | null;
  item: DemoItem | null;
  onSelect: (next: Partial<Selection>) => void;
}) {
  const { transport, state } = useAudioEngine("sync");
  const [reloadToken, setReloadToken] = useState(0);
  const [local, setLocal] = useState<LocalUpload | null>(null);
  const [diffView, setDiffView] = useState(false);

  const noisyUrl = item ? demoUrl(item.noisy.file) : null;
  const enhancedUrl = item ? demoUrl(item.enhanced.file) : null;

  const sources = useMemo(() => buildSources(noisyUrl, enhancedUrl), [noisyUrl, enhancedUrl]);
  const { clips, status, error } = useClips(sources, reloadToken);

  // A local upload belongs to the selection it was dropped on; moving on discards it.
  const upload = local && local.forUrl === noisyUrl ? local : null;
  const noisyClip = upload?.clip ?? clips?.get(NOISY) ?? null;
  const enhancedClip = clips?.get(ENHANCED) ?? null;

  useEffect(() => {
    const tracks: TransportTrack[] = [];
    if (noisyClip) tracks.push({ id: NOISY, buffer: noisyClip.buffer });
    if (enhancedClip) tracks.push({ id: ENHANCED, buffer: enhancedClip.buffer });
    transport.setTracks(tracks);
  }, [transport, noisyClip, enhancedClip]);

  const noises = noiseOptions(items);
  const snrs = selection ? snrOptions(items, selection.noise) : [];
  const clipIds = selection ? clipOptions(items, selection.noise, selection.snrDb) : [];
  const active = state.activeId ?? NOISY;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const buffer = await decodeFile(file);
      setLocal({ forUrl: noisyUrl, clip: clipFromBuffer(NOISY, file.name, null, buffer), error: null, name: file.name });
    } catch (err) {
      const message = err instanceof AudioLoadError ? `${file.name} ${err.message}` : "That file could not be decoded.";
      setLocal({ forUrl: noisyUrl, clip: null, error: message, name: file.name });
    }
  };

  const localFileField = (
    <>
      <Field label="Your own file" hint="WAV or MP3 · loads into the noisy lane · metrics stay blank">
        {({ id, className }) => (
          <input
            id={id}
            type="file"
            accept=".wav,.mp3,audio/wav,audio/mpeg"
            onChange={(e) => void onFile(e.target.files?.[0])}
            className={`${className} py-1.5 file:mr-3 file:h-6 file:rounded-[3px] file:border file:border-line3 file:bg-transparent file:px-2 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.08em] file:text-silver`}
          />
        )}
      </Field>
      {upload?.clip && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-amber">local file in the noisy lane — {upload.name}</p>
      )}
      {upload?.error && <p className="mt-2 font-mono text-[10px] text-fault">{upload.error}</p>}
    </>
  );

  // With no manifest the page is still usable: drop in a file and look at it.
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <EmptyState />
        <Panel className="p-5 md:p-6">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">Meanwhile</h3>
          {localFileField}
        </Panel>
        <AudioLane
          laneName="LOCAL FILE"
          trackId={NOISY}
          color="fault"
          clip={noisyClip}
          transport={transport}
          playing={state.playing}
          playhead={state.time}
          metrics={null}
          metricsNote={LOCAL_FILE_NOTE}
          placeholder="pick a WAV or MP3 above"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end">
          <Field label="Input SNR">
            {({ id, className }) => (
              <select
                id={id}
                className={className}
                value={selection?.snrDb ?? ""}
                onChange={(e) => onSelect({ snrDb: Number(e.target.value) })}
                disabled={!selection}
              >
                {snrs.map((db) => (
                  <option key={db} value={db}>
                    {snrLabel(db)}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Noise type">
            {({ id, className }) => (
              <select
                id={id}
                className={className}
                value={selection?.noise ?? ""}
                onChange={(e) => onSelect({ noise: e.target.value })}
                disabled={!selection}
              >
                {noises.map((noise) => (
                  <option key={noise} value={noise}>
                    {noise}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Clip">
            {({ id, className }) => (
              <select
                id={id}
                className={className}
                value={selection?.clip ?? ""}
                onChange={(e) => onSelect({ clip: e.target.value })}
                disabled={!selection}
              >
                {clipIds.map((clip) => (
                  <option key={clip} value={clip}>
                    {clip}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Button variant="ghost" onClick={() => setReloadToken((n) => n + 1)} disabled={!item}>
            LOAD
          </Button>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <MonoNote>
            {noisyUrl ?? "—"}
            <br />
            {enhancedUrl ?? "—"}
          </MonoNote>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
            {status === "loading" && "decoding…"}
            {status === "ready" && "loaded"}
            {status === "error" && <span className="text-fault">{error}</span>}
            {status === "idle" && "nothing selected"}
            <span className="ml-2 text-faint">· a selection loads on its own; LOAD retries</span>
          </p>
        </div>

        <div className="mt-5 border-t border-line pt-5">{localFileField}</div>
      </Panel>

      <AudioLane
        laneName="NOISY INPUT"
        trackId={NOISY}
        color="fault"
        clip={noisyClip}
        overlay={diffView ? enhancedClip : null}
        overlayColor="cy"
        transport={transport}
        playing={state.playing && active === NOISY}
        running={state.playing}
        playhead={state.time}
        metrics={upload?.clip ? null : (item?.noisy ?? null)}
        metricsNote={upload?.clip ? LOCAL_FILE_NOTE : METRICS_NOTE}
        audible={active === NOISY}
        placeholder={status === "loading" ? "decoding…" : "no audio loaded"}
      />

      <Panel className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <Delta label="SNR" value={delta(item?.noisy.snrDb ?? null, item?.enhanced.snrDb ?? null)} decimals={1} unit="dB" />
          <Delta label="STOI" value={delta(item?.noisy.stoi ?? null, item?.enhanced.stoi ?? null)} decimals={2} />
          <Delta label="PESQ" value={delta(item?.noisy.pesq ?? null, item?.enhanced.pesq ?? null)} decimals={2} />
          {item?.status && <StatusTag status={item.status} />}

          <div className="ml-auto flex flex-wrap items-center gap-4">
            <Segmented
              label="Audible lane"
              options={AB_OPTIONS}
              value={active === ENHANCED ? ENHANCED : NOISY}
              onChange={(value) => transport.setActive(value)}
            />
            <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
              <input
                type="checkbox"
                checked={diffView}
                onChange={(e) => setDiffView(e.target.checked)}
                className="h-3 w-3 accent-cy focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy"
              />
              Difference view
            </label>
          </div>
        </div>

        <MonoNote className="mt-4">
          A/B keeps the playhead and crossfades in 15 ms · {METRICS_NOTE}
        </MonoNote>

        {diffView && (
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">NOISY (RED) OVER ENHANCED (TEAL)</p>
            <WaveformPlot
              envelope={noisyClip?.envelope ?? null}
              overlay={enhancedClip?.envelope ?? null}
              color="fault"
              overlayColor="cy"
              duration={noisyClip?.duration ?? 0}
              playhead={noisyClip ? state.time : undefined}
              onSeek={noisyClip ? (seconds) => transport.seek(seconds) : undefined}
              height={120}
              label="Noisy and enhanced envelopes overlaid"
            />
          </div>
        )}
      </Panel>

      <AudioLane
        laneName="ENHANCED OUTPUT"
        trackId={ENHANCED}
        color="cy"
        clip={enhancedClip}
        transport={transport}
        playing={state.playing && active === ENHANCED}
        running={state.playing}
        playhead={state.time}
        metrics={item?.enhanced ?? null}
        metricsNote={METRICS_NOTE}
        audible={active === ENHANCED}
        placeholder={status === "loading" ? "decoding…" : "no audio loaded"}
      />
    </div>
  );
}
