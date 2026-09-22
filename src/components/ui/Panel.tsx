import type { ReactNode } from "react";

/** The only container style on the site: 1px hairline, panel fill, 4px radius. */
export function Panel({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "section" | "aside";
}) {
  return <Tag className={`rounded-[4px] border border-line bg-panel ${className}`}>{children}</Tag>;
}
