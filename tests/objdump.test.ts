import { describe, it, expect } from "vitest";
import { languageForTag } from "../src/languages";
import { isaFromFormat } from "../src/lang/objdump";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";

/** Non-plain tokens of one line as [text, kind, lang]. */
function toks(src: string, tag = "objdump", line = 0) {
  return tokenizeLines(src, languageForTag(tag)!)[line]
    .filter((t) => t.kind !== null)
    .map((t) => [t.text, t.kind, t.lang]);
}

const RISCV = `firmware.elf:     file format elf32-littleriscv


Disassembly of section .text:

80000000 <_start>:
80000000:\t00000297          \tauipc\tt0,0x0
80000004:\t02028293          \taddi\tt0,t0,32 # 80000020 <trap>
8000000c:\t4505                \tli\ta0,1
80000010:\t0040006f          \tj\t80000014 <loop>`;

const THUMB = `08000130 <main>:
 8000130:\tb580      \tpush\t{r7, lr}
 8000132:\taf00      \tadd\tr7, sp, #0
 8000134:\tf44f 7380 \tmov.w\tr3, #256\t@ 0x100
 800013a:\tf000 f805 \tbl\t8000148 <delay>`;

const A64 = `0000000000400580 <main>:
  400580:\ta9bf7bfd \tstp\tx29, x30, [sp, #-16]!
  400588:\t90000000 \tadrp\tx0, 400000 <_init-0x3e8>
  400590:\t97ffffb0 \tbl\t400450 <puts@plt>`;

const GDB = `Dump of assembler code for function main:
   0x08000130 <+0>:\tpush\t{r7, lr}
=> 0x08000132 <+2>:\tadd\tr7, sp, #0
End of assembler dump.`;

describe("objdump: structure", () => {
  it("header, section and symbol lines", () => {
    expect(toks(RISCV, "objdump", 0)).toEqual([["firmware.elf:     file format elf32-littleriscv", "comment", "objdump"]]);
    expect(toks(RISCV, "objdump", 3)).toEqual([["Disassembly of section .text:", "directive", "objdump"]]);
    expect(toks(RISCV, "objdump", 5)).toEqual([["80000000", "number", "objdump"], ["<_start>:", "label", "objdump"]]);
  });

  it("address, raw bytes and an instruction tokenized by the ISA", () => {
    expect(toks(RISCV, "objdump", 7)).toEqual([
      ["80000004", "number", "objdump"], ["02028293", "comment", "objdump"],
      ["addi", "mnemonic", "riscv"], ["t0", "register", "riscv"], ["t0", "register", "riscv"], ["32", "number", "riscv"],
      ["# 80000020 <trap>", "comment", "riscv"],
    ]);
    expect(toks(RISCV, "objdump", 8)).toEqual([
      ["8000000c", "number", "objdump"], ["4505", "comment", "objdump"],
      ["li", "mnemonic", "riscv"], ["a0", "register", "riscv"], ["1", "number", "riscv"],
    ]);
  });

  it("symbolic targets in operands are labels", () => {
    expect(toks(RISCV, "objdump", 9).slice(-2)).toEqual([["80000014", "number", "riscv"], ["<loop>", "label", "objdump"]]);
    expect(toks(A64, "objdump", 3).slice(-1)).toEqual([["<puts@plt>", "label", "objdump"]]);
  });

  it("Thumb: 16- and 32-bit encodings, @ comments", () => {
    expect(toks(THUMB, "objdump", 1)).toEqual([
      ["8000130", "number", "objdump"], ["b580", "comment", "objdump"],
      ["push", "mnemonic", "arm32"], ["r7", "register", "arm32"], ["lr", "register", "arm32"],
    ]);
    expect(toks(THUMB, "objdump", 2)[2]).toEqual(["add", "mnemonic", "arm32"]);     // 'add' is not mistaken for bytes
    expect(toks(THUMB, "objdump", 3)).toEqual([
      ["8000134", "number", "objdump"], ["f44f 7380", "comment", "objdump"],
      ["mov.w", "mnemonic", "arm32"], ["r3", "register", "arm32"], ["#256", "number", "arm32"], ["@ 0x100", "comment", "arm32"],
    ]);
  });

  it("GDB disassemble: current-PC marker and <+offset>", () => {
    expect(toks(GDB, "objdump", 0)).toEqual([["Dump of assembler code for function main:", "directive", "objdump"]]);
    expect(toks(GDB, "objdump", 2)).toEqual([
      ["=>", "operator", "objdump"], ["0x08000132", "number", "objdump"], ["<+2>", "label", "objdump"],
      ["add", "mnemonic", "arm32"], ["r7", "register", "arm32"], ["sp", "register", "arm32"], ["#0", "number", "arm32"],
    ]);
  });

  it("other lines are left plain", () => {
    expect(toks("  int x = 1;\n\t...\n", "objdump", 0)).toEqual([]);
    expect(toks("  int x = 1;\n\t...\n", "objdump", 1)).toEqual([]);
  });
});

