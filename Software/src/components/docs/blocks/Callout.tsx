import type { ReactNode } from "react";

export type CalloutTone = "note" | "limit";

// `limit` is reserved for honest limitations, and is the only amber on the page.
const TONE: Record<CalloutTone, { border: string; label: string; text: string }> = {
  note: { border: "border-line3", label: "Note", text: "text-dim" },
  limit: { border: "border-amber", label: "Limit", text: "text-amber" },
};

export function Callout({
  tone = "note",
  children,
  className = "",
}: {
  tone?: CalloutTone;
  children: ReactNode;
  className?: string;
}) {
  const style = TONE[tone];
  return (
    <aside className={`my-8 border-l-2 pl-5 ${style.border} ${className}`}>
      <p className={`mono-caps ${style.text}`}>{style.label}</p>
      <div className="mt-2 text-[16px] leading-[1.7] text-silver">{children}</div>
    </aside>
  );
}
