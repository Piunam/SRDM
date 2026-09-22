import { HeroScene } from "@/components/hero/HeroScene";
import { MetricsStrip } from "@/components/home/MetricsStrip";
import { Problem } from "@/components/home/Problem";
import { Pipeline } from "@/components/home/Pipeline";
import { ModelViewer } from "@/components/home/ModelViewer";
import { DemoVideo } from "@/components/home/DemoVideo";
import { BuildStrip } from "@/components/home/BuildStrip";
import { ClosingBand } from "@/components/home/ClosingBand";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function Home() {
  return (
    <main>
      <HeroScene />
      {/* Hand-off: the metrics strip section attaches here. */}
      <div className="h-px w-full bg-line" />
      <MetricsStrip />
      <Problem />
      <Pipeline />
      <ModelViewer />
      <DemoVideo />
      <BuildStrip />
      <ClosingBand />
      {/* layout.tsx is frozen, so the footer is rendered per page. See NOTES.md. */}
      <SiteFooter />
    </main>
  );
}
