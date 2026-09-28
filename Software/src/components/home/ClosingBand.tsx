import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { HOME } from "./home-copy";
import { Reveal } from "./Reveal";

const { closing } = HOME;

/** One line, two ways out. No form, no newsletter. */
export function ClosingBand() {
  return (
    <Section
      id="closing"
      ariaLabel="Closing"
      className="border-t border-line bg-deep"
    >
      <Reveal>
        <p className="h2-display max-w-[20ch] text-white">{closing.line}</p>
        <nav aria-label="Closing" className="mt-10 flex flex-wrap gap-3">
          {closing.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group inline-flex h-10 items-center gap-2 rounded-[4px] border border-line3 px-4 font-mono text-[12px] tracking-[0.02em] text-white transition-colors duration-200 hover:border-cy hover:text-cy focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy"
            >
              {l.label}
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-[3px]"
              >
                →
              </span>
            </Link>
          ))}
        </nav>
      </Reveal>
    </Section>
  );
}
