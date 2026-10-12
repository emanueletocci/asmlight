// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { docForElement, HoverController, parseTokenClasses, placeCard, renderCard } from "../src/hover/hover";
import { highlightCodeElement } from "../src/adapters/reading";
import { languageForTag } from "../src/languages";

describe("parseTokenClasses", () => {
  it("reads Reading-view and editor class names", () => {
    expect(parseTokenClasses(["token", "keyword", "asmligh-mnemonic", "asmligh-lang-riscv"])).toEqual({ kind: "mnemonic", lang: "riscv" });
    expect(parseTokenClasses(["cm-keyword", "cm-asmligh-mnemonic", "cm-asmligh-lang-arm64"])).toEqual({ kind: "mnemonic", lang: "arm64" });
    expect(parseTokenClasses(["asmligh-regmap-field"])).toBeUndefined();
  });
});

describe("placeCard", () => {
  const vp = { width: 800, height: 600 };
  it("below the anchor, clamped horizontally", () => {
    expect(placeCard({ left: 100, top: 100, bottom: 120 }, { width: 300, height: 100 }, vp)).toEqual({ left: 100, top: 126 });
    expect(placeCard({ left: 700, top: 100, bottom: 120 }, { width: 300, height: 100 }, vp)).toEqual({ left: 492, top: 126 });
  });
  it("above when there is no room below", () => {
    expect(placeCard({ left: 10, top: 550, bottom: 570 }, { width: 300, height: 100 }, vp)).toEqual({ left: 10, top: 444 });
  });
});

describe("hover in a highlighted block", () => {
  afterEach(() => { document.body.replaceChildren(); vi.useRealTimers(); });

  function block(tag: string, src: string) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.className = `language-${tag}`;
    code.textContent = src;
    pre.append(code);
    document.body.append(pre);
    highlightCodeElement(code, languageForTag(tag)!);
    return code;
  }

  it("finds docs for highlighted tokens", () => {
    const code = block("riscv", "csrw mtvec, t0");
    const [mn, csr] = code.querySelectorAll("span");
    expect(docForElement(mn)?.syntax).toMatch(/^csrw csr, rs/);
    expect(docForElement(csr)?.tag).toBe("RISC-V CSR · 0x305");
  });

  it("renders a card with escaped text", () => {
    const card = renderCard({ title: "<b>", tag: "t", summary: "s", syntax: "x", operation: "y", notes: ["n"] }, document);
    expect(card.querySelector("b")).toBeNull();
    expect(card.querySelectorAll(".asmligh-hover-block")).toHaveLength(2);
    expect(card.querySelector(".asmligh-hover-notes li")!.textContent).toBe("n");
  });

  function setup(opts: Partial<{ enabled: boolean; mod: boolean }> = {}) {
    vi.useFakeTimers();
    const code = block("arm32", "msr PSP, r0");
    const ctl = new HoverController(document, {
      enabled: () => opts.enabled ?? true, requireModifier: () => opts.mod ?? false, delay: () => 300,
    });
    const tokens = code.querySelectorAll("span");
    const over = (el: Element, init: MouseEventInit = {}) => el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, ...init }));
    const card = () => document.querySelector(".asmligh-hover");
    return { ctl, tokens, over, card, code };
  }

  it("shows after the delay, switches tokens, hides on leaving", () => {
    const { ctl, tokens, over, card, code } = setup();
    over(tokens[1]);
    expect(card()).toBeNull();
    vi.advanceTimersByTime(300);
    expect(card()!.querySelector(".asmligh-hover-title")!.textContent).toBe("PSP");
    over(tokens[2]);
    expect(card()).toBeNull();
    vi.advanceTimersByTime(300);
    expect(card()!.querySelector(".asmligh-hover-title")!.textContent).toBe("r0");
    over(code);
    expect(card()).toBeNull();
    ctl.destroy();
  });

  it("hides on scroll and on key presses, not on clicking the token itself", () => {
    const { ctl, tokens, over, card } = setup();
    over(tokens[0]);
    tokens[0].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    vi.advanceTimersByTime(300);
    expect(card()).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(card()).toBeNull();
    over(tokens[1]);
    vi.advanceTimersByTime(300);
    document.dispatchEvent(new Event("scroll"));
    expect(card()).toBeNull();
    ctl.destroy();
  });

  it("respects the enabled and modifier settings", () => {
    let s = setup({ enabled: false });
    s.over(s.tokens[0]);
    vi.advanceTimersByTime(1000);
    expect(s.card()).toBeNull();
    s.ctl.destroy();
    document.body.replaceChildren();

    s = setup({ mod: true });
    s.over(s.tokens[0]);
    vi.advanceTimersByTime(1000);
    expect(s.card()).toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Control" }));
    vi.advanceTimersByTime(0);
    expect(s.card()).not.toBeNull();
    s.ctl.destroy();
  });

  it("destroy removes the card and the listeners", () => {
    const { ctl, tokens, over, card } = setup();
    over(tokens[0]);
    vi.advanceTimersByTime(300);
    ctl.destroy();
    expect(card()).toBeNull();
    over(tokens[1]);
    vi.advanceTimersByTime(300);
    expect(card()).toBeNull();
  });
});
