import { describe, it, expect } from "vitest";
import { LINKER } from "../src/lang/linker";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { kinds } from "./helpers";

const k = (src: string, line = 0) => kinds(src, LINKER, line);

describe("linker script", () => {
  it("top-level commands", () => {
    expect(k('OUTPUT_FORMAT("elf32-littlearm")')).toEqual([["OUTPUT_FORMAT", "keyword"], ['"elf32-littlearm"', "string"]]);
    expect(k("ENTRY(Reset_Handler)")).toEqual([["ENTRY", "keyword"]]);
  });

  it("MEMORY regions with sizes", () => {
    expect(k("  FLASH (rx) : ORIGIN = 0x08000000, LENGTH = 512K")).toEqual([
      ["FLASH", "label"], ["ORIGIN", "function"], ["=", "operator"], ["0x08000000", "number"],
      ["LENGTH", "function"], ["=", "operator"], ["512K", "number"],
    ]);
  });

  it("output sections, input patterns and region assignment", () => {
    expect(k(".text : { KEEP(*(.isr_vector)) *(.text*) } > FLASH")).toEqual([
      [".text", "label"], ["KEEP", "keyword"], [".isr_vector", "label"], [".text", "label"],
      [">", "operator"], ["FLASH", "label"],
    ]);
    expect(k(".data : AT> FLASH")).toEqual([[".data", "label"], ["AT", "keyword"], [">", "operator"], ["FLASH", "label"]]);
    expect(k("/DISCARD/ : { *(.comment) }")).toEqual([["/DISCARD/", "keyword"], [".comment", "label"]]);
  });

  it("symbol assignments and the location counter", () => {
    expect(k(". = ALIGN(4);")).toEqual([[".", "variable"], ["=", "operator"], ["ALIGN", "function"], ["4", "number"]]);
    expect(k("_estack = ORIGIN(RAM) + LENGTH(RAM);")).toEqual([
      ["_estack", "variable"], ["=", "operator"], ["ORIGIN", "function"], ["LENGTH", "function"],
    ]);
    expect(k("PROVIDE(end = .);")).toEqual([["PROVIDE", "keyword"], ["end", "variable"], ["=", "operator"], [".", "variable"]]);
    expect(k(". += 0x400;")).toEqual([[".", "variable"], ["+=", "operator"], ["0x400", "number"]]);
  });

  it("comparisons are not assignments or region refs", () => {
    expect(k('ASSERT(_end >= 0x100 && a > b, "too big")')).toEqual([
      ["ASSERT", "keyword"], ["0x100", "number"], ['"too big"', "string"],
    ]);
  });

  it("block comments across lines and preprocessor lines", () => {
    const src = "/* a\n b */ SECTIONS\n#include \"mem.ld\"";
    expect(k(src, 0)).toEqual([["/* a", "comment"]]);
    expect(k(src, 1)).toEqual([[" b */", "comment"], ["SECTIONS", "keyword"]]);
    expect(k(src, 2)).toEqual([['#include "mem.ld"', "directive"]]);
  });

  it("keywords are case-sensitive", () => {
    expect(k("sections")).toEqual([]);
  });

  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    expect(() => tokenizeLines(all, LINKER)).not.toThrow();
    for (const ch of all) expect(() => tokenizeLines(`.x ${ch}${ch} > R`, LINKER)).not.toThrow();
  });
});
