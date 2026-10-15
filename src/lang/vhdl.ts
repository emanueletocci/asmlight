import { describeVhdl } from "../docs/vhdl";
import { words } from "../isa/common";
import type { Language, Parser, TokenKind } from "../tokenizer/types";

/** VHDL-2008 reserved words; VHDL is case-insensitive, so all lookups use lowercase. */
export const KEYWORDS: ReadonlySet<string> = new Set(words(`
  abs access after alias all and architecture array assert assume assume_guarantee attribute begin block
  body buffer bus case component configuration constant context cover default disconnect downto else
  elsif end entity exit fairness file for force function generate generic group guarded if impure in
  inertial inout is label library linkage literal loop map mod nand new next nor not null of on open or
  others out package parameter port postponed procedure process property protected pure range record
  register reject release rem report restrict restrict_guarantee return rol ror select sequence severity
  shared signal sla sll sra srl strong subtype then to transport type unaffected units until use variable
  vmode vprop vunit wait when while with xnor xor
`));

/** Predefined and IEEE library types. */
export const TYPES: ReadonlySet<string> = new Set(words(`
  bit bit_vector boolean boolean_vector character integer integer_vector natural positive real real_vector
  severity_level string time time_vector std_logic std_logic_vector std_ulogic std_ulogic_vector
  signed unsigned sfixed ufixed float
`));

export const FUNCTIONS: ReadonlySet<string> = new Set(words(`
  rising_edge falling_edge to_unsigned to_signed to_integer to_stdlogicvector to_stdulogicvector
  to_bitvector to_bit to_x01 is_x resize shift_left shift_right rotate_left rotate_right std_match
  to_string to_hstring to_ostring to_bstring minimum maximum now endfile readline writeline read write
  hread hwrite file_open file_close conv_integer conv_std_logic_vector conv_unsigned conv_signed
  uniform finish stop
`));

const VALUES = new Set(words("true false note warning error failure"));

/** Keywords followed by the name they declare. */
const DECLARES = new Set(words("entity architecture component package body configuration context procedure function"));
/** After these, a `<=` starts an assignment again. */
const STMT_START = new Set(words("begin then else is loop generate"));
/** Conditions, where `<=` means less-or-equal: `if a <= b then`. */
const COND_START = new Set(words("if elsif while until assert when return"));
const COND_END = new Set(words("then loop report generate"));

/** `name : process`, `u1 : entity work.counter`, `u1 : counter port map (...)` */
const LABEL_FOLLOWS = /^\s*:\s*(?:(?:postponed\s+)?(?:process|block|for|if|case|while|loop|assert|entity|component|configuration|with)\b|[a-z]\w*(?:\.\w+)*\s*(?:$|generic\s+map|port\s+map))/i;

const BIT_STRING = /^\d*[us]?[bodx]"[^"]*"?/i;
const NUMBER = /^\d[\d_]*(?:#[0-9a-f_]+(?:\.[0-9a-f_]+)?#|(?:\.\d[\d_]*)?)(?:e[+-]?\d+)?(?![\w#])/i;

interface VhdlState {
  inBlockComment: boolean;
  depth: number;          // open parentheses
  assigned: boolean;      // statement already has its `<=` / `:=`
  inCond: boolean;        // inside if/when/while condition
  stmtStart: boolean;     // nothing but labels seen in this statement
  nameNext: boolean;      // next identifier is a declared or `end` name
  afterName: boolean;     // last token was a name or `)`: `'` starts an attribute
  archHeader: boolean;    // between `architecture` and `is`
}

export function makeVhdlParser(): Parser<VhdlState> {
  return {
    startState: () => ({
      inBlockComment: false, depth: 0, assigned: false, inCond: false, stmtStart: true,
      nameNext: false, afterName: false, archHeader: false,
    }),
    copyState: (s) => ({ ...s }),
    token(stream, s): TokenKind | null {
      if (s.inBlockComment) {
        if (stream.match(/^.*?\*\//)) s.inBlockComment = false;
        else stream.skipToEnd();
        return "comment";
      }
      if (stream.eatSpace()) return null;

      const afterName = s.afterName;
      s.afterName = false;
      if (stream.match("--")) { stream.skipToEnd(); return "comment"; }
      if (stream.match("/*")) {
        if (!stream.match(/^.*?\*\//)) { s.inBlockComment = true; stream.skipToEnd(); }
        return "comment";
      }
      if (stream.match(BIT_STRING)) return "number";
      if (stream.match(/^"(?:[^"]|"")*"?/)) return "string";
      if (afterName && stream.match(/^'[a-z]\w*/i)) { s.afterName = true; return "property"; }
      if (!afterName && stream.match(/^'.'/)) return "string";
      if (stream.match(NUMBER)) return "number";
      if (stream.match(/^\\[^\\]*\\?/)) { s.afterName = true; return null; }   // extended identifier

      if (stream.match(/^[a-z]\w*/i)) {
        const word = stream.current().toLowerCase();
        const stmtStart = s.stmtStart;
        s.stmtStart = false;
        if (KEYWORDS.has(word)) {
          if (word === "end") s.nameNext = true;
          else if (DECLARES.has(word)) {
            s.nameNext = true;
            if (word === "architecture") s.archHeader = true;
          } else if (word === "of" && s.archHeader) s.nameNext = true;
          else if (word === "is") s.archHeader = false;
          if (COND_START.has(word)) s.inCond = true;
          if (COND_END.has(word)) s.inCond = false;
          if (STMT_START.has(word)) { s.assigned = false; s.stmtStart = true; }
          return "keyword";
        }
        s.afterName = true;
        if (s.nameNext) {
          s.nameNext = false;
          stream.match(/^(?:\.\w+)+/);    // entity work.counter
          return "label";
        }
        if (stmtStart && s.depth === 0 && stream.match(LABEL_FOLLOWS, false)) {
          s.stmtStart = true;
          return "label";
        }
        if (TYPES.has(word) || VALUES.has(word)) return "keyword";
        if (FUNCTIONS.has(word)) return "function";
        return null;
      }

      if (stream.match(/^(?:<=|:=)/)) {
        if (s.depth > 0 || s.inCond || s.assigned) return null;    // comparison
        s.assigned = true;
        return "operator";
      }
      if (stream.match("=>")) {
        if (s.depth === 0) { s.inCond = false; s.assigned = false; s.stmtStart = true; }   // case choice
        return "operator";
      }
      if (stream.match(/^(?:\/=|>=|\*\*|\?\?|\?[/<>]?=|\?[<>]|<>)/)) return null;

      const ch = stream.next();
      if (ch === "(") s.depth++;
      else if (ch === ")") { s.depth = Math.max(0, s.depth - 1); s.afterName = true; }
      else if (ch === "]") s.afterName = true;
      else if (ch === ";") {
        s.depth = 0; s.assigned = false; s.inCond = false; s.stmtStart = true; s.nameNext = false; s.archHeader = false;
      }
      return null;
    },
  };
}

export const VHDL: Language = {
  id: "vhdl",
  name: "VHDL",
  aliases: ["vhd"],
  makeParser: makeVhdlParser,
  lineComment: "--",
  blockComment: ["/*", "*/"],
  describe: describeVhdl,
};
