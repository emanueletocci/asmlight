// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { fieldValue, formatValue, layoutRows, parseNumber, parseRegmap } from "../src/regmap/parse";
import { renderRegmap } from "../src/regmap/render";

const MSTATUS = `
# RISC-V mstatus (subset)
mstatus: 32 = 0x1888  Machine status
MPP   12:11  Previous privilege {0: U, 1: S, 3: M}
MPIE  7      Previous MIE
MIE   3      Machine interrupt enable
`;

describe("parseRegmap", () => {
  it("header with width, value and caption; fields sorted MSB first", () => {
    const [r] = parseRegmap(MSTATUS);
    expect(r).toMatchObject({ name: "mstatus", width: 32, perRow: 32, caption: "Machine status", errors: [] });
    expect(r.value).toBe(BigInt(0x1888));
    expect(r.fields.map((f) => [f.name, f.hi, f.lo])).toEqual([["MPP", 12, 11], ["MPIE", 7, 7], ["MIE", 3, 3]]);
    expect(r.fields[0]).toMatchObject({ desc: "Previous privilege", enums: [[BigInt(0), "U"], [BigInt(1), "S"], [BigInt(3), "M"]] });
  });

  it("bit range spellings, reserved names, row width, quoted names", () => {
    const [r] = parseRegmap('"PTE (Sv39)": 64 / 16\nPPN [53-10]\nRSW 9:8\n- 63:54\nD 7');
    expect(r).toMatchObject({ name: "PTE (Sv39)", width: 64, perRow: 16 });
    expect(r.fields.map((f) => [f.name, f.hi, f.lo, f.reserved])).toEqual([
      ["-", 63, 54, true], ["PPN", 53, 10, false], ["RSW", 9, 8, false], ["D", 7, 7, false],
    ]);
  });

  it("infers the width without a header and splits multiple registers", () => {
    const regs = parseRegmap("EN 0\nMODE 5:4\n\nctrl: 8\nGO 7");
    expect(regs.map((r) => [r.name, r.width])).toEqual([["", 8], ["ctrl", 8]]);
    expect(parseRegmap("X 40")[0].width).toBe(64);
  });

  it("a standalone = line sets the value", () => {
    expect(parseRegmap("r: 8\nA 7:4\n= 0b1010_0000")[0].value).toBe(BigInt(0xa0));
  });

  it("reports overlaps, out-of-range bits, bad values and bad lines", () => {
    const [r] = parseRegmap("r: 8 = 0x1FF\nA 7:4\nB 5\nC 9\nwhat is this\n= zz");
    expect(r.errors).toEqual([
      'line 5: expected "NAME hi:lo description", got "what is this"',
      'line 6: "zz" is not a number',
      "C: bit 9 is outside a 8-bit register",
      "B overlaps A",
      "value does not fit in 8 bits",
    ]);
  });
});

describe("layoutRows", () => {
  it("fills gaps and splits rows", () => {
    const [r] = parseRegmap("r: 16 / 8\nA 11:4\nB 1");
    expect(layoutRows(r).map((row) => row.map((s) => [s.hi, s.lo, s.field?.name]))).toEqual([
      [[15, 12, undefined], [11, 8, "A"]],
      [[7, 4, "A"], [3, 2, undefined], [1, 1, "B"], [0, 0, undefined]],
    ]);
  });
  it("covers every bit exactly once even with overlaps", () => {
    const [r] = parseRegmap("r: 32\nA 20:10\nB 15:12\nC 31");
    const bits = layoutRows(r).flat().reduce((n, s) => n + s.hi - s.lo + 1, 0);
    expect(bits).toBe(32);
  });
});

describe("values", () => {
  it("parses numbers and extracts fields", () => {
    expect(parseNumber("0x8000_0000_0000_0008")).toBe(BigInt("0x8000000000000008"));
    expect(parseNumber("0o17")).toBe(BigInt(15));
    expect(parseNumber("12abc")).toBeUndefined();
    expect(fieldValue(BigInt(0x1888), 12, 11)).toBe(BigInt(3));
    expect(formatValue(BigInt(1), 1)).toBe("1");
    expect(formatValue(BigInt(3), 2)).toBe("0b11 (3)");
    expect(formatValue(BigInt(255), 8)).toBe("0xFF (255)");
  });
});

describe("renderRegmap", () => {
  it("draws bit numbers, fields, bit values and a legend with decoded enums", () => {
    const el = document.createElement("div");
    renderRegmap(MSTATUS, el);
    expect(el.querySelector(".asmlight-regmap-title")!.textContent).toBe("mstatus32-bit= 0x00001888Machine status");
    const bitnos = Array.from(el.querySelectorAll(".asmlight-regmap-bitno")).map((n) => n.textContent);
    expect(bitnos[0]).toBe("31");
    expect(bitnos[31]).toBe("0");
    const fields = Array.from(el.querySelectorAll<HTMLElement>(".asmlight-regmap-field"));
    expect(fields.map((f) => [f.textContent, f.style.gridColumn])).toEqual([
      ["", "span 19"], ["MPP", "span 2"], ["", "span 3"], ["MPIE", "span 1"], ["", "span 3"], ["MIE", "span 1"], ["", "span 3"],
    ]);
    expect(fields[3].querySelector(".is-vertical")).not.toBeNull();
    expect(el.querySelectorAll(".asmlight-regmap-bit.is-set")).toHaveLength(4);
    const rows = Array.from(el.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent));
    expect(rows[0]).toEqual(["12:11", "MPP", "0b11 (3) → M", "Previous privilege0 = U, 1 = S, 3 = M"]);
  });

  it("shows errors and a hint for empty blocks", () => {
    const el = document.createElement("div");
    renderRegmap("A 3\nB 3", el);
    expect(el.querySelector(".asmlight-regmap-errors")!.textContent).toBe("B overlaps A");
    renderRegmap("# nothing", el);
    expect(el.querySelector(".asmlight-regmap-empty")).not.toBeNull();
  });

  it("only uses textContent, so field names cannot inject markup", () => {
    const el = document.createElement("div");
    renderRegmap("<img/src=x> 3 <b>bold</b>", el);
    expect(el.querySelector("img, b")).toBeNull();
  });
});
