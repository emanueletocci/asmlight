import { describe, it, expect } from "vitest";
import { ARM64 } from "../src/isa/arm64";
import { kinds } from "./helpers";

describe("AArch64", () => {
  it("b.cond", () => {
    expect(kinds("b.ne loop", ARM64)).toEqual([["b.ne", "mnemonic"]]);
  });
  it("pair load with post-index immediate", () => {
    expect(kinds("ldp x29, x30, [sp], #16", ARM64)).toEqual([
      ["ldp", "mnemonic"], ["x29", "register"], ["x30", "register"], ["sp", "register"], ["#16", "number"],
    ]);
  });
  it(":lo12: relocation without #", () => {
    expect(kinds("add x0, x0, :lo12:sym", ARM64)).toEqual([["add", "mnemonic"], ["x0", "register"], ["x0", "register"], [":lo12:", "reloc"]]);
  });
  it("vector arrangement registers", () => {
    expect(kinds("ld1 {v0.4s, v1.16b}, [x0]", ARM64)).toEqual([
      ["ld1", "mnemonic"], ["v0.4s", "register"], ["v1.16b", "register"], ["x0", "register"],
    ]);
  });
  it("Apple-style ; comment and // comment", () => {
    expect(kinds("mov w0, wzr ; apple", ARM64)).toEqual([["mov", "mnemonic"], ["w0", "register"], ["wzr", "register"], ["; apple", "comment"]]);
    expect(kinds("ret // done", ARM64)).toEqual([["ret", "mnemonic"], ["// done", "comment"]]);
  });
  it("uppercase and unknown", () => {
    expect(kinds("STR X0, [SP, #-16]!", ARM64)).toEqual([["STR", "mnemonic"], ["X0", "register"], ["SP", "register"], ["#-16", "number"]]);
    expect(kinds("b.xx label", ARM64)).toEqual([]);
  });
});
