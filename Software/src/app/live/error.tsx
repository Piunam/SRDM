"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";

export default function LiveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-abyss">
      <Section className="pt-20 pb-24 md:pt-24 md:pb-28">
        <Panel className="max-w-[560px] p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fault">
            Session error
          </p>
          <h1 className="mt-4 text-[clamp(22px,2.6vw,28px)] font-semibold leading-[1.15] tracking-[-0.015em] text-white">
            The live session stopped
          </h1>
          <p className="mt-3 font-mono text-[12px] leading-[1.6] text-silver">
            {error.message || "Unknown error."}
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-faint">
              digest {error.digest}
            </p>
          )}
          <div className="mt-6">
            <Button size="sm" variant="primary" onClick={reset}>
              RETRY
            </Button>
          </div>
        </Panel>
      </Section>
    </main>
  );
}
