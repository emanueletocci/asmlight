import { describeLinker } from "../docs/linker";
import { words } from "../isa/common";
import type { Language, Parser, TokenKind } from "../tokenizer/types";

/** GNU ld commands and keywords; ld matches them case-sensitively. */
const KEYWORDS = new Set(words(`
  ENTRY INCLUDE INPUT GROUP AS_NEEDED OUTPUT SEARCH_DIR STARTUP OUTPUT_FORMAT OUTPUT_ARCH TARGET
  REGION_ALIAS ASSERT EXTERN FORCE_COMMON_ALLOCATION INHIBIT_COMMON_ALLOCATION FORCE_GROUP_ALLOCATION
  INSERT AFTER BEFORE NOCROSSREFS NOCROSSREFS_TO LD_FEATURE
  SECTIONS MEMORY PHDRS VERSION OVERLAY
  HIDDEN PROVIDE PROVIDE_HIDDEN KEEP EXCLUDE_FILE INPUT_SECTION_FLAGS
  SORT SORT_BY_NAME SORT_BY_ALIGNMENT SORT_BY_INIT_PRIORITY SORT_NONE REVERSE
  FILL CREATE_OBJECT_SYMBOLS CONSTRUCTORS COMMON
  BYTE SHORT LONG QUAD SQUAD ASCIZ
  AT ALIGN_WITH_INPUT SUBALIGN ONLY_IF_RO ONLY_IF_RW
  NOLOAD DSECT COPY INFO READONLY TYPE
  FILEHDR FLAGS PT_NULL PT_LOAD PT_DYNAMIC PT_INTERP PT_NOTE PT_SHLIB PT_PHDR PT_TLS
  PT_GNU_EH_FRAME PT_GNU_STACK PT_GNU_RELRO PT_GNU_PROPERTY
`));

const FUNCTIONS = new Set(words(`
  ABSOLUTE ADDR ALIGN ALIGNOF BLOCK DATA_SEGMENT_ALIGN DATA_SEGMENT_END DATA_SEGMENT_RELRO_END
  DEFINED LENGTH LOADADDR LOG2CEIL MAX MIN NEXT ORIGIN SEGMENT_START SIZEOF SIZEOF_HEADERS
  CONSTANT MAXPAGESIZE COMMONPAGESIZE
`));

const NUMBER = /^(?:0x[0-9a-f]+|0b[01]+|\d+)[kmg]?\b/i;
const PREPROC = /^#\s*(?:include|define|undef|if|ifdef|ifndef|elif|else|endif|error|pragma)\b/;
const ASSIGN_OP = /^(?:<<|>>|[-+*/&|])?=(?!=)/;

interface LdState {
  inBlockComment: boolean;
  depth: number;          // parentheses; `>` at depth 0 assigns a memory region
  regionNext: boolean;    // after `>` / `AT>`
}

export function makeLinkerParser(): Parser<LdState> {
  return {
    startState: () => ({ inBlockComment: false, depth: 0, regionNext: false }),
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
      if (stream.sol() && stream.match(PREPROC)) { stream.skipToEnd(); return "directive"; }
      if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return "string";
      if (stream.match("/DISCARD/")) return "keyword";
      if (stream.match(NUMBER)) return "number";

      if (stream.match(/^[a-z_.$][\w.$]*/i)) {
        const word = stream.current();
        const regionNext = s.regionNext;
        s.regionNext = false;
        if (KEYWORDS.has(word)) return "keyword";
        if (FUNCTIONS.has(word)) return "function";
        if (word === "." || stream.match(/^\s*(?:<<|>>|[-+*/&|])?=(?!=)/, false)) return "variable";
        if (regionNext || word.startsWith(".")) return "label";
        // Memory region `FLASH (rx) :` or output section without a leading dot
        if (s.depth === 0 && stream.match(/^\s*(?:\([^)]*\))?\s*:/, false)) return "label";
        return null;
      }

      if (stream.match(/^(?:==|!=|<=|>=|<<|>>|&&|\|\|)/)) return null;
      if (stream.match(ASSIGN_OP)) return "operator";
      if (stream.match(">")) {
        if (s.depth > 0) return null;
        s.regionNext = true;
        return "operator";
      }
      if (stream.match("(")) s.depth++;
      else if (stream.match(")")) s.depth = Math.max(0, s.depth - 1);
      else stream.next();
      return null;
    },
  };
}

export const LINKER: Language = {
  id: "linker",
  name: "Linker script",
  aliases: ["ld", "lds", "linkerscript", "linker-script"],
  makeParser: makeLinkerParser,
  blockComment: ["/*", "*/"],
  describe: describeLinker,
};
