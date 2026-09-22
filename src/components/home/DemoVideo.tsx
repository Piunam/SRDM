"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Figure } from "@/components/ui/Figure";
import { fmtTime } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { HOME } from "./home-copy";
import { Reveal } from "./Reveal";

const { video } = HOME;

const iconBtn =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-line text-silver transition-colors duration-200 hover:border-line3 hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy";

function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
      {playing ? (
        <path d="M1 1h3v10H1zM7 1h3v10H7z" fill="currentColor" />
      ) : (
        <path d="M1.5 1l8 5-8 5z" fill="currentColor" />
      )}
    </svg>
  );
}

function MuteIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 14 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <path d="M1 4.5h2.2L6 2v8L3.2 7.5H1z" strokeLinejoin="round" />
      {muted ? (
        <path d="M9 4l3.5 4M12.5 4L9 8" strokeLinecap="round" />
      ) : (
        <path
          d="M8.6 4.2a2.6 2.6 0 010 3.6M10.6 2.6a5 5 0 010 6.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/** Custom transport for the prototype clip. No browser chrome, no autoplay. */
function Player({ src, poster }: { src: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Leaving the viewport stops playback; it never restarts on its own.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) el.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Smooth playhead while playing; the timeupdate event is too coarse to scrub against.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) setTime(el.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  const seek = useCallback((value: number) => {
    const el = ref.current;
    if (el) el.currentTime = value;
    setTime(value);
  }, []);

  const progress = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div className="relative">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={video.caption}
        className="block h-full w-full object-cover"
        style={{ aspectRatio: "16 / 9" }}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      />

      <div className="flex items-center gap-4 border-t border-line bg-deep px-3 py-2.5">
        <button
          type="button"
          className={iconBtn}
          onClick={toggle}
          aria-label={playing ? "Pause video" : "Play video"}
        >
          <PlayIcon playing={playing} />
        </button>

        <span className="mono-label shrink-0 text-dim tabular-nums">
          {fmtTime(time)}
        </span>

        <div className="relative flex h-6 flex-1 items-center">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            aria-valuetext={`${fmtTime(time)} of ${fmtTime(duration)}`}
            className="peer absolute inset-0 z-10 w-full cursor-pointer opacity-0"
          />
          <div className="h-[2px] w-full bg-line3 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-cy">
            <div className="h-full bg-cy" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <span className="mono-label shrink-0 text-dim tabular-nums">
          {fmtTime(duration)}
        </span>

        <button
          type="button"
          className={iconBtn}
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          <MuteIcon muted={muted} />
        </button>
      </div>
    </div>
  );
}

export function DemoVideo() {
  const src = siteConfig.assets.demoVideoUrl;
  return (
    <Section id="bench-test" className="border-t border-line bg-abyss">
      <Reveal>
        <SectionHeader
          number={video.number}
          label={video.label}
          title={video.title}
          lede={src ? video.lede : undefined}
          headingId="bench-test-title"
        />
      </Reveal>

      <Reveal delay={0.06} className="mt-4">
        {src ? (
          <Figure caption={video.caption}>
            <Player src={src} poster={siteConfig.assets.demoVideoPoster} />
          </Figure>
        ) : (
          <Figure
            caption={video.caption}
            ratio="16 / 9"
            pendingLabel={video.pendingLabel}
          />
        )}
      </Reveal>
    </Section>
  );
}
