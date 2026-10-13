// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { describeNumber } from "../src/hover/number";
import { docForElement, renderCard } from "../src/hover/hover";
import { highlightCodeElement } from "../src/adapters/reading";
import { languageForTag } from "../src/languages";

const rows = (text: string, lang = "") => Object.fromEntries(describeNumber(text, lang)?.rows ?? []);

describe("describeNumber", () => {
  it("hex in every base, width from the written digits", () => {
    expect(describeNumber("0xff")?.tag).toBe("Number · 8-bit");
    expect(rows("0xff")).toEqual({
      Unsigned: "255", "Signed (i8)": "-1", Hex: "0xff", Binary: "1111 1111", Octal: "0o377",
    });
    expect(describeNumber("0x00ff")?.tag).toBe("Number · 16-bit");
    expect(rows("0x00ff")["Signed (i16)"]).toBe("255");
  });

  it("32- and 64-bit values", () => {
    const r = rows("0xFFFFF000");
    expect(r.Unsigned).toBe("4,294,963,200");
    expect(r["Signed (i32)"]).toBe("-4,096");
    expect(r.Hex).toBe("0xffff_f000");
    expect(rows("0x8000000000000000")["Signed (i64)"]).toBe("-9,223,372,036,854,775,808");
  });

  it("binary, octal, ARM immediates, suffixes and negatives", () => {
    expect(rows("0b1010").Unsigned).toBe("10");
    expect(rows("0o17").Hex).toBe("0x0f");
    expect(rows("0755").Unsigned).toBe("493");
    expect(describeNumber("0")).toBeUndefined();
    expect(describeNumber("089")).toBeUndefined();
    expect(rows("#0x10").Unsigned).toBe("16");
    expect(rows("0x10UL").Unsigned).toBe("16");
    const neg = rows("-0x10");
    expect(neg["Signed (i8)"]).toBe("-16");
    expect(neg.Hex).toBe("0xf0");
  });

  it("ASCII when every byte is printable", () => {
    expect(rows("0x41424344").ASCII).toBe('"ABCD"');
    expect(rows("0xff").ASCII).toBeUndefined();
  });

  it("linker K/M/G and bare hex where it is the convention", () => {
    expect(rows("0x10K", "linker").Unsigned).toBe("16,384");
    expect(describeNumber("0x10K")).toBeUndefined();
    expect(rows("80000004", "objdump").Unsigned).toBe("2,147,483,652");
    expect(rows("@10000000", "devicetree").Hex).toBe("0x1000_0000");
  });

  it("leaves decimals and junk alone", () => {
    expect(describeNumber("42")).toBeUndefined();
    expect(describeNumber("1.5e3")).toBeUndefined();
    expect(describeNumber("0b102")).toBeUndefined();
  });

  it("very wide literals still get decimal and hex", () => {
    expect(rows("0x1" + "0".repeat(16)).Decimal).toBe("18446744073709551616");
  });
});

describe("number hover in a block", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("cards hex immediates and renders the rows", () => {
    const code = document.createElement("code");
    code.textContent = "li t0, 0x80000000";
    document.body.append(code);
    highlightCodeElement(code, languageForTag("riscv")!);
    const num = Array.from(code.querySelectorAll("span")).find((s) => s.textContent === "0x80000000")!;
    const doc = docForElement(num)!;
    expect(doc.tag).toBe("Number · 32-bit");
    const card = renderCard(doc, document);
    expect(card.querySelector(".asmlight-hover-summary")).toBeNull();
    const cells = Array.from(card.querySelectorAll(".asmlight-hover-rows tr")).map((tr) => tr.textContent);
    expect(cells).toContain("Signed (i32)-2,147,483,648");
  });
});
