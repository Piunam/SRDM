import { DemoSkeleton } from "@/components/demo/PanelSkeleton";

export default function DemoLoading() {
  return (
    <main className="px-5 pb-[96px] pt-[96px] md:px-20 md:pb-[120px] md:pt-[120px]">
      <div className="mx-auto w-full max-w-[1280px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">DEMO · BEFORE AND AFTER</p>
        <div className="mb-12 mt-4 h-10 w-[min(420px,80%)] rounded-[2px] bg-line md:mb-16" aria-hidden="true" />
        <DemoSkeleton />
        <p className="sr-only">Loading the demo panels.</p>
      </div>
    </main>
  );
}
