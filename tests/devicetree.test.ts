import { describe, it, expect } from "vitest";
import { DEVICETREE } from "../src/lang/devicetree";
import { tokenizeLines } from "../src/tokenizer/tokenizeLines";
import { kinds } from "./helpers";

const k = (src: string, line = 0) => kinds(src, DEVICETREE, line);

describe("devicetree", () => {
  it("header, includes and preprocessor", () => {
    expect(k("/dts-v1/;")).toEqual([["/dts-v1/", "keyword"]]);
    expect(k('/include/ "board.dtsi"')).toEqual([["/include/", "keyword"], ['"board.dtsi"', "string"]]);
    expect(k("#include <dt-bindings/interrupt-controller/arm-gic.h>")).toEqual([
      ["#include <dt-bindings/interrupt-controller/arm-gic.h>", "directive"],
    ]);
  });

  it("root and nodes with labels and unit addresses", () => {
    expect(k("/ {")).toEqual([["/", "function"]]);
    expect(k("uart0: serial@10000000 {")).toEqual([["uart0:", "label"], ["serial", "function"], ["@10000000", "number"]]);
    expect(k("cpus {")).toEqual([["cpus", "function"]]);
    expect(k("a: b: node {")).toEqual([["a:", "label"], ["b:", "label"], ["node", "function"]]);
  });

  it("properties: cells, strings, phandles and macros", () => {
    expect(k("#address-cells = <2>;")).toEqual([["#address-cells", "property"], ["2", "number"]]);
    expect(k('compatible = "sifive,uart0", "ns16550a";')).toEqual([
      ["compatible", "property"], ['"sifive,uart0"', "string"], ['"ns16550a"', "string"],
    ]);
    expect(k("interrupts = <GIC_SPI 33 IRQ_TYPE_LEVEL_HIGH>;")).toEqual([
      ["interrupts", "property"], ["GIC_SPI", "variable"], ["33", "number"], ["IRQ_TYPE_LEVEL_HIGH", "variable"],
    ]);
    expect(k("clocks = <&rcc 12>, <&{/soc/clk}>;")).toEqual([
      ["clocks", "property"], ["&rcc", "label"], ["12", "number"], ["&{/soc/clk}", "label"],
    ]);
    expect(k("riscv,isa = \"rv64imac\";")[0]).toEqual(["riscv,isa", "property"]);
    expect(k("dma-coherent;")).toEqual([["dma-coherent", "property"]]);
  });

  it("several statements on one line", () => {
    expect(k('cpu@0 { reg = <0>; status = "okay"; };')).toEqual([
      ["cpu", "function"], ["@0", "number"], ["reg", "property"], ["0", "number"], ["status", "property"], ['"okay"', "string"],
    ]);
  });

  it("values continue across lines until ;", () => {
    const src = "reg = <0x0 0x80000000\n       0x0 0x40000000>;\nstatus = \"okay\";";
    expect(k(src, 1)).toEqual([["0x0", "number"], ["0x40000000", "number"]]);
    expect(k(src, 2)[0]).toEqual(["status", "property"]);
  });

  it("bytestrings, /bits/ and /memreserve/", () => {
    expect(k("local-mac-address = [00 11 aa BB];")).toEqual([
      ["local-mac-address", "property"], ["00", "number"], ["11", "number"], ["aa", "number"], ["BB", "number"],
    ]);
    expect(k("v = /bits/ 8 <0x12>;")).toEqual([["v", "property"], ["/bits/", "keyword"], ["8", "number"], ["0x12", "number"]]);
    expect(k("/memreserve/ 0x80000000 0x200000;")).toEqual([["/memreserve/", "keyword"], ["0x80000000", "number"], ["0x200000", "number"]]);
  });

  it("overrides and deletes by reference", () => {
    expect(k("&uart0 {")).toEqual([["&uart0", "label"]]);
    expect(k("/delete-node/ &uart1;")).toEqual([["/delete-node/", "keyword"], ["&uart1", "label"]]);
    expect(k("/delete-property/ clocks;")).toEqual([["/delete-property/", "keyword"], ["clocks", "property"]]);
  });

  it("comments", () => {
    const src = "// line\n/* a\n b */ cpus {";
    expect(k(src, 0)).toEqual([["// line", "comment"]]);
    expect(k(src, 2)).toEqual([[" b */", "comment"], ["cpus", "function"]]);
  });

  it("fuzz: always makes progress", () => {
    const all = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
    for (const prefix of ["", "a = <", "x = [", "n@1 { "]) {
      expect(() => tokenizeLines(prefix + all, DEVICETREE)).not.toThrow();
      for (const ch of all) expect(() => tokenizeLines(`${prefix}${ch}${ch} a`, DEVICETREE)).not.toThrow();
    }
  });
});
