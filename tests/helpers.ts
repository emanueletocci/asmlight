import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { asmLanguage } from "../src/tokenizer/parser";
import type { IsaSpec, Language, TokenKind } from "../src/tokenizer/types";

export function kinds(src: string, lang: IsaSpec | Language, line = 0): Array<[string, TokenKind]> {
  return tokenizeLines(src, "makeParser" in lang ? lang : asmLanguage(lang))[line]
    .filter((t) => t.kind !== null)
    .map((t) => [t.text, t.kind as TokenKind]);
}
