import { describe, it, expect } from "vitest";
import { RISCV } from "../src/isa/riscv";
import { kinds } from "./helpers";

describe("RISC-V", () => {
  it("basic line with ABI registers and # comment", () => {
    expect(kinds("loop: addi a0, a0, -1  # dec", RISCV)).toEqual([
      ["loop:", "label"], ["addi", "mnemonic"], ["a0", "register"], ["a0", "register"], ["-1", "number"], ["# dec", "comment"],
    ]);
  });
  it("relocations", () => {
    expect(kinds("lui t0, %hi(msg)", RISCV)).toEqual([["lui", "mnemonic"], ["t0", "register"], ["%hi", "reloc"]]);
  });
  it("dotted mnemonics: atomics with ordering, FP conversions, compressed, vector", () => {
    expect(kinds("amoadd.w.aqrl a0, a1, (a2)", RISCV)[0]).toEqual(["amoadd.w.aqrl", "mnemonic"]);
    expect(kinds("fcvt.w.s a0, fa0", RISCV)).toEqual([["fcvt.w.s", "mnemonic"], ["a0", "register"], ["fa0", "register"]]);
    expect(kinds("c.addi sp, -16", RISCV)[0]).toEqual(["c.addi", "mnemonic"]);
    expect(kinds("vadd.vv v1, v2, v3, v0.t", RISCV)).toEqual([
      ["vadd.vv", "mnemonic"], ["v1", "register"], ["v2", "register"], ["v3", "register"], ["v0.t", "register"],
    ]);
  });
  it("pseudo-instructions and numeric x/f registers", () => {
    expect(kinds("mv x5, x6", RISCV)).toEqual([["mv", "mnemonic"], ["x5", "register"], ["x6", "register"]]);
    expect(kinds("ret", RISCV)).toEqual([["ret", "mnemonic"]]);
  });
  it("local labels", () => {
    expect(kinds("1: bnez a0, 1b", RISCV)).toEqual([["1:", "label"], ["bnez", "mnemonic"], ["a0", "register"], ["1b", "label"]]);
  });
  it("uppercase", () => {
    expect(kinds("ADDI A0, ZERO, 1", RISCV)).toEqual([["ADDI", "mnemonic"], ["A0", "register"], ["ZERO", "register"], ["1", "number"]]);
  });
  it("# with a space is a comment, #include is preprocessor", () => {
    expect(kinds("# if zero, skip", RISCV)).toEqual([["# if zero, skip", "comment"]]);
    expect(kinds("#include <x.h>", RISCV)).toEqual([["#include <x.h>", "directive"]]);
  });
  it("unknown mnemonic stays plain", () => {
    expect(kinds("frobnicate a0", RISCV)).toEqual([["a0", "register"]]);
  });
});
