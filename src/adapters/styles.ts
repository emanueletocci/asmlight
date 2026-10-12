import type { TokenKind } from "../tokenizer/types";

/** CodeMirror style names; Obsidian themes color `.cm-<name>`. */
export const CM_STYLE: Record<TokenKind, string> = {
  comment: "comment", label: "def", mnemonic: "keyword", directive: "meta",
  register: "variable-2", number: "number", string: "string", reloc: "atom",
};

/** Prism token classes; Obsidian themes color `.token.<name>` in Reading view. */
export const PRISM_CLASS: Record<TokenKind, string> = {
  comment: "comment", label: "function", mnemonic: "keyword", directive: "builtin",
  register: "variable", number: "number", string: "string", reloc: "operator",
};
