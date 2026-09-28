import type { ReactNode } from "react";

/**
 * The page's signature block: why a component or approach was chosen.
 * Every build section carries at least one.
 */
export function Why({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <aside className={`my-8 border-l-2 border-cy pl-5 ${className}`}>
      <p className="mono-caps text-cy">Why</p>
      <div className="mt-2 text-[16px] leading-[1.7] text-silver">{children}</div>
    </aside>
  );
}
