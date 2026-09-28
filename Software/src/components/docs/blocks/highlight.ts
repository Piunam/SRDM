// Server-side only: Shiki must never reach the client bundle.
import { createHighlighter, createJavaScriptRegexEngine, type Highlighter } from "shiki";
import { codeTheme } from "./code-theme";

export const CODE_LANGS = ["c", "bash", "python", "json"] as const;
export type CodeLang = (typeof CODE_LANGS)[number] | "text";

let highlighter: Promise<Highlighter> | null = null;

// One highlighter per server process. The JavaScript regex engine is used so no
// WASM has to be shipped or instantiated during rendering.
const getHighlighter = () =>
  (highlighter ??= createHighlighter({
    themes: [codeTheme],
    langs: [...CODE_LANGS],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }));

export async function highlight(code: string, lang: CodeLang): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, { lang, theme: "instrument-dark" });
}
