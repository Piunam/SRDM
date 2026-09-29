import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `404 · ${siteConfig.name}`,
  description: "That page does not exist.",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center bg-abyss px-5 pb-20 pt-[calc(56px+80px)] md:px-20">
      <div className="mx-auto w-full max-w-[1280px]">
        <p className="mono-caps text-cy">404</p>
        <h1 className="h2-display mt-4 max-w-[18ch] text-white">No signal at this address.</h1>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-silver">
          The page you asked for isn&apos;t part of this build. The routes below are.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/" variant="primary" size="md">
            Home
          </ButtonLink>
          {siteConfig.nav.map((item) => (
            <ButtonLink key={item.href} href={item.href} variant="ghost" size="md">
              {item.label}
            </ButtonLink>
          ))}
        </div>

        <p className="mono-label mt-12 border-t border-line pt-5 text-faint">
          If you followed a link from inside the site, it is a bug —{" "}
          <Link href="/system" className="text-dim underline decoration-1 underline-offset-4 hover:text-cy">
            check the system documentation
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
