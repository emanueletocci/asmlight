import { describe, it, expect } from "vitest";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import type { IsaSpec } from "../src/tokenizer/types";
import { kinds } from "./helpers";
import { ALL_LANGUAGES } from "../src/languages";
import { asmLanguage } from "../src/tokenizer/parser";

const T_ISA: IsaSpec = {
  id: "t",
  name: "T",
  aliases: [],
  isMnemonic: (w) => w === "mov" || w === "nop",
  registers: new Set(["r0", "r1"]),
  lineComments: [";"],
  hashIsImmediate: true,
};
const T = asmLanguage(T_ISA);

describe("parser core", () => {
  it("label, mnemonic, register, immediate, comment", () => {
    expect(kinds("top: mov r0, #1 ; hi", T)).toEqual([
      ["top:", "label"], ["mov", "mnemonic"], ["r0", "register"], ["#1", "number"], ["; hi", "comment"],
    ]);
  });

  it("unknown first word stays plain, operands still highlighted", () => {
    expect(kinds("frob r1", T)).toEqual([["r1", "register"]]);
  });

  it("directives and number formats", () => {
    expect(kinds(".word 0x1F, 0b101, 42, -7", T)).toEqual([
      [".word", "directive"], ["0x1F", "number"], ["0b101", "number"], ["42", "number"], ["-7", "number"],
    ]);
  });

  it("block comment spanning lines", () => {
    const src = "/* a\n b */ nop";
    expect(kinds(src, T, 0)).toEqual([["/* a", "comment"]]);
    expect(kinds(src, T, 1)).toEqual([[" b */", "comment"], ["nop", "mnemonic"]]);
  });

  it("unterminated string does not leak into next line", () => {
    const src = '.ascii "abc\nnop';
    expect(kinds(src, T, 0)).toEqual([[".ascii", "directive"], ['"abc', "string"]]);
    expect(kinds(src, T, 1)).toEqual([["nop", "mnemonic"]]);
  });

  it("relocation operators", () => {
    expect(kinds("mov r0, %hi(sym)", T)).toEqual([["mov", "mnemonic"], ["r0", "register"], ["%hi", "reloc"]]);
    expect(kinds("mov r0, #:lo12:sym", T)).toEqual([
      ["mov", "mnemonic"], ["r0", "register"], ["#", "number"], [":lo12:", "reloc"],
    ]);
  });

  it("numeric local labels and refs", () => {
    expect(kinds("1: mov r0, 1b", T)).toEqual([["1:", "label"], ["mov", "mnemonic"], ["r0", "register"], ["1b", "label"]]);
  });

  it("preprocessor line is one directive token", () => {
    expect(kinds("#define X 1", T)).toEqual([["#define X 1", "directive"]]);
  });

  it("dot-labels", () => {
    expect(kinds(".LBB0_1:", T)).toEqual([[".LBB0_1:", "label"]]);
  });

  it("fuzz: every printable char, alone and together, always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    expect(() => tokenizeLines(all, T)).not.toThrow();
    for (const ch of all) expect(() => tokenizeLines(`mov ${ch}${ch} r0`, T)).not.toThrow();
    expect(() => tokenizeLines("é→ 漢字 mov r0", T)).not.toThrow();
  });
});

describe("lossless round-trip", () => {
  const samples: Record<string, string> = {
    riscv: "start:\taddi\ta0, a0, 1 # héllo λ\n.string \"unterminated\n/* block\n comment */ ret\n",
    arm32: "loop:\tmov r0, #1 @ ünï\n\t.asciz \"abc\n/* b\nc */\tbx lr\n",
    arm64: "_main:\n\tmov x0, #0x10 // żółć\n\t.ascii \"oops\n/* x\n y */ ret",
    makefile: "CC := gcc # ç\nall: $(OBJ) \\\n\tmain.o\n\t@echo \"oops\n\techo 'x\ndefine X =\n$(Y\nendef\n",
    linker: "MEMORY { FLASH (rx) : ORIGIN = 0x0, LENGTH = 64K }\n/* ü\n x */ .text : { *(.text*) } > FLASH\n\"oops",
    dts: "/dts-v1/;\n/ { ü: n@1 { reg = <0x0\n 1>; s = \"oops\n}; /* c\n */ };\nb = [00 1",
  };
  for (const lang of ALL_LANGUAGES) {
    it(`${lang.id}`, () => {
      const src = samples[lang.id];
      expect(src).toBeDefined();
      expect(tokenizeLines(src, lang).map((l) => l.map((t) => t.text).join("")).join("\n")).toBe(src);
    });
  }
});
