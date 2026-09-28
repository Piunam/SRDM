import type { ReactNode } from "react";
import { CopyLink } from "./CopyLink";

/** Flattens MDX heading children to plain text so it can be slugged. */
function toText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in node) {
    return toText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** h3 inside a section: anchored, with a `#` link that appears on hover. */
export function DocH3({ children, id }: { children?: ReactNode; id?: string }) {
  const text = toText(children);
  const headingId = id ?? slug(text);
  return (
    <h3 id={headingId} className="group/h mt-12 flex items-baseline gap-2 text-[20px] font-medium leading-[1.35] text-white">
      <span data-doc-text>{children}</span>
      <CopyLink targetId={headingId} label={text} />
    </h3>
  );
}
