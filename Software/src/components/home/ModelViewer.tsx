"use client";

import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Figure } from "@/components/ui/Figure";
import { siteConfig } from "@/lib/site-config";
import { HOME } from "./home-copy";
import { Reveal } from "./Reveal";
import { StlFrame } from "./StlFrame";

const { model } = HOME;

export function ModelViewer() {
  const stlUrl = siteConfig.assets.stlUrl;

  return (
    <Section id="prototype" className="border-t border-line bg-abyss">
      <Reveal>
        <SectionHeader
          number={model.number}
          label={model.label}
          title={model.title}
          lede={stlUrl ? model.lede : undefined}
          headingId="prototype-title"
        />
      </Reveal>

      <Reveal delay={0.06} className="mt-4">
        <Figure caption={stlUrl ? model.caption : `${model.caption} · ${model.pendingLabel}`}>
          <StlFrame />
        </Figure>
      </Reveal>

      <Reveal delay={0.1}>
        <dl className="mt-4 max-w-[720px] border-t border-line">
          {model.specs.map((s) => (
            <div key={s.label} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-4 border-b border-line py-3.5 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
              <dt className="mono-label pt-0.5 text-dim">{s.label}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px] text-white">
                <span className="font-mono text-faint">{s.value}</span>
                <span className="text-[13px] text-dim">{s.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </Section>
  );
}
