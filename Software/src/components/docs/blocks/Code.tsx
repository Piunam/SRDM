import { CopyButton } from "../CopyButton";
import { highlight, type CodeLang } from "./highlight";

/**
 * Highlighted code on the panel surface, with a copy button.
 * Highlighting happens on the server, so Shiki never reaches the browser.
 */
export async function Code({
  code,
  lang = "text",
  filename,
  caption,
  className = "",
}: {
  code: string;
  lang?: CodeLang;
  filename?: string;
  caption?: string;
  className?: string;
}) {
  const source = code.replace(/^\n+|\s+$/g, "");
  const html = await highlight(source, lang);

  return (
    <figure className={`doc-code my-8 ${className}`}>
      <div className="flex items-center justify-between gap-4 rounded-t-[4px] border border-line bg-deep px-3 py-2">
        <span className="font-mono text-[11px] tracking-[0.02em] text-dim">{filename ?? lang}</span>
        <CopyButton text={source} />
      </div>
      <div
        className="overflow-x-auto rounded-b-[4px] border border-t-0 border-line bg-panel px-4 py-3.5 font-mono text-[12.5px] leading-[1.75]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {caption && <figcaption className="mt-3 font-mono text-[11px] leading-[1.5] text-dim">{caption}</figcaption>}
    </figure>
  );
}
