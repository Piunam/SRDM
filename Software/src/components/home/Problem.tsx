import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HOME } from "./home-copy";
import { Reveal } from "./Reveal";

const { problem } = HOME;

/** Header left, three numbered blocks right. No image. */
export function Problem() {
  return (
    <Section id="problem" className="border-t border-line bg-abyss">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <Reveal>
          <SectionHeader
            number={problem.number}
            label={problem.label}
            title={problem.title}
            headingId="problem-title"
            className="lg:sticky lg:top-[88px]"
          />
        </Reveal>

        <ul className="flex flex-col">
          {problem.blocks.map((b, i) => (
            <Reveal as="li" key={b.num} delay={i * 0.06} className="border-t border-line py-7 first:border-t-0 first:pt-0 lg:py-8">
              <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-5 md:grid-cols-[48px_minmax(0,1fr)]">
                <span className="mono-label pt-1 text-cy">{b.num}</span>
                <div>
                  <h3 className="text-[19px] font-medium tracking-[-0.01em] text-white md:text-[21px]">{b.title}</h3>
                  <p className="mt-2 max-w-[52ch] text-[16px] leading-[1.65] text-silver">{b.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
