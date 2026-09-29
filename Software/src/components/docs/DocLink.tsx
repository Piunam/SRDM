import Link from "next/link";
import type { ReactNode } from "react";
import { AnchorLink } from "./AnchorLink";

const STYLE =
  "text-cy underline decoration-1 underline-offset-[3px] transition-colors duration-200 hover:text-cy2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-cy";

/** Link inside MDX: in-page anchors scroll smoothly, internal routes prefetch, the rest is plain. */
export function DocLink({ href = "", children }: { href?: string; children?: ReactNode }) {
  if (href.startsWith("#")) {
    return (
      <AnchorLink targetId={href.slice(1)} className={STYLE}>
        {children}
      </AnchorLink>
    );
  }
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={STYLE}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={STYLE}>
      {children}
    </a>
  );
}
