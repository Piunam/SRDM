import type { ReactNode } from "react";

export type FigureKind = "diagram" | "photo" | "video";

/**
 * Media frame with a mono caption. With no source it renders a neutral
 * "[ asset pending ]" placeholder at the right aspect ratio — never a broken image.
 */
export function Figure({
  src,
  caption,
  kind = "photo",
  ratio = "16 / 9",
  pendingLabel,
  children,
  className = "",
}: {
  src?: string;
  caption?: string;
  kind?: FigureKind;
  ratio?: string;
  pendingLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  const hasMedia = Boolean(src || children);
  return (
    <figure className={`my-8 ${className}`}>
      <div className="overflow-hidden rounded-[4px] border border-line bg-panel" style={{ aspectRatio: children ? undefined : ratio }}>
        {children ??
          (src ? (
            kind === "video" ? (
              <video src={src} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              // Plain <img>: these are static, unoptimised assets the owner drops in.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={caption ?? ""} className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-mono text-[11px] tracking-[0.08em] text-dim">{pendingLabel ?? "[ asset pending ]"}</span>
            </div>
          ))}
      </div>
      {caption && (
        <figcaption className="mt-3 font-mono text-[11px] leading-[1.5] text-dim">
          {caption}
          {!hasMedia && <span className="ml-2 text-faint">[ asset pending ]</span>}
        </figcaption>
      )}
    </figure>
  );
}
