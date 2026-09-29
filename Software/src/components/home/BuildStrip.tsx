import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusTag } from "@/components/ui/StatusTag";
import { HOME } from "./home-copy";
import { Reveal } from "./Reveal";

const { build } = HOME;

/** Three doors into /system. Hover moves the arrow and lights the border; nothing else. */
export function BuildStrip() {
  return (
    <Section id="build" className="border-t border-line bg-abyss">
      <Reveal>
        <SectionHeader
          number={build.number}
          label={build.label}
          title={build.title}
          headingId="build-title"
        />
      </Reveal>

      <ul className="mt-12 grid gap-4 md:grid-cols-3">
        {build.cards.map((card, i) => (
          <Reveal as="li" key={card.num} delay={i * 0.06}>
            <Link
              href={card.href}
              className="group flex h-full flex-col rounded-[4px] border border-line bg-panel p-6 transition-colors duration-200 hover:border-cy focus-visible:border-cy focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy"
            >
              <span className="mono-label text-cy">{card.num}</span>
              <span className="mt-3 text-[20px] font-medium tracking-[-0.01em] text-white">
                {card.title}
              </span>
              <span className="mt-2 text-[15px] leading-[1.6] text-silver">
                {card.body}
              </span>
              <span className="mt-8 flex items-center justify-between">
                <StatusTag status={card.status} />
                <span
                  aria-hidden="true"
                  className="font-mono text-[14px] text-dim transition-transform duration-200 group-hover:translate-x-[3px] group-focus-visible:translate-x-[3px]"
                >
                  →
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
