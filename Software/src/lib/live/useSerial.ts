"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSerial, hexId, parseAudioSnapshotLine, parseFrameLine, PROTOCOL, type LiveAudioSnapshot, type LiveFrame, type SerialPort } from "./protocol";

export type LinkState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
export type DeviceInfo = { vendorId: string; productId: string; baudRate: number };

type Handlers = {
  onFrame: (frame: LiveFrame) => void;
  onAudio: (snapshot: LiveAudioSnapshot) => void;
  onEvent: (kind: "link" | "error" | "info", message: string) => void;
  /** Called on every transition, so the page can react without an effect. */
  onState: (next: LinkState, previous: LinkState) => void;
};

// Web Serial presence never changes for the life of the document, so the
// "store" has nothing to subscribe to. The server snapshot is null — unknown —
// which keeps the unsupported note out of the HTML.
const noSubscribe = () => () => {};
const serialSnapshot = () => getSerial() !== null;
const serialServerSnapshot = () => null;

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const isCancelled = (error: unknown) => error instanceof DOMException && (error.name === "NotFoundError" || error.name === "AbortError");

/**
 * Reads newline-delimited frames until the reader is cancelled or the device
 * goes away. Returns the reason it stopped so the caller can decide whether it
 * was an error or a deliberate close.
 */
async function pump(
  port: SerialPort,
  onLine: (line: string) => void,
  setReader: (reader: ReadableStreamDefaultReader<Uint8Array> | null) => void,
): Promise<{ error: unknown } | null> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (port.readable) {
    const reader = port.readable.getReader();
    setReader(reader);
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return null;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        for (let nl = buffer.indexOf("\n"); nl >= 0; nl = buffer.indexOf("\n")) {
          onLine(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
        }
        // A device that never sends a newline must not grow the buffer forever.
        if (buffer.length > PROTOCOL.maxLineChars) buffer = "";
      }
    } catch (error) {
      return { error };
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Already released by a cancel racing the loop.
      }
      setReader(null);
    }
  }
  return null;
}

/**
 * Owns the Web Serial port: opening, reading, and releasing it on disconnect,
 * on unplug and on unmount. Every failure path ends in a state, never a throw.
 */
export function useSerial({ onFrame, onAudio, onEvent, onState }: Handlers) {
  const supported = useSyncExternalStore<boolean | null>(noSubscribe, serialSnapshot, serialServerSnapshot);
  const [state, setState] = useState<LinkState>("DISCONNECTED");
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);

  const stateRef = useRef<LinkState>("DISCONNECTED");
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const pumpRef = useRef<Promise<unknown> | null>(null);
  const closingRef = useRef(false);
  const badLinesRef = useRef(0);

  const onFrameRef = useRef(onFrame);
  const onAudioRef = useRef(onAudio);
  const onEventRef = useRef(onEvent);
  const onStateRef = useRef(onState);
  useEffect(() => {
    onFrameRef.current = onFrame;
    onAudioRef.current = onAudio;
    onEventRef.current = onEvent;
    onStateRef.current = onState;
  });

  /** The single place the link state moves, so no transition goes unreported. */
  const applyState = useCallback((next: LinkState) => {
    const previous = stateRef.current;
    if (previous === next) return;
    stateRef.current = next;
    setState(next);
    onStateRef.current(next, previous);
  }, []);

  /** Releases the reader and the port. Safe to call in any state. */
  const release = useCallback(async () => {
    closingRef.current = true;
    const reader = readerRef.current;
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // The device may already be gone.
      }
    }
    try {
      await pumpRef.current;
    } catch {
      // The pump reports through its return value, not by throwing.
    }
    pumpRef.current = null;
    const port = portRef.current;
    portRef.current = null;
    if (port) {
      try {
        await port.close();
      } catch {
        // Unplugged mid-read: nothing left to close.
      }
    }
    closingRef.current = false;
  }, []);

  const connect = useCallback(
    async (baudRate: number) => {
      const serial = getSerial();
      if (!serial) {
        applyState("ERROR");
        onEventRef.current("error", "Web Serial is not available in this browser");
        return;
      }
      if (portRef.current) return;

      applyState("CONNECTING");
      let port: SerialPort;
      try {
        port = await serial.requestPort();
      } catch (error) {
        applyState("DISCONNECTED");
        onEventRef.current("info", isCancelled(error) ? "port selection cancelled" : `port request failed · ${message(error)}`);
        return;
      }

      try {
        await port.open({ baudRate, bufferSize: 8192 });
      } catch (error) {
        applyState("ERROR");
        onEventRef.current("error", `open failed · ${message(error)}`);
        return;
      }

      portRef.current = port;
      badLinesRef.current = 0;
      const info = port.getInfo();
      setDevice({ vendorId: hexId(info.usbVendorId), productId: hexId(info.usbProductId), baudRate });
      setConnectedAt(Date.now());
      applyState("CONNECTED");
      onEventRef.current("link", `connected · ${hexId(info.usbVendorId)}:${hexId(info.usbProductId)} @ ${baudRate} baud`);

      const running = pump(
        port,
        (line) => {
          const snapshot = parseAudioSnapshotLine(line);
          const frame = snapshot ? null : parseFrameLine(line);
          if (snapshot) onAudioRef.current(snapshot);
          else if (frame) onFrameRef.current(frame);
          else if (line.trim()) {
            badLinesRef.current++;
            // One note per burst, not one per line.
            if (badLinesRef.current === 1 || badLinesRef.current % 200 === 0) {
              onEventRef.current("info", `unparsed line from device (${badLinesRef.current})`);
            }
          }
        },
        (reader) => {
          readerRef.current = reader;
        },
      ).then((result) => {
        if (closingRef.current) return;
        if (result) {
          applyState("ERROR");
          onEventRef.current("error", `read failed · ${message(result.error)}`);
        } else {
          applyState("DISCONNECTED");
          onEventRef.current("link", "stream closed by device");
        }
        setDevice(null);
        setConnectedAt(null);
        void release();
      });
      pumpRef.current = running;
    },
    [applyState, release],
  );

  const disconnect = useCallback(async () => {
    if (!portRef.current) {
      applyState("DISCONNECTED");
      return;
    }
    await release();
    setDevice(null);
    setConnectedAt(null);
    applyState("DISCONNECTED");
    onEventRef.current("link", "disconnected");
  }, [applyState, release]);

  const requestAudio = useCallback(async () => {
    const port = portRef.current;
    if (!port?.writable || stateRef.current !== "CONNECTED") {
      onEventRef.current("error", "connect USB before fetching audio");
      return false;
    }
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    try {
      writer = port.writable.getWriter();
      await writer.write(new TextEncoder().encode('{"cmd":"fetch_audio"}\n'));
      onEventRef.current("info", "audio snapshot requested");
      return true;
    } catch (error) {
      onEventRef.current("error", `audio request failed · ${message(error)}`);
      return false;
    } finally {
      writer?.releaseLock();
    }
  }, []);

  // Physical unplug.
  useEffect(() => {
    const serial = getSerial();
    if (!serial) return;
    const onLost = () => {
      if (!portRef.current) return;
      applyState("ERROR");
      setDevice(null);
      setConnectedAt(null);
      onEventRef.current("error", "device removed");
      void release();
    };
    serial.addEventListener("disconnect", onLost);
    return () => serial.removeEventListener("disconnect", onLost);
  }, [applyState, release]);

  // Unmount: let go of the port without touching state.
  useEffect(
    () => () => {
      void release();
    },
    [release],
  );

  return { supported, state, device, connectedAt, connect, disconnect, requestAudio };
}
