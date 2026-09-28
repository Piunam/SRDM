import type { ReactNode } from "react";

/** Static wrapper: documentation should render immediately without animation JS. */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
