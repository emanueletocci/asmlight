import { describe, it, expect } from "vitest";
import { StringStream } from "@codemirror/language";
import { ALL_ISAS, isaForTag } from "../src/isa";
import { RISCV } from "../src/isa/riscv";
import { toCm5Mode } from "../src/adapters/cm5";

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

describe("cm5 adapter", () => {
  it("maps token kinds to cm style + asmligh class", () => {
    const mode = toCm5Mode(RISCV);
    const stream = new StringStream("addi a0", 4, 2);
    expect(mode.token(stream, mode.startState())).toBe("keyword asmligh-mnemonic");
  });
});
