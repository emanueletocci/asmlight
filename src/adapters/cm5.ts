import { makeParser } from "../tokenizer/parser";
import type { AsmState, IsaSpec, Stream } from "../tokenizer/types";
import { CM_STYLE } from "./styles";

export function toCm5Mode(isa: IsaSpec) {
  const parser = makeParser(isa);
  return {
    name: isa.id,
    startState: parser.startState,
    copyState: parser.copyState,
    token(stream: Stream, state: AsmState): string | null {
      const kind = parser.token(stream, state);
      return kind ? `${CM_STYLE[kind]} asmligh-${kind}` : null;
    },
    lineComment: isa.lineComments[0],
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
  };
}
