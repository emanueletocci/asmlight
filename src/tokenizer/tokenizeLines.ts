import { StringStream } from "@codemirror/language";
import type { Language, TokenKind } from "./types";

export interface Token {
  text: string;
  kind: TokenKind | null;
  lang: string;               // language id for hover docs; usually the block's
}

export function tokenizeLines(text: string, lang: Language): Token[][] {
  const parser = lang.makeParser();
  const state = parser.startState();
  return text.split("\n").map((line) => {
    const tokens: Token[] = [];
    const stream = new StringStream(line, 4, 2);
    while (!stream.eol()) {
      const kind = parser.token(stream, state);
      if (stream.pos === stream.start) {
        throw new Error(`asmlight: tokenizer made no progress at ${JSON.stringify(line.slice(stream.pos))}`);
      }
      tokens.push({ text: stream.current(), kind, lang: parser.tokenLang?.(state) ?? lang.id });
      stream.start = stream.pos;
    }
    return tokens;
  });
}
