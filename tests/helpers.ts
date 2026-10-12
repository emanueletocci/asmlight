import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import type { IsaSpec, TokenKind } from "../src/tokenizer/types";

export function kinds(src: string, isa: IsaSpec, line = 0): Array<[string, TokenKind]> {
  return tokenizeLines(src, isa)[line]
    .filter((t) => t.kind !== null)
    .map((t) => [t.text, t.kind as TokenKind]);
}
