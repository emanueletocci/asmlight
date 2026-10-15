// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import "./setup-dom";
import { describeNumber } from "../src/hover/number";
import { docForElement, renderCard, TOKEN_SELECTOR } from "../src/hover/hover";
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
    for (const t of ["0x4000000UL", "0x4000000ul", "0x4000000ULL", "0x4000000LLU", "0x4000000u", "0x4000000L"]) {
      expect(rows(t, "c").Unsigned).toBe("67,108,864");
    }
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
    const card = renderCard(doc, document.body);
    expect(card.querySelector(".asmlight-hover-summary")).toBeNull();
    const cells = Array.from(card.querySelectorAll(".asmlight-hover-rows tr")).map((tr) => tr.textContent);
    expect(cells).toContain("Signed (i32)-2,147,483,648");
  });
});

describe("numbers in other code blocks", () => {
  afterEach(() => { document.body.replaceChildren(); });

  it("Reading view: Prism-highlighted C numbers, suffixes included", () => {
    document.body.innerHTML = '<pre><code class="language-c">#define RAM <span class="token number">0x4000000UL</span> + <span class="token number">42</span></code></pre>';
    const [hex, dec] = Array.from(document.querySelectorAll(".token.number"));
    expect(hex.matches(TOKEN_SELECTOR)).toBe(true);
    expect(docForElement(hex)?.tag).toBe("Number · 32-bit");
    expect(docForElement(dec)).toBeUndefined();
  });

  it("Live Preview: CodeMirror-highlighted numbers in code block lines only", () => {
    document.body.innerHTML = '<div class="HyperMD-codeblock"><span class="cm-number">0b1010</span></div><div class="cm-line"><span class="cm-number">0xff</span></div>';
    const [inBlock, outside] = Array.from(document.querySelectorAll(".cm-number"));
    expect(docForElement(inBlock)?.rows).toContainEqual(["Unsigned", "10"]);
    expect(outside.closest(TOKEN_SELECTOR)).toBeNull();
  });

  it("asm blocks tokenize C-suffixed literals as one number", () => {
    const code = document.createElement("code");
    code.textContent = "li t0, 0x4000000UL";
    document.body.append(code);
    highlightCodeElement(code, languageForTag("riscv")!);
    const num = Array.from(code.querySelectorAll("span")).find((s) => s.textContent === "0x4000000UL")!;
    expect(num.className).toContain("asmlight-number");
    expect(docForElement(num)?.rows).toContainEqual(["Unsigned", "67,108,864"]);
  });
});
