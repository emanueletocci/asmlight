import { describe, it, expect } from "vitest";
import { LINKMAP } from "../src/lang/linkmap";
import { describeLinkmap } from "../src/docs/linkmap";
import { languageForTag } from "../src/languages";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { kinds } from "./helpers";

const MAP = `Discarded input sections

 .text          0x00000000        0x0 build/src/main.o
 .data          0x00000000        0x0 build/src/main.o

Memory Configuration

Name             Origin             Length             Attributes
FLASH            0x00000000         0x00400000         xr
RAM              0x20000000         0x00400000         xrw
*default*        0x00000000         0xffffffff

Linker script and memory map

LOAD build/boot/startup.o
LOAD build/src/main.o
START GROUP
LOAD /usr/lib/gcc/arm-none-eabi/13.2.1/thumb/v7-m/nofp/libgcc.a
END GROUP
                0x20400000                _estack = (ORIGIN (RAM) + LENGTH (RAM))

.isr_vector     0x00000000       0x40
                0x00000000                . = ALIGN (0x4)
 *(.isr_vector)
 .isr_vector    0x00000000       0x40 build/boot/startup.o

.text           0x00000040       0xa0
 *(.text*)
 .text          0x00000040       0x64 build/boot/startup.o
                0x00000048                Reset_Handler
 .text          0x000000a4       0x2c build/src/main.o
                0x000000bc                main
 .rodata        0x000000d0        0xe build/src/main.o
 *fill*         0x000000de        0x2
                [!provide]                PROVIDE (end = .)

.data           0x20000000        0x0 load address 0x000000e0
                0x20000000                _sdata = .
OUTPUT(build/scratch-os.axf elf32-littlearm)`;

const k = (line: number) => kinds(MAP, LINKMAP, line);
const lineOf = (text: string) => MAP.split("\n").findIndex((l) => l.startsWith(text));

describe("linker map files", () => {
  it("is selected by its fence tags", () => {
    for (const tag of ["linkmap", "map", "mapfile", "LDMAP"]) expect(languageForTag(tag)).toBe(LINKMAP);
  });

  it("headings and column titles", () => {
    expect(k(lineOf("Discarded input sections"))).toEqual([["Discarded input sections", "keyword"]]);
    expect(k(lineOf("Memory Configuration"))).toEqual([["Memory Configuration", "keyword"]]);
    expect(k(lineOf("Name"))).toEqual([["Name             Origin             Length             Attributes", "comment"]]);
  });

  it("memory regions: name, origin, length, attributes", () => {
    expect(k(lineOf("FLASH"))).toEqual([["FLASH", "label"], ["0x00000000", "number"], ["0x00400000", "number"], ["xr", "property"]]);
    expect(k(lineOf("*default*"))).toEqual([["*default*", "keyword"], ["0x00000000", "number"], ["0xffffffff", "number"]]);
  });

  it("output sections, input sections, object files and symbols", () => {
    expect(k(lineOf(".text           0x00000040"))).toEqual([[".text", "label"], ["0x00000040", "number"], ["0xa0", "number"]]);
    expect(k(lineOf(" .text          0x00000040"))).toEqual([
      [".text", "property"], ["0x00000040", "number"], ["0x64", "number"], ["build/boot/startup.o", "string"],
    ]);
    expect(k(lineOf("                0x00000048"))).toEqual([["0x00000048", "number"], ["Reset_Handler", "variable"]]);
    // input sections in the discarded part are input sections too
    expect(k(lineOf(" .data          0x00000000"))[0]).toEqual([".data", "property"]);
  });

  it("linker-script lines echoed into the map", () => {
    expect(k(lineOf("                0x20400000"))).toEqual([
      ["0x20400000", "number"], ["_estack", "variable"], ["=", "operator"], ["ORIGIN", "function"], ["LENGTH", "function"],
    ]);
    expect(k(lineOf("                0x00000000                . = ALIGN"))).toEqual([
      ["0x00000000", "number"], [".", "variable"], ["=", "operator"], ["ALIGN", "function"], ["0x4", "number"],
    ]);
    expect(k(lineOf(" *(.text*)"))).toEqual([["*(.text*)", "directive"]]);
    expect(k(lineOf(" *fill*"))).toEqual([["*fill*", "keyword"], ["0x000000de", "number"], ["0x2", "number"]]);
    expect(k(lineOf("                [!provide]"))).toEqual([["[!provide]", "keyword"], ["PROVIDE", "keyword"], ["=", "operator"], [".", "variable"]]);
  });

  it("LOAD, archives, groups, load address and OUTPUT", () => {
    expect(k(lineOf("LOAD build/boot"))).toEqual([["LOAD", "keyword"], ["build/boot/startup.o", "string"]]);
    expect(k(lineOf("LOAD /usr"))[1][1]).toBe("string");
    expect(k(lineOf("START GROUP"))).toEqual([["START", "keyword"], ["GROUP", "keyword"]]);
    expect(k(lineOf(".data"))).toEqual([[".data", "label"], ["0x20000000", "number"], ["0x0", "number"], ["load address", "keyword"], ["0x000000e0", "number"]]);
    expect(k(lineOf("OUTPUT"))).toEqual([["OUTPUT", "keyword"], ["build/scratch-os.axf", "string"]]);
  });

  it("every highlighted token has a hover card", () => {
    for (const line of tokenizeLines(MAP, LINKMAP)) {
      for (const t of line) {
        if (t.kind === null || t.kind === "number" || t.kind === "operator") continue;
        expect(describeLinkmap(t.text, t.kind), `${t.text} (${t.kind})`).toBeDefined();
      }
    }
  });

  it("hover cards explain the parts of the map", () => {
    expect(describeLinkmap("Discarded input sections", "keyword")!.summary).toMatch(/gc-sections/);
    expect(describeLinkmap(".data", "label")!.notes![0]).toMatch(/RAM.*Flash/);
    expect(describeLinkmap(".text", "property")!.tag).toMatch(/input section/);
    expect(describeLinkmap("FLASH", "label")!.summary).toMatch(/MEMORY/);
    expect(describeLinkmap("_sidata", "variable")!.notes![0]).toMatch(/LMA/);
    expect(describeLinkmap("load address", "keyword")!.summary).toMatch(/LMA/);
    expect(describeLinkmap(".debug_info", "property")!.notes![0]).toMatch(/debug/);
    expect(describeLinkmap(".text.Reset_Handler", "property")!.notes![0]).toMatch(/code/i);
  });

  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    expect(() => tokenizeLines(all, LINKMAP)).not.toThrow();
    for (const ch of all) expect(() => tokenizeLines(`Memory Configuration\nX ${ch}${ch} 0x1\n .t ${ch} a.o`, LINKMAP)).not.toThrow();
  });
});
