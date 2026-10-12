import { describe, it, expect } from "vitest";
import { ARM32 } from "../src/isa/arm32";
import { kinds } from "./helpers";

describe("ARM32", () => {
  it("UAL s+cond suffix, # immediate, @ comment", () => {
    expect(kinds("addseq r0, r1, #4 @ c", ARM32)).toEqual([
      ["addseq", "mnemonic"], ["r0", "register"], ["r1", "register"], ["#4", "number"], ["@ c", "comment"],
    ]);
  });
  it("pre-UAL cond+s order", () => {
    expect(kinds("addeqs r0, r0, r1", ARM32)[0]).toEqual(["addeqs", "mnemonic"]);
  });
  it("branch with condition and local label ref", () => {
    expect(kinds("bls 1f", ARM32)).toEqual([["bls", "mnemonic"], ["1f", "label"]]);
  });
  it("register lists and writeback", () => {
    expect(kinds("push {r4-r7, lr}", ARM32)).toEqual([["push", "mnemonic"], ["r4", "register"], ["r7", "register"], ["lr", "register"]]);
    expect(kinds("ldr r0, [r1, #-4]!", ARM32)).toEqual([["ldr", "mnemonic"], ["r0", "register"], ["r1", "register"], ["#-4", "number"]]);
  });
  it("VFP/NEON qualifiers and IT blocks", () => {
    expect(kinds("vadd.f32 s0, s1, s2", ARM32)).toEqual([["vadd.f32", "mnemonic"], ["s0", "register"], ["s1", "register"], ["s2", "register"]]);
    expect(kinds("add.w r0, r0, #1", ARM32)[0]).toEqual(["add.w", "mnemonic"]);
    expect(kinds("itete eq", ARM32)).toEqual([["itete", "mnemonic"]]);
  });
  it("movw with :lower16: relocation", () => {
    expect(kinds("movw r0, #:lower16:sym", ARM32)).toEqual([
      ["movw", "mnemonic"], ["r0", "register"], ["#", "number"], [":lower16:", "reloc"],
    ]);
  });
  it("Keil ; and // comments, # immediate before comment", () => {
    expect(kinds("mov r0, #0x10 ; keil", ARM32)).toEqual([["mov", "mnemonic"], ["r0", "register"], ["#0x10", "number"], ["; keil", "comment"]]);
    expect(kinds("mov r0, #1 // c", ARM32).slice(-1)[0]).toEqual(["// c", "comment"]);
  });
  it("uppercase", () => {
    expect(kinds("LDR R0, [PC, #8]", ARM32)).toEqual([["LDR", "mnemonic"], ["R0", "register"], ["PC", "register"], ["#8", "number"]]);
  });
});
