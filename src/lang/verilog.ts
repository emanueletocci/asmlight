import { describeVerilog } from "../docs/verilog";
import { words } from "../isa/common";
import type { Language, Parser, TokenKind } from "../tokenizer/types";

/** Verilog-2005 plus SystemVerilog (IEEE 1800) keywords; both are case-sensitive. */
export const KEYWORDS: ReadonlySet<string> = new Set(words(`
  always and assign automatic begin buf bufif0 bufif1 case casex casez cell cmos config deassign default
  defparam design disable edge else end endcase endconfig endfunction endgenerate endmodule endprimitive
  endspecify endtable endtask event for force forever fork function generate genvar highz0 highz1 if ifnone
  incdir include initial inout input instance integer join large liblist library localparam macromodule
  medium module nand negedge nmos nor noshowcancelled not notif0 notif1 or output parameter pmos posedge
  primitive pull0 pull1 pulldown pullup pulsestyle_ondetect pulsestyle_onevent rcmos real realtime reg
  release repeat rnmos rpmos rtran rtranif0 rtranif1 scalared showcancelled signed small specify specparam
  strong0 strong1 supply0 supply1 table task time tran tranif0 tranif1 tri tri0 tri1 triand trior trireg
  unsigned use uwire vectored wait wand weak0 weak1 while wire wor xnor xor

  accept_on alias always_comb always_ff always_latch assert assume before bind bins binsof bit break byte
  chandle checker class clocking const constraint context continue cover covergroup coverpoint cross dist
  do endchecker endclass endclocking endgroup endinterface endpackage endprogram endproperty endsequence
  enum eventually expect export extends extern final first_match foreach forkjoin global iff ignore_bins
  illegal_bins implements implies import inside int interconnect interface intersect join_any join_none
  let local logic longint matches modport nettype new nexttime null package packed priority program
  property protected pure rand randc randcase randsequence ref reject_on restrict return s_always
  s_eventually s_nexttime s_until s_until_with sequence shortint shortreal soft solve static string strong
  struct super sync_accept_on sync_reject_on tagged this throughout timeprecision timeunit type typedef
  union unique unique0 until until_with untyped var virtual void wait_order weak wildcard with within
`));

const DIRECTIVES = new Set(words(`
  define undef undefineall ifdef ifndef elsif else endif include timescale default_nettype resetall
  celldefine endcelldefine line unconnected_drive nounconnected_drive pragma begin_keywords end_keywords
  __FILE__ __LINE__
`));

/** Keywords followed by the name they declare. */
const DECLARES = new Set(words("module macromodule interface package program class primitive checker config"));
/** Keywords that may be followed by `: name`. */
const NAMED_BLOCK = /^(?:begin|end\w*|fork|join\w*)$/;
/** Keywords that start a new statement, so a following `<=` is an assignment. */
const STMT_START = /^(?:begin|end|else|fork|join\w*|do|forever|initial|final|always\w*|default)$/;

const NUMBER_BASED = /^(?:\d[\d_]*)?'[sS]?[bodhBODH][0-9a-fA-FxXzZ?_]+/;
const NUMBER_FILL = /^'[01xzXZ](?![\w'])/;
const NUMBER = /^\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?(?:fs|ps|ns|us|ms|s|step)?(?![\w'])/;

interface VerilogState {
  inBlockComment: boolean;
  depth: number;          // open ( [ {
  assigned: boolean;      // statement already has its `=` / `<=`
  nameNext: boolean;      // next identifier is a declared or block name
}

export function makeVerilogParser(): Parser<VerilogState> {
  return {
    startState: () => ({ inBlockComment: false, depth: 0, assigned: false, nameNext: false }),
    copyState: (s) => ({ ...s }),
    token(stream, s): TokenKind | null {
      if (s.inBlockComment) {
        if (stream.match(/^.*?\*\//)) s.inBlockComment = false;
        else stream.skipToEnd();
        return "comment";
      }
      if (stream.eatSpace()) return null;

      if (stream.match("//")) { stream.skipToEnd(); return "comment"; }
      if (stream.match("/*")) {
        if (!stream.match(/^.*?\*\//)) { s.inBlockComment = true; stream.skipToEnd(); }
        return "comment";
      }
      // Attribute `(* keep = "true" *)`, but not the `@(*)` sensitivity list.
      if (stream.match(/^\(\*(?!\s*\))/)) {
        if (!stream.match(/^.*?\*\)/)) stream.skipToEnd();
        return "directive";
      }
      if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return "string";
      if (stream.match(/^`[a-zA-Z_]\w*/)) return DIRECTIVES.has(stream.current().slice(1)) ? "directive" : "variable";
      if (stream.match(/^\$[a-zA-Z_][\w$]*/)) return "function";
      if (stream.match(NUMBER_BASED) || stream.match(NUMBER_FILL) || stream.match(NUMBER)) return "number";
      if (stream.match(/^\\\S+/)) return null;                          // escaped identifier
      if (stream.match(/^\.[a-zA-Z_]\w*(?=\s*\()/)) return "property";  // named port connection

      if (stream.match(/^[a-zA-Z_][\w$]*/)) {
        const word = stream.current();
        if (KEYWORDS.has(word)) {
          if (DECLARES.has(word)) s.nameNext = true;
          else if (NAMED_BLOCK.test(word) && stream.match(/^\s*:\s*[a-zA-Z_]/, false)) s.nameNext = true;
          if (STMT_START.test(word)) s.assigned = false;
          return "keyword";
        }
        if (s.nameNext) { s.nameNext = false; return "label"; }
        return null;
      }

      if (stream.match(/^(?:\|->|\|=>|##\d*)/)) return "operator";
      if (stream.match(/^(?:<<<=|>>>=|<<=|>>=|===|!==|==\?|!=\?|==|!=|>=|->|<->|<<<|>>>|<<|>>|&&|\|\||\*\*|::|\+\+|--|[-+*/%&|^]=)/)) {
        if (/=$/.test(stream.current()) && !/^(?:===|!==|==|!=|>=)$/.test(stream.current())) s.assigned = true;
        return null;
      }
      if (stream.match("<=")) {
        if (s.depth > 0 || s.assigned) return null;    // comparison
        s.assigned = true;
        return "operator";
      }
      if (stream.match(/^[@#]/)) return "operator";

      const ch = stream.next();
      if (ch === "(" || ch === "[" || ch === "{") s.depth++;
      else if (ch === ")" || ch === "]" || ch === "}") s.depth = Math.max(0, s.depth - 1);
      else if (ch === "=" && s.depth === 0) s.assigned = true;
      else if (ch === ";") { s.assigned = false; s.depth = 0; s.nameNext = false; }
      return null;
    },
  };
}

export const VERILOG: Language = {
  id: "verilog",
  name: "Verilog",
  aliases: ["v", "vh", "sv", "svh", "systemverilog", "system-verilog"],
  makeParser: makeVerilogParser,
  lineComment: "//",
  blockComment: ["/*", "*/"],
  describe: describeVerilog,
};
