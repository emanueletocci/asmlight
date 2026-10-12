import { describe, it, expect } from "vitest";
import { StringStream } from "@codemirror/language";
import { ALL_ISAS, isaForTag } from "../src/isa";
import { RISCV } from "../src/isa/riscv";
import { toCm5Mode } from "../src/adapters/cm5";
import { ALL_LANGUAGES, languageForTag } from "../src/languages";
import { asmLanguage } from "../src/tokenizer/parser";

describe("registry", () => {
  it("resolves ids and aliases case-insensitively", () => {
    expect(isaForTag("RISCV")?.id).toBe("riscv");
    expect(isaForTag("aarch64")?.id).toBe("arm64");
    expect(isaForTag("Thumb")?.id).toBe("arm32");
  });
  it("leaves tags it does not own alone", () => {
    expect(isaForTag("armasm")).toBeUndefined();
    expect(isaForTag("asm")).toBeUndefined();
    expect(isaForTag("js")).toBeUndefined();
  });
  it("no tag is claimed twice", () => {
    const tags = ALL_ISAS.flatMap((i) => [i.id, ...i.aliases]);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("language registry", () => {
  it("resolves assembly, Makefile and linker script tags", () => {
    expect(languageForTag("RV64")?.id).toBe("riscv");
    expect(languageForTag("Makefile")?.id).toBe("makefile");
    expect(languageForTag("make")?.id).toBe("makefile");
    expect(languageForTag("LD")?.id).toBe("linker");
    expect(languageForTag("lds")?.id).toBe("linker");
    expect(languageForTag("cmake")).toBeUndefined();
  });
  it("no tag is claimed twice", () => {
    const tags = ALL_LANGUAGES.flatMap((l) => [l.id, ...l.aliases]);
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("cm5 adapter", () => {
  it("maps token kinds to cm style + asmlight class", () => {
    const mode = toCm5Mode(asmLanguage(RISCV));
    const stream = new StringStream("addi a0", 4, 2);
    expect(mode.token(stream, mode.startState())).toBe("keyword asmlight-mnemonic asmlight-lang-riscv");
  });
});
