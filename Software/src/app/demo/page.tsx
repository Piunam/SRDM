import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DemoShell } from "@/components/demo/DemoShell";
import { DemoSkeleton } from "@/components/demo/PanelSkeleton";
import { siteConfig } from "@/lib/site-config";

const description =
  "Choose an input SNR and compare the noisy recording directly with the processed output.";

export const metadata: Metadata = {
  title: `Demo · ${siteConfig.name}`,
  description,
  openGraph: {
    title: `Demo · ${siteConfig.name}`,
    description,
    // TODO(owner): drop a 1200×630 card at public/og/demo.png.
    images: [{ url: "/og/demo.png", width: 1200, height: 630, alt: "Noisy input against enhanced output" }],
  },
};

export default function DemoPage() {
  return (
    <>
      <main className="px-5 pb-[96px] pt-[96px] md:px-20 md:pb-[120px] md:pt-[120px]">
      <div className="mx-auto w-full max-w-[1280px]">
        <SectionHeader
          label="DEMO · BEFORE AND AFTER"
          title="Hear the difference"
          lede="Choose one of seven input levels, then compare the noisy signal with the clean output."
          className="mb-12 md:mb-16"
        />
        <Suspense fallback={<DemoSkeleton />}>
          <DemoShell />
        </Suspense>
      </div>
      </main>
      {/* layout.tsx is frozen, so the footer is rendered per page. See NOTES.md. */}
      <SiteFooter />
    </>
  );
}
