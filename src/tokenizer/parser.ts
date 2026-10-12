import { isRegister } from "../isa/common";
import type { AsmParser, AsmState, IsaSpec, Language, Stream, TokenKind } from "./types";

const NUMBER = /^-?(?:0x[0-9a-f]+|0b[01]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/i;
const PREPROC = /^#(?:include|define|undef|if|ifdef|ifndef|elif|else|endif)\b/;

export function makeParser(isa: IsaSpec): AsmParser {
  return {
    startState: () => ({ inBlockComment: false, sawMnemonic: false }),
    copyState: (s: AsmState) => ({ ...s }),
    token(stream: Stream, state: AsmState): TokenKind | null {
      if (stream.sol()) state.sawMnemonic = false;

      if (state.inBlockComment) {
        if (stream.match(/^.*?\*\//)) state.inBlockComment = false;
        else stream.skipToEnd();
        return "comment";
      }
      if (stream.eatSpace()) return null;

      if (stream.match("/*")) {
        if (!stream.match(/^.*?\*\//)) { state.inBlockComment = true; stream.skipToEnd(); }
        return "comment";
      }
      if (!state.sawMnemonic && stream.match(PREPROC)) { stream.skipToEnd(); return "directive"; }
      for (const c of isa.lineComments) {
        if (stream.match(c)) { stream.skipToEnd(); return "comment"; }
      }
      if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return "string";
      if (stream.match(/^%[a-z_]+(?=\()/i)) return "reloc";        // RISC-V %hi(sym)
      if (stream.match(/^:[a-z_0-9]+:/i)) return "reloc";          // ARM :lo12:sym, :lower16:sym
      if (isa.hashIsImmediate && stream.match("#")) { stream.match(NUMBER); return "number"; }
      if (!state.sawMnemonic && stream.match(/^\d+:/)) return "label";
      if (stream.match(/^\d+[fb]\b/i)) return "label";             // 1f / 1b
      if (stream.match(NUMBER)) return "number";

      if (stream.match(/^[.a-z_$][\w.$]*/i)) {
        const word = stream.current().toLowerCase();
        if (!state.sawMnemonic && stream.match(":")) return "label";
        if (word.startsWith(".")) { state.sawMnemonic = true; return "directive"; }
        if (!state.sawMnemonic) {
          state.sawMnemonic = true;
          return isa.isMnemonic(word) ? "mnemonic" : null;
        }
        return isRegister(isa.registers, word) ? "register" : null;
      }

      stream.next();
      return null;
    },
  };
}

export function asmLanguage(isa: IsaSpec): Language {
  return {
    id: isa.id,
    aliases: isa.aliases,
    makeParser: () => makeParser(isa),
    lineComment: isa.lineComments[0],
    blockComment: ["/*", "*/"],
    describe: isa.describe,
  };
}
