"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { ConnectionBar, type DemoConnectionState } from "./ConnectionBar";
import { LiveAudioSnapshotPanel } from "./LiveAudioSnapshotPanel";

export function LiveSession() {
  const router = useRouter();
  const [connection, setConnection] =
    useState<DemoConnectionState>("DISCONNECTED");
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const connect = useCallback(() => {
    if (connection !== "DISCONNECTED") return;
    setConnection("CONNECTING");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setConnection("CONNECTED");
    }, 3000);
  }, [connection]);

  const disconnect = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setConnection("DISCONNECTED");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/live/session", { method: "DELETE" });
    } finally {
      router.refresh();
    }
  }, [router]);

  return (
    <Section className="pt-20 pb-24 md:pt-24 md:pb-28">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cy">
            Live session · dummy device
          </p>
          <h1 className="mt-3 text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.06] tracking-[-0.015em] text-white">
            Live hardware session
          </h1>
          <p className="mt-3 max-w-[60ch] text-[17px] leading-[1.55] text-silver">
            Connect the demonstration device, then compare its input and output
            audio with SNR, STOI and PESQ.
          </p>
        </div>
        <Button size="sm" onClick={() => void signOut()}>
          SIGN OUT
        </Button>
      </header>

      <div className="mt-10 flex flex-col gap-6">
        <ConnectionBar
          state={connection}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        <LiveAudioSnapshotPanel connected={connection === "CONNECTED"} />
      </div>
    </Section>
  );
}
