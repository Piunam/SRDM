import type { ThemeRegistrationRaw } from "shiki";

/**
 * Muted dark theme built from the site tokens: greys carry the code, and teal is
 * the only accent, so highlighted code obeys the same one-accent rule as the page.
 */
export const codeTheme: ThemeRegistrationRaw = {
  name: "instrument-dark",
  type: "dark",
  colors: {
    "editor.background": "transparent",
    "editor.foreground": "#9FB0BF",
  },
  settings: [
    { settings: { foreground: "#9FB0BF" } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#4A5A68", fontStyle: "italic" } },
    {
      scope: ["keyword", "keyword.control", "storage", "storage.type", "storage.modifier", "keyword.operator.new"],
      settings: { foreground: "#2DD4C8" },
    },
    { scope: ["string", "string.quoted", "constant.character"], settings: { foreground: "#EAF1F6" } },
    { scope: ["constant.numeric", "constant.language", "constant.other"], settings: { foreground: "#EAF1F6" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#EAF1F6" } },
    { scope: ["entity.name.type", "support.type", "entity.name.tag"], settings: { foreground: "#6D7E8C" } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: "#6D7E8C" } },
    { scope: ["variable", "variable.parameter", "meta.definition.variable"], settings: { foreground: "#9FB0BF" } },
  ],
};
