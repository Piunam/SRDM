"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function DemoError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="px-5 pb-[96px] pt-[96px] md:px-20 md:pb-[120px] md:pt-[120px]">
      <div className="mx-auto w-full max-w-[720px]">
        <Panel className="p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fault">ERROR</p>
          <h1 className="mt-4 text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-0.015em] text-white">
            The demo panels failed to load
          </h1>
          <p className="mt-4 max-w-[52ch] text-[17px] leading-[1.55] text-silver">
            Nothing was lost. Retry the panel, or go back and pick a clip again.
          </p>
          <p className="mt-4 font-mono text-[11px] leading-[1.6] text-faint">
            {error.message || "unknown error"}
            {error.digest && ` · ${error.digest}`}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" onClick={reset}>
              RETRY
            </Button>
            <ButtonLink href="/demo?panel=evidence">BACK TO EVIDENCE</ButtonLink>
          </div>
        </Panel>
      </div>
    </main>
  );
}