describe("objdump: ISA detection", () => {
  it("from the file format header", () => {
    expect(["elf32-littleriscv", "elf64-littleriscv", "elf32-littlearm", "elf32-bigarm", "elf64-littleaarch64", "elf64-x86-64"]
      .map((f) => isaFromFormat(f))).toEqual([0, 0, 1, 1, 2, -1]);
    // 'add' alone is ambiguous; the header decides
    const src = "a.out:     file format elf64-littleaarch64\n  400584:\t8b020020 \tadd\tx0, x1, x2";
    expect(toks(src, "objdump", 1).slice(2).map((t) => t[2])).toEqual(["arm64", "arm64", "arm64", "arm64"]);
  });

  it("from the first mnemonic only one ISA knows, then kept", () => {
    expect(toks(A64, "objdump", 1)[2]).toEqual(["stp", "mnemonic", "arm64"]);
    expect(toks(A64, "objdump", 2)[2]).toEqual(["adrp", "mnemonic", "arm64"]);
    expect(toks(THUMB, "objdump", 4)[2]).toEqual(["bl", "mnemonic", "arm32"]);
  });

  it("forced by the fence tag", () => {
    const line = " 8000132:\taf00      \tadd\tr7, sp, #0";
    expect(toks(line, "objdump-arm")[2]).toEqual(["add", "mnemonic", "arm32"]);
    expect(toks(line, "disasm-riscv")[2]).toEqual(["add", "mnemonic", "riscv"]);
    expect(toks("  400584:\t910003fd \tmov\tx29, sp", "objdump-aarch64")[2]).toEqual(["mov", "mnemonic", "arm64"]);
  });
});

describe("objdump: hover and highlighting classes use the instruction's ISA", () => {
  it("cm5 mode emits the ISA's lang class for instruction tokens", async () => {
    const { toCm5Mode } = await import("../src/adapters/cm5");
    const { StringStream } = await import("@codemirror/language");
    const mode = toCm5Mode(languageForTag("objdump")!);
    const state = mode.startState();
    const stream = new StringStream("80000004:\t02028293\taddi\tt0,t0,32", 4, 2);
    const out: string[] = [];
    while (!stream.eol()) { const st = mode.token(stream, state); if (st) out.push(`${stream.current()}=${st}`); stream.start = stream.pos; }
    expect(out).toEqual([
      "80000004=number asmlight-number asmlight-lang-objdump",
      "02028293=comment asmlight-comment asmlight-lang-objdump",
      "addi=keyword asmlight-mnemonic asmlight-lang-riscv",
      "t0=variable-2 asmlight-register asmlight-lang-riscv",
      "t0=variable-2 asmlight-register asmlight-lang-riscv",
      "32=number asmlight-number asmlight-lang-riscv",
    ]);
  });
});

describe("objdump: robustness", () => {
  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    for (const tag of ["objdump", "objdump-riscv", "objdump-arm", "objdump-arm64"]) {
      const lang = languageForTag(tag)!;
      for (const prefix of ["", "80000004:\t", "80000004:\t02028293 \t", "=> 0x1 <+4>:\t", "1 <x>:", "f: file format elf32-littlearm\n1:\t"]) {
        expect(() => tokenizeLines(prefix + all, lang)).not.toThrow();
        for (const ch of all) expect(() => tokenizeLines(`${prefix}${ch}${ch} a0`, lang)).not.toThrow();
      }
    }
  });
});
