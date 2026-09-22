import type { Metadata } from "next";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DocSection } from "@/components/docs/DocSection";
import { DOC, NAV_GROUPS, SECTIONS } from "@/content/system";
import { siteConfig } from "@/lib/site-config";
import "./system.css";

export const metadata: Metadata = {
  title: `System — ${siteConfig.name}`,
  description: DOC.description,
  openGraph: {
    title: `System — ${siteConfig.name}`,
    description: DOC.description,
    type: "article",
    images: [{ url: DOC.ogImage, width: 1200, height: 630, alt: `System documentation — ${siteConfig.name}` }],
  },
};

const ref = (index: number) => {
  const section = SECTIONS[index];
  return section ? { id: section.id, number: section.number, title: section.title } : undefined;
};

export default function SystemPage() {
  return (
    <>
      <main className="pt-14">
        <DocsLayout
          groups={NAV_GROUPS}
        intro={
          <header className="pb-10 pt-14 lg:pb-16 lg:pt-20">
            <p className="mono-caps text-dim">{DOC.eyebrow}</p>
            <h1 className="h2-display mt-4 text-white">{DOC.title}</h1>
            <p className="mt-5 max-w-[60ch] text-[18px] leading-[1.6] text-silver">{DOC.lede}</p>
            <p className="mt-6 font-mono text-[11px] tracking-[0.02em] text-faint tabular-nums">{DOC.meta}</p>
          </header>
        }
      >
        {SECTIONS.map((section, index) => (
          <DocSection key={section.id} section={section} first={index === 0} prev={ref(index - 1)} next={ref(index + 1)} />
        ))}
      </DocsLayout>
      </main>
      {/* layout.tsx is frozen, so the footer is rendered per page. See NOTES.md. */}
      <SiteFooter />
    </>
  );
}
