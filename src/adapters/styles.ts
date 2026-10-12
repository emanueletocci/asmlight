import type { TokenKind } from "../tokenizer/types";

/**
 * CodeMirror style names. In the editor Obsidian only colors a fixed set of
 * `.cm-<name>` classes (keyword, number, string, operator, variable-2, type,
 * builtin, comment, ...); `.cm-def`, `.cm-atom` and `.cm-meta` are NOT usable
 * (no rule, or grey), so every value here must be one Obsidian colors.
 */
export const CM_STYLE: Record<TokenKind, string> = {
  comment: "comment", label: "type", mnemonic: "keyword", directive: "operator",
  register: "variable-2", number: "number", string: "string", reloc: "builtin",
  keyword: "keyword", function: "builtin", variable: "variable-2", operator: "operator", property: "property",
};

/** Prism token classes; Obsidian themes color `.token.<name>` in Reading view. */
export const PRISM_CLASS: Record<TokenKind, string> = {
  comment: "comment", label: "function", mnemonic: "keyword", directive: "tag",
  register: "variable", number: "number", string: "string", reloc: "builtin",
  keyword: "keyword", function: "builtin", variable: "variable", operator: "operator", property: "property",
};
