import { describeDevicetree } from "../docs/devicetree";
import type { Language, Parser, TokenKind } from "../tokenizer/types";

const PREPROC = /^#\s*(?:include|define|undef|ifdef|ifndef|if|elif|else|endif|error|pragma)\b/;
const KEYWORD = /^\/(?:dts-v1|plugin|include|delete-node|delete-property|memreserve|bits|omit-if-no-ref)\//;
const NUMBER = /^(?:0x[0-9a-f]+|\d+)(?:ull|ul|ll|u|l)?\b/i;

interface DtsState {
  inBlockComment: boolean;
  stmtStart: boolean;    // next word names a node or property
  inBytes: boolean;      // inside a [de ad be ef] bytestring
}

export function makeDevicetreeParser(): Parser<DtsState> {
  return {
    startState: () => ({ inBlockComment: false, stmtStart: true, inBytes: false }),
    copyState: (s) => ({ ...s }),
    token(stream, s): TokenKind | null {
      if (s.inBlockComment) {
        if (stream.match(/^.*?\*\//)) s.inBlockComment = false;
        else stream.skipToEnd();
        return "comment";
      }
      if (stream.eatSpace()) return null;

      if (stream.match("/*")) {
        if (!stream.match(/^.*?\*\//)) { s.inBlockComment = true; stream.skipToEnd(); }
        return "comment";
      }
      if (stream.match("//")) { stream.skipToEnd(); return "comment"; }
      // `#address-cells` is a property; only real preprocessor words are directives.
      if (s.stmtStart && stream.match(PREPROC)) { stream.skipToEnd(); return "directive"; }
      if (stream.match(KEYWORD)) {
        if (stream.current() === "/memreserve/") s.stmtStart = false;
        return "keyword";
      }
      if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return "string";
      if (stream.match(/^'(?:[^'\\]|\\.)'?/)) return "string";
      if (stream.match(/^&\{[^}]*\}?/) || stream.match(/^&[a-z_]\w*/i)) { s.stmtStart = false; return "label"; }

      if (s.inBytes) {
        if (stream.match("]")) s.inBytes = false;
        else if (stream.match(/^[0-9a-f]{2}/i)) return "number";
        else stream.next();
        return null;
      }

      if (s.stmtStart) {
        if (stream.match(/^[a-z_]\w*:(?!:)/i)) return "label";
        if (stream.match(/^\/(?=\s*\{)/)) { s.stmtStart = false; return "function"; }
        if (stream.match(/^[a-z0-9#,._+?-]+/i)) {
          s.stmtStart = false;
          return stream.peek() === "@" || stream.match(/^\s*\{/, false) ? "function" : "property";
        }
      }
      if (stream.match(/^@[\w,.:+-]*/)) return "number";        // unit address

      if (stream.match(NUMBER)) return "number";
      if (stream.match(/^[A-Z_][A-Z0-9_]*\b/)) return "variable";    // dt-bindings macro
      if (stream.match(/^\w[\w.-]*/)) return null;

      const ch = stream.next();
      if (ch === "{" || ch === "}" || ch === ";") s.stmtStart = true;
      else if (ch === "[") s.inBytes = true;
      return null;
    },
  };
}

export const DEVICETREE: Language = {
  id: "dts",
  name: "Devicetree",
  aliases: ["dtsi", "devicetree", "device-tree"],
  makeParser: makeDevicetreeParser,
  lineComment: "//",
  blockComment: ["/*", "*/"],
  describe: describeDevicetree,
};
