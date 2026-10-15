import { describe, it, expect } from "vitest";
import { VERILOG } from "../src/lang/verilog";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { kinds } from "./helpers";

const k = (src: string, line = 0) => kinds(src, VERILOG, line);

describe("Verilog / SystemVerilog", () => {
  it("module header: names, parameters, ports", () => {
    expect(k("module counter #(parameter W = 8) (input logic clk,")).toEqual([
      ["module", "keyword"], ["counter", "label"], ["#", "operator"], ["parameter", "keyword"], ["8", "number"],
      ["input", "keyword"], ["logic", "keyword"],
    ]);
    expect(k("endmodule : counter")).toEqual([["endmodule", "keyword"], ["counter", "label"]]);
  });

  it("number literals", () => {
    expect(k("x = 8'hFF + 'b1010 + 4'sd3 + 32'hdead_beef + '0 + 1'bx;").map(([t]) => t)).toEqual([
      "8'hFF", "'b1010", "4'sd3", "32'hdead_beef", "'0", "1'bx",
    ]);
    expect(k("#10.5ns;")).toEqual([["#", "operator"], ["10.5ns", "number"]]);
  });

  it("nonblocking <= vs less-or-equal", () => {
    expect(k("always_ff @(posedge clk) q <= d;")).toEqual([
      ["always_ff", "keyword"], ["@", "operator"], ["posedge", "keyword"], ["<=", "operator"],
    ]);
    expect(k("if (a <= b) q <= a <= b;")).toEqual([["if", "keyword"], ["<=", "operator"]]);
    expect(k("assign y = a <= b;")).toEqual([["assign", "keyword"]]);
    expect(k("{a, b} <= c;")).toEqual([["<=", "operator"]]);
    expect(k("if (rst) q <= 0;\nelse q <= q + 1;", 1)).toEqual([["else", "keyword"], ["<=", "operator"], ["1", "number"]]);
  });

  it("named blocks", () => {
    expect(k("begin : g_loop")).toEqual([["begin", "keyword"], ["g_loop", "label"]]);
    expect(k("end : g_loop")).toEqual([["end", "keyword"], ["g_loop", "label"]]);
  });

  it("directives, macros, system tasks, strings", () => {
    expect(k("`timescale 1ns / 1ps")).toEqual([["`timescale", "directive"], ["1ns", "number"], ["1ps", "number"]]);
    expect(k("`ifdef SIM")).toEqual([["`ifdef", "directive"]]);
    expect(k("x = `WIDTH;")).toEqual([["`WIDTH", "variable"]]);
    expect(k('$display("q=%h", q);')).toEqual([["$display", "function"], ['"q=%h"', "string"]]);
  });

  it("instances: parameter overrides and named port connections", () => {
    expect(k("fifo #(.DEPTH(16)) u0 (.clk(clk), .*);")).toEqual([
      ["#", "operator"], [".DEPTH", "property"], ["16", "number"], [".clk", "property"],
    ]);
  });

  it("attributes, but not @(*)", () => {
    expect(k('(* ASYNC_REG = "TRUE" *) logic s;')).toEqual([['(* ASYNC_REG = "TRUE" *)', "directive"], ["logic", "keyword"]]);
    expect(k("always @(*) y = a;")).toEqual([["always", "keyword"], ["@", "operator"]]);
  });

  it("comments, also across lines", () => {
    expect(k("a = 1; // note")).toEqual([["1", "number"], ["// note", "comment"]]);
    const src = "/* start\n module x\n end */ wire w;";
    expect(k(src, 1)).toEqual([[" module x", "comment"]]);
    expect(k(src, 2)).toEqual([[" end */", "comment"], ["wire", "keyword"]]);
  });

  it("SystemVerilog assertions", () => {
    expect(k("assert property (@(posedge clk) req |-> ##[1:3] ack);")).toEqual([
      ["assert", "keyword"], ["property", "keyword"], ["@", "operator"], ["posedge", "keyword"],
      ["|->", "operator"], ["##", "operator"], ["1", "number"], ["3", "number"],
    ]);
  });

  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    for (const prefix of ["", "module ", "`", "(* ", "/* ", "8'h", "$"]) {
      expect(() => tokenizeLines(prefix + all, VERILOG)).not.toThrow();
      for (const ch of all) expect(() => tokenizeLines(`${prefix}${ch}${ch}'${ch} a`, VERILOG)).not.toThrow();
    }
  });
});
