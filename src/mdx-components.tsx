import type { MDXComponents } from "mdx/types";
import { Figure } from "@/components/ui/Figure";
import { StatusTag } from "@/components/ui/StatusTag";
import { DocH3 } from "@/components/docs/Heading";
import { DocLink } from "@/components/docs/DocLink";
import { Callout } from "@/components/docs/blocks/Callout";
import { Code } from "@/components/docs/blocks/Code";
import { Flow } from "@/components/docs/blocks/Flow";
import { KeyFacts } from "@/components/docs/blocks/KeyFacts";
import { Roadmap } from "@/components/docs/blocks/Roadmap";
import { SpecTable } from "@/components/docs/blocks/SpecTable";
import { Why } from "@/components/docs/blocks/Why";

/**
 * Components available to every MDX file, plus the prose styles for the
 * elements markdown produces. The /system content files use nothing else.
 */
const components: MDXComponents = {
  // Blocks the content files compose with.
  Callout,
  Code,
  Figure,
  Flow,
  KeyFacts,
  Roadmap,
  SpecTable,
  StatusTag,
  Why,

  // Prose.
  h2: (props) => <h2 {...props} className="mt-12 text-[24px] font-semibold leading-[1.2] tracking-[-0.015em] text-white" />,
  h3: DocH3,
  h4: (props) => <h4 {...props} className="mono-caps mt-10 text-dim" />,
  p: (props) => <p {...props} className="mt-5 text-[16px] leading-[1.7] text-silver" />,
  a: DocLink,
  ul: (props) => <ul {...props} className="doc-ul mt-5" />,
  ol: (props) => <ol {...props} className="mt-5 list-decimal space-y-2.5 pl-6 marker:font-mono marker:text-[13px] marker:text-dim" />,
  li: (props) => <li {...props} className="text-[16px] leading-[1.7] text-silver" />,
  strong: (props) => <strong {...props} className="font-medium text-white" />,
  hr: () => <hr className="my-12 h-px border-0 bg-line" />,
  blockquote: (props) => <blockquote {...props} className="my-8 border-l border-line3 pl-5 text-[16px] leading-[1.7] text-silver" />,
  code: (props) => <code {...props} className="rounded-[4px] border border-line bg-panel px-1.5 py-0.5 font-mono text-[13px] text-white" />,
  pre: (props) => (
    <pre {...props} className="my-8 overflow-x-auto rounded-[4px] border border-line bg-panel px-4 py-3.5 font-mono text-[12.5px] leading-[1.75] text-silver" />
  ),
  table: (props) => (
    <div className="my-8 overflow-x-auto">
      <table {...props} className="w-full min-w-[420px] border-collapse text-left" />
    </div>
  ),
  th: (props) => <th {...props} className="border-b border-line py-3 pr-5 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-dim" />,
  td: (props) => <td {...props} className="border-b border-line py-3 pr-5 align-top text-[14px] leading-[1.6] text-silver" />,
};

export function useMDXComponents(extra?: MDXComponents): MDXComponents {
  return { ...components, ...extra };
}
