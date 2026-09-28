import { AnchorLink } from "./AnchorLink";

export type SectionRef = { id: string; number: string; title: string };

const LINK =
  "group/nav flex min-w-0 flex-col gap-1 rounded-[4px] py-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-cy";

/** Hairline row at the foot of a section, linking to its neighbours. */
export function SectionNav({ prev, next }: { prev?: SectionRef; next?: SectionRef }) {
  if (!prev && !next) return null;

  return (
    <nav aria-label="Previous and next section" data-print-hide className="mt-14 flex items-start justify-between gap-6 border-t border-line pt-4">
      {prev ? (
        <AnchorLink targetId={prev.id} className={LINK}>
          <span className="mono-caps text-dim">Previous</span>
          <span className="flex items-baseline gap-2 text-[14px] text-silver transition-colors duration-200 group-hover/nav:text-white">
            <span aria-hidden="true">←</span>
            <span className="font-mono text-[11px] text-dim tabular-nums">{prev.number}</span>
            <span className="truncate">{prev.title}</span>
          </span>
        </AnchorLink>
      ) : (
        <span />
      )}
      {next ? (
        <AnchorLink targetId={next.id} className={`${LINK} text-right`}>
          <span className="mono-caps text-dim">Next</span>
          <span className="flex items-baseline justify-end gap-2 text-[14px] text-silver transition-colors duration-200 group-hover/nav:text-white">
            <span className="font-mono text-[11px] text-dim tabular-nums">{next.number}</span>
            <span className="truncate">{next.title}</span>
            <span aria-hidden="true">→</span>
          </span>
        </AnchorLink>
      ) : (
        <span />
      )}
    </nav>
  );
}
