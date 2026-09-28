"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

const focusRing =
  " focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-cy";

/**
 * The /live gate. It posts to the route handler, which is the only place the
 * credentials exist; nothing is compared here. Attempts are limited in client
 * state, which slows a person down and nothing else.
 */
export function LockScreen({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [accessId, setAccessId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const attemptsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!shaking) return;
    const id = window.setTimeout(() => setShaking(false), 300);
    return () => window.clearTimeout(id);
  }, [shaking]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const deny = (reason: string) => {
    setError(reason);
    setShaking(true);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown > 0) return;

    const now = Date.now();
    const recent = attemptsRef.current.filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_ATTEMPTS) {
      attemptsRef.current = recent;
      setCooldown(
        Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)),
      );
      deny("Too many attempts");
      return;
    }
    attemptsRef.current = [...recent, now];

    setBusy(true);
    try {
      const response = await fetch("/api/live/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessId, passphrase }),
      });
      if (response.ok) {
        setError(null);
        setPassphrase("");
        router.refresh(); // the server component re-runs and reads the cookie
        return;
      }
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      // Which field was wrong is never disclosed.
      deny(
        response.status === 503
          ? (data?.error ?? "Live access is not configured")
          : "Access denied",
      );
    } catch {
      deny("Network error");
    } finally {
      setBusy(false);
    }
  }

  const blocked = cooldown > 0;

  return (
    <div className="flex min-h-[100svh] items-center justify-center px-5 pb-10 pt-14">
      <Panel
        className={`w-full max-w-[420px] p-6 md:p-8 ${shaking ? "live-shake" : ""}`}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cy">
          RESTRICTED
        </p>
        <h1 className="mt-4 text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-0.015em] text-white">
          Live hardware session
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-silver">
          Connect the prototype over USB and run the chain on live audio.
        </p>

        <form onSubmit={submit} className="mt-7 flex flex-col gap-4" noValidate>
          <Field label="Access ID">
            {({ id, className }) => (
              <input
                id={id}
                type="text"
                name="live-access-id"
                value={accessId}
                onChange={(e) => setAccessId(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                aria-invalid={error !== null}
                className={className + focusRing}
              />
            )}
          </Field>

          <Field label="Passphrase">
            {({ id, className }) => (
              <input
                id={id}
                type="password"
                name="live-passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoComplete="current-password"
                required
                aria-invalid={error !== null}
                className={className + focusRing}
              />
            )}
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={busy || blocked}
            className="mt-1 w-full"
          >
            {busy ? "CHECKING…" : "UNLOCK"}
          </Button>
        </form>

        <p
          role="status"
          aria-live="polite"
          className="mt-4 min-h-[16px] font-mono text-[11px] text-fault"
        >
          {error && (blocked ? `${error} · retry in ${cooldown}s` : error)}
        </p>

        {!configured && (
          <p className="mt-2 font-mono text-[11px] leading-[1.5] text-amber">
            LIVE_ACCESS_ID and LIVE_PASSPHRASE are unset on this server. See
            .env.example.
          </p>
        )}

        <p className="mt-6 border-t border-line pt-4 font-mono text-[10px] leading-[1.6] text-faint">
          Demonstration gate. One shared credential, an 8-hour cookie, no
          accounts and no audit trail. Not a security boundary.
        </p>
      </Panel>
    </div>
  );
}
