import { StatusTag, type Status } from "./StatusTag";

/**
 * Section heading used by the home page sections and the /system doc sections.
 * `size="doc"` is the larger 36px variant used inside the documentation.
 */
export function SectionHeader({
  number,
  label,
  title,
  lede,
  status,
  size = "page",
  headingId,
  className = "",
}: {
  number?: string;
  label?: string;
  title: string;
  lede?: string;
  status?: Status;
  size?: "page" | "doc";
  headingId?: string;
  className?: string;
}) {
  return (
    <header className={className}>
      {(number || label) && (
        <p className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
          {number && <span className="text-cy">{number}</span>}
          {label && <span className="text-dim">{label}</span>}
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2
          id={headingId}
          className={`font-semibold tracking-[-0.015em] text-white ${
            size === "doc" ? "text-[clamp(28px,3vw,36px)] leading-[1.1]" : "text-[clamp(28px,3.4vw,44px)] leading-[1.06]"
          }`}
        >
          {title}
        </h2>
        {status && <StatusTag status={status} />}
      </div>
      {lede && <p className="mt-4 max-w-[60ch] text-[18px] leading-[1.6] text-silver">{lede}</p>}
    </header>
  );
}
