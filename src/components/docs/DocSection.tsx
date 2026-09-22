import { SectionHeader } from "@/components/ui/SectionHeader";
import type { DocSectionMeta } from "@/content/system";
import { CopyLink } from "./CopyLink";
import { Reveal } from "./Reveal";
import { SectionNav, type SectionRef } from "./SectionNav";

/** One documentation section: anchored heading, MDX body, neighbours. */
export function DocSection({
  section,
  prev,
  next,
  first = false,
}: {
  section: DocSectionMeta;
  prev?: SectionRef;
  next?: SectionRef;
  first?: boolean;
}) {
  const Body = section.Body;

  return (
    <Reveal className={first ? "" : "border-t border-line2 pt-16"}>
      <section
        data-doc-section={section.id}
        data-doc-first={first || undefined}
        aria-labelledby={section.id}
        className="doc-section pb-20"
      >
        <div className="group/h relative">
          <SectionHeader
            size="doc"
            number={section.number}
            label={section.group}
            title={section.title}
            lede={section.lede}
            status={section.status}
            headingId={section.id}
          />
          <CopyLink targetId={section.id} label={section.title} className="absolute right-0 top-0" />
        </div>
        <div className="doc-prose mt-8">
          <Body />
        </div>
        <SectionNav prev={prev} next={next} />
      </section>
    </Reveal>
  );
}
