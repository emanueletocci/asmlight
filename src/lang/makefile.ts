import { describeMake } from "../docs/make";
import { words } from "../isa/common";
import type { Language, Parser, Stream, TokenKind } from "../tokenizer/types";

const DIRECTIVES = new Set(words(`
  include -include sinclude define endef undefine ifdef ifndef ifeq ifneq else endif
  export unexport override private vpath
`));

const FUNCTIONS = new Set(words(`
  subst patsubst strip findstring filter filter-out sort word wordlist words firstword lastword
  dir notdir suffix basename addsuffix addprefix join wildcard realpath abspath
  error warning info shell origin flavor foreach if or and intcmp call eval file value let guile
`));

const SPECIAL_TARGETS = new Set(words(`
  .PHONY .SUFFIXES .DEFAULT .PRECIOUS .INTERMEDIATE .NOTINTERMEDIATE .SECONDARY .SECONDEXPANSION
  .DELETE_ON_ERROR .IGNORE .LOW_RESOLUTION_TIME .SILENT .EXPORT_ALL_VARIABLES .NOTPARALLEL
  .ONESHELL .POSIX .WAIT
`));

/** `[export|override|private] NAME op`, where op is one of = := ::= :::= += ?= != */
const ASSIGN = /^(?:(?:export|override|private|unexport)\s+)*[^\s:#=+?!$]+\s*(?::{1,3}|[+?!])?=/;
const ASSIGN_OP = /^(?::{1,3}|[+?!])?=/;
const ODD_TRAILING_BACKSLASH = /(?:^|[^\\])(?:\\\\)*\\$/;

type Mode = "rule" | "assign" | "recipe" | "define" | "other";

interface MakeState {
  mode: Mode;
  pastOp: boolean;      // past the rule's `:` or the assignment operator
  depth: number;        // open `$(` / `${` on this logical line
  inRule: boolean;      // indented lines after a rule are its recipe
  inDefine: boolean;    // inside define ... endef
  continues: boolean;   // current line ends with a backslash
  lineStart: boolean;   // nothing but whitespace seen yet on this line
}

/** Removes `$(...)`/`${...}` so their `:` and `=` don't decide what the line is. */
function stripRefs(line: string): string {
  let prev;
  do { prev = line; line = line.replace(/\$[({][^$(){}]*[)}]/g, "x"); } while (line !== prev);
  return line;
}

function startLine(line: string, s: MakeState): void {
  const continued = s.continues;
  s.continues = ODD_TRAILING_BACKSLASH.test(line);
  s.lineStart = !continued;
  if (continued && s.mode !== "define") return;

  s.pastOp = false;
  s.depth = 0;
  if (s.inDefine) {
    if (/^\s*endef\b/.test(line)) { s.inDefine = false; s.mode = "other"; } else s.mode = "define";
    return;
  }

  const trimmed = line.replace(/^\s+/, "");
  const first = /^[-\w]+/.exec(trimmed)?.[0] ?? "";
  const isDirective = DIRECTIVES.has(first) && /^(?:\s|\(|$)/.test(trimmed.slice(first.length));

  if (!trimmed || trimmed.startsWith("#")) { s.mode = "other"; return; }
  // Make wants a tab here, but notes often have spaces; any indent after a rule counts.
  if (s.inRule && trimmed !== line && !isDirective) { s.mode = "recipe"; return; }
  if (ASSIGN.test(trimmed)) { s.mode = "assign"; s.inRule = false; return; }
  if (first === "define") { s.mode = "assign"; s.inDefine = true; s.inRule = false; return; }
  if (isDirective) { s.mode = "other"; return; }
  if (/^[^#=]*:(?!=)/.test(stripRefs(trimmed))) { s.mode = "rule"; s.inRule = true; return; }
  s.mode = "other";
  s.inRule = false;
}

function reference(stream: Stream, s: MakeState): TokenKind | null {
  const fn = stream.match(/^\$[({]([a-z-]+)(?=\s)/, false) as RegExpMatchArray | null;
  if (fn && FUNCTIONS.has(fn[1])) { stream.match(fn[0]); s.depth++; return "function"; }
  if (stream.match(/^\$[({][^\s$(){}:=#]*/)) {
    if (!stream.match(/^[)}]/)) s.depth++;
    return "variable";
  }
  if (stream.match(/^\$\$[a-z_]\w*/i) || stream.match(/^\$[^\s]/)) return "variable";
  stream.next();
  return null;
}

export function makeMakefileParser(): Parser<MakeState> {
  return {
    startState: () => ({
      mode: "other", pastOp: false, depth: 0, inRule: false, inDefine: false, continues: false, lineStart: true,
    }),
    copyState: (s) => ({ ...s }),
    token(stream, s) {
      if (stream.sol()) startLine(stream.string, s);
      if (stream.eatSpace()) return null;
      const lineStart = s.lineStart;
      s.lineStart = false;

      if (stream.peek() === "$") return reference(stream, s);
      if (stream.match(/^\\./)) return null;
      if (s.depth > 0) {
        if (stream.match(/^[({]/)) { s.depth++; return null; }
        if (stream.match(/^[)}]/)) { s.depth--; return null; }
      }

      if (s.mode === "define") {
        stream.match(/^[^$\\]+/) || stream.next();
        return null;
      }
      if (stream.match("#")) { stream.skipToEnd(); return "comment"; }

      if (s.mode === "recipe") {
        if (lineStart && stream.match(/^[@+-]+/)) return "operator";
        if (stream.match(/^"(?:[^"\\]|\\.)*"?/) || stream.match(/^'[^']*'?/)) return "string";
        stream.match(/^[^\s$"'\\(){}]+/) || stream.next();
        return null;
      }

      if (s.mode === "rule" && s.depth === 0) {
        if (!s.pastOp) {
          if (stream.match(/^(?:::?|&:)/)) { s.pastOp = true; return "operator"; }
          if (stream.match(/^[^\s:#;=$|\\(){}]+/)) {
            return SPECIAL_TARGETS.has(stream.current()) ? "directive" : "label";
          }
        } else {
          if (stream.match(/^[|;]/)) {
            if (stream.current() === ";") s.mode = "recipe";
            return "operator";
          }
          // Target-specific variable: `prog: CFLAGS += -g`
          if (stream.match(ASSIGN, false)) { s.mode = "assign"; s.pastOp = false; }
        }
      }

      if (s.mode === "assign" && !s.pastOp && s.depth === 0) {
        if (stream.match(ASSIGN_OP)) { s.pastOp = true; return "operator"; }
        if (stream.match(/^[^\s:#=+?!$\\(){}]+/)) {
          return DIRECTIVES.has(stream.current()) ? "keyword" : "variable";
        }
      }

      if (s.mode === "other" && lineStart && stream.match(/^[-\w]+/)) {
        const word = stream.current();
        if (word === "else") s.lineStart = true;    // `else ifeq (...)`
        return DIRECTIVES.has(word) ? "keyword" : null;
      }

      stream.match(/^[^\s$#\\(){}:=|;]+/) || stream.next();
      return null;
    },
  };
}

export const MAKEFILE: Language = {
  id: "makefile",
  name: "Makefile",
  aliases: ["make", "mk", "mak"],
  makeParser: makeMakefileParser,
  lineComment: "#",
  describe: describeMake,
};
