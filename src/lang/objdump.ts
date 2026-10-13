import { ALL_ISAS } from "../isa";
import { makeParser } from "../tokenizer/parser";
import type { AsmParser, AsmState, IsaSpec, Language, Parser, TokenKind } from "../tokenizer/types";

const ISAS: readonly IsaSpec[] = ALL_ISAS;
const PARSERS: readonly AsmParser[] = ISAS.map(makeParser);
const FALLBACK = ISAS.findIndex((i) => i.id === "riscv");

const FILE_FORMAT = /:\s+file format\s+(\S+)/;
const SECTION = /^\s*(?:Disassembly of section\b|Dump of assembler code\b|End of assembler dump)/;
const SYMBOL = /^\s*(?:0x)?[0-9a-f]+\s+<[^>]*>:\s*$/i;
// objdump `  80000004:` or GDB `=> 0x080001a0 <+4>:`
const INSN = /^\s*(?:=>\s*)?(?:0x)?[0-9a-f]+(?:\s*<[^>]*>)?:/i;
// raw encoding after the address: even-length hex groups ending at a tab (objdump pads with
// spaces first), 2+ spaces or end of line, so a mnemonic such as `add` is never taken for bytes
const BYTES = /^(?:[0-9a-f]{2})+(?: (?:[0-9a-f]{2})+)*(?= *\t| {2,}|\s*$)/i;

type Phase = "plain" | "header" | "section" | "symbol" | "address" | "bytes" | "insn";

interface ObjdumpState {
  isa: number;            // index into ISAS, -1 while undetected
  inner: AsmState[];      // one per ISA, so block comments survive detection
  phase: Phase;
  tokenIsa: number;       // ISA that produced the last token, -1 for objdump's own
}

export function isaFromFormat(format: string): number {
  const f = format.toLowerCase();
  const id = f.includes("riscv") ? "riscv" : f.includes("aarch64") ? "arm64" : /(little|big)arm/.test(f) ? "arm32" : undefined;
  return id ? ISAS.findIndex((i) => i.id === id) : -1;
}

/** The ISA whose mnemonic table alone knows `word`, or -1 if none or several do. */
function isaFromMnemonic(word: string): number {
  const hits = ISAS.map((isa, i) => (isa.isMnemonic(word.toLowerCase()) ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : -1;
}

function startLine(line: string, s: ObjdumpState): void {
  if (FILE_FORMAT.test(line)) {
    s.phase = "header";
    const isa = isaFromFormat(FILE_FORMAT.exec(line)![1]);
    if (isa >= 0 && s.isa < 0) s.isa = isa;
  } else if (SECTION.test(line)) s.phase = "section";
  else if (SYMBOL.test(line)) s.phase = "symbol";
  else if (INSN.test(line)) s.phase = "address";
  else s.phase = "plain";
}

export function makeObjdumpParser(forced = -1): Parser<ObjdumpState> {
  return {
    startState: () => ({ isa: forced, inner: PARSERS.map((p) => p.startState()), phase: "plain", tokenIsa: -1 }),
    copyState: (s) => ({ ...s, inner: s.inner.map((st, i) => PARSERS[i].copyState(st)) }),
    tokenLang: (s) => (s.tokenIsa >= 0 ? ISAS[s.tokenIsa].id : undefined),
    token(stream, s): TokenKind | null {
      s.tokenIsa = -1;
      if (stream.sol()) startLine(stream.string, s);

      switch (s.phase) {
        case "plain":
          stream.skipToEnd();
          return null;
        case "header":
          stream.skipToEnd();
          return "comment";
        case "section":
          stream.skipToEnd();
          return "directive";
        case "symbol":
          if (stream.eatSpace()) return null;
          if (stream.match(/^(?:0x)?[0-9a-f]+/i)) return "number";
          stream.skipToEnd();
          return "label";
        case "address":
          if (stream.eatSpace()) return null;
          if (stream.match("=>")) return "operator";
          if (stream.match(/^(?:0x)?[0-9a-f]+/i)) return "number";
          if (stream.match(/^<[^>]*>/)) return "label";
          stream.next();                                   // the ':'
          s.phase = "bytes";
          return null;
        case "bytes":
          if (stream.eatSpace()) return null;
          s.phase = "insn";
          s.inner.forEach((st) => { st.sawMnemonic = false; });
          if (stream.match(BYTES)) return "comment";
          break;
      }

      // Instruction text: symbolic targets are ours, the rest is the ISA's.
      if (stream.match(/^<[^>\s]*>/)) return "label";
      if (s.isa < 0 && !s.inner[FALLBACK].sawMnemonic) {
        const word = stream.match(/^[a-z][\w.]*/i, false) as RegExpMatchArray | null;
        if (word) s.isa = isaFromMnemonic(word[0]);
      }
      const isa = s.isa >= 0 ? s.isa : FALLBACK;
      s.tokenIsa = isa;
      return PARSERS[isa].token(stream, s.inner[isa]);
    },
  };
}

function objdumpLanguage(id: string, name: string, aliases: string[], isaId?: string): Language {
  const forced = isaId ? ISAS.findIndex((i) => i.id === isaId) : -1;
  return { id, name, aliases, makeParser: () => makeObjdumpParser(forced) };
}

export const OBJDUMP_LANGUAGES: readonly Language[] = [
  objdumpLanguage("objdump", "Disassembly", ["disasm", "disassembly"]),
  objdumpLanguage("objdump-riscv", "Disassembly (RISC-V)", ["disasm-riscv", "objdump-rv"], "riscv"),
  objdumpLanguage("objdump-arm", "Disassembly (ARM)", ["disasm-arm", "objdump-arm32", "objdump-thumb"], "arm32"),
  objdumpLanguage("objdump-arm64", "Disassembly (AArch64)", ["disasm-arm64", "objdump-aarch64"], "arm64"),
];
