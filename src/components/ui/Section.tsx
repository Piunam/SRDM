import type { ReactNode } from "react";

/** Page section wrapper: 1280px container, 80/20px margins, 120/72px rhythm. */
export function Section({
  id,
  children,
  className = "",
  as: Tag = "section",
  ariaLabel,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "footer";
  ariaLabel?: string;
}) {
  return (
    <Tag id={id} aria-label={ariaLabel} className={`px-5 py-[72px] md:px-20 md:py-[120px] ${className}`}>
      <div className="mx-auto w-full max-w-[1280px]">{children}</div>
    </Tag>
  );
}
