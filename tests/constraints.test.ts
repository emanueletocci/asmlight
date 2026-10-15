import { describe, it, expect } from "vitest";
import { CONSTRAINT_LANGUAGES } from "../src/lang/constraints";
import { languageForTag } from "../src/languages";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { kinds } from "./helpers";

const k = (tag: string, src: string, line = 0) => kinds(src, languageForTag(tag)!, line);

describe("FPGA constraint files", () => {
  it("XDC: pins, I/O standards and clocks", () => {
    expect(k("xdc", "set_property -dict { PACKAGE_PIN W5 IOSTANDARD LVCMOS33 } [get_ports clk]")).toEqual([
      ["set_property", "keyword"], ["-dict", "directive"], ["PACKAGE_PIN", "property"], ["IOSTANDARD", "property"], ["get_ports", "function"],
    ]);
    expect(k("xdc", "set_property ASYNC_REG TRUE [get_cells {sync_reg[*]}]")).toEqual([
      ["set_property", "keyword"], ["ASYNC_REG", "property"], ["get_cells", "function"],
    ]);
    expect(k("xdc", "create_clock -add -name sys_clk -period 10.00 -waveform {0 5} [get_ports clk]")).toEqual([
      ["create_clock", "keyword"], ["-add", "directive"], ["-name", "directive"], ["-period", "directive"], ["10.00", "number"],
      ["-waveform", "directive"], ["0", "number"], ["5", "number"], ["get_ports", "function"],
    ]);
  });

  it("SDC: Tcl variables, commands after ; and comments", () => {
    expect(k("sdc", "set p 10.0; create_clock -period $p [get_ports clk] ;# 100 MHz")).toEqual([
      ["set", "keyword"], ["10.0", "number"], ["create_clock", "keyword"], ["-period", "directive"], ["$p", "variable"],
      ["get_ports", "function"], ["# 100 MHz", "comment"],
    ]);
    expect(k("sdc", "derive_pll_clocks")).toEqual([["derive_pll_clocks", "keyword"]]);
  });

  it("QSF: assignment names and pins", () => {
    expect(k("qsf", 'set_global_assignment -name FAMILY "Cyclone V"')).toEqual([
      ["set_global_assignment", "keyword"], ["-name", "directive"], ["FAMILY", "property"], ['"Cyclone V"', "string"],
    ]);
    expect(k("qsf", "set_location_assignment PIN_AF14 -to CLOCK_50")).toEqual([
      ["set_location_assignment", "keyword"], ["-to", "directive"],
    ]);
  });

  it("PCF", () => {
    expect(k("pcf", "set_io -nowarn clk 35 # 12 MHz")).toEqual([
      ["set_io", "keyword"], ["-nowarn", "directive"], ["35", "number"], ["# 12 MHz", "comment"],
    ]);
    expect(k("pcf", "set_frequency clk 12")).toEqual([["set_frequency", "keyword"], ["12", "number"]]);
  });

  it("backslash continuation keeps the command going", () => {
    const src = "set_false_path \\\n  -from [get_ports rst_n]";
    expect(k("xdc", src, 1)).toEqual([["-from", "directive"], ["get_ports", "function"]]);
  });

  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    for (const lang of CONSTRAINT_LANGUAGES) {
      for (const prefix of ["", "set_property ", "[", "$"]) {
        expect(() => tokenizeLines(prefix + all, lang)).not.toThrow();
        for (const ch of all) expect(() => tokenizeLines(`${prefix}${ch}${ch}-${ch} a`, lang)).not.toThrow();
      }
    }
  });
});
