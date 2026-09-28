"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function SystemError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="pt-14">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-24 md:px-6 lg:px-8">
        <p className="mono-caps text-fault">Error</p>
        <h1 className="h2-display mt-4 text-white">The documentation failed to render</h1>
        <p className="mt-5 max-w-[60ch] text-[16px] leading-[1.7] text-silver">
          Nothing was lost — this page is static content. Try again, and if it keeps failing the section files are the
          place to look.
        </p>
        {error.digest && <p className="mt-4 font-mono text-[11px] text-faint">digest {error.digest}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/">Back to the home page</ButtonLink>
        </div>
      </div>
    </main>
  );
}
