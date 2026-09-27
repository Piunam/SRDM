"use client";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export type DemoConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

const TONE: Record<DemoConnectionState, { dot: string; text: string }> = {
  DISCONNECTED: { dot: "bg-faint", text: "text-dim" },
  CONNECTING: { dot: "bg-amber", text: "text-amber" },
  CONNECTED: { dot: "bg-cy", text: "text-cy" },
};

export function ConnectionBar({
  state,
  onConnect,
  onDisconnect,
}: {
  state: DemoConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = state === "CONNECTED";
  const connecting = state === "CONNECTING";
  const tone = TONE[state];

  return (
    <Panel className="p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2.5" aria-live="polite">
            <span
              className={`h-2 w-2 rounded-full ${tone.dot} ${state !== "DISCONNECTED" ? "live-pulse" : ""}`}
              aria-hidden="true"
            />
            <span
              className={`font-mono text-[12px] uppercase tracking-[0.14em] ${tone.text}`}
            >
              {connected
                ? "DEVICE CONNECTED"
                : connecting
                  ? "CONNECTING…"
                  : "DEVICE DISCONNECTED"}
            </span>
          </p>
          <p className="mt-2 text-[15px] leading-[1.5] text-silver">
            {connected
              ? "The local demonstration audio is ready."
              : connecting
                ? "Waiting for the device handshake. This takes about three seconds."
                : "Connect the demonstration device to load its input and output audio."}
          </p>
        </div>

        {connected ? (
          <Button size="sm" onClick={onDisconnect}>
            DISCONNECT
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? "CONNECTING…" : "CONNECT DEVICE"}
          </Button>
        )}
      </div>
    </Panel>
  );
}
