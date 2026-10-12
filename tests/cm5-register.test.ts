import { describe, it, expect } from "vitest";
import { registerCm5Modes, unregisterCm5Modes, type Cm5Like } from "../src/adapters/cm5";
import { ALL_LANGUAGES } from "../src/languages";

function fakeCM(modeInfo: Cm5Like["modeInfo"] | undefined = []) {
  const CM: any = {
    modes: {} as Record<string, unknown>,
    mimeModes: {} as Record<string, unknown>,
    modeInfo,
    defineMode(n: string, f: () => unknown) { CM.modes[n] = f; },
    defineMIME(m: string, s: unknown) { CM.mimeModes[m] = s; },
    findModeByName(name: string) {
      name = name.toLowerCase();
      for (const m of CM.modeInfo ?? []) {
        if (m.name.toLowerCase() === name) return m;
        for (const a of m.alias ?? []) if (a.toLowerCase() === name) return m;
      }
    },
  };
  return CM;
}

describe("registerCm5Modes", () => {
  it("defines modes, mimes and modeInfo; findModeByName is case-insensitive", () => {
    const CM = fakeCM();
    registerCm5Modes(CM, ALL_LANGUAGES);
    for (const lang of ALL_LANGUAGES) {
      for (const tag of [lang.id, ...lang.aliases]) {
        expect(CM.modes[tag]).toBeTypeOf("function");
        expect(CM.findModeByName(tag.toUpperCase())?.mode).toBe(lang.id);
      }
      expect(CM.mimeModes[`text/x-asmlight-${lang.id}`]).toBe(lang.id);
    }
    expect(CM.findModeByName("RISCV").mime).toBe("text/x-asmlight-riscv");
  });

  it("does not override names already claimed by another modeInfo entry", () => {
    const other = { name: "Other", mime: "text/x-o", mode: "o", alias: ["ARM"] };
    const CM = fakeCM([other]);
    registerCm5Modes(CM, ALL_LANGUAGES);
    expect(CM.findModeByName("arm")).toBe(other);
    expect(CM.findModeByName("arm32").mode).toBe("arm32");
    expect(other.alias).toEqual(["ARM"]);
  });

  it("works without modeInfo or CM", () => {
    const CM = fakeCM(undefined);
    registerCm5Modes(CM, ALL_LANGUAGES);
    expect(CM.modes.riscv).toBeTypeOf("function");
    expect(() => registerCm5Modes(undefined, ALL_LANGUAGES)).not.toThrow();
  });
});

describe("unregisterCm5Modes", () => {
  it("removes exactly what was added", () => {
    const other = { name: "Other", mime: "text/x-o", mode: "o", alias: ["o"] };
    const CM = fakeCM([other]);
    CM.modes.keep = 1;
    registerCm5Modes(CM, ALL_LANGUAGES);
    unregisterCm5Modes(CM, ALL_LANGUAGES);
    expect(CM.modes).toEqual({ keep: 1 });
    expect(CM.mimeModes).toEqual({});
    expect(CM.modeInfo).toEqual([other]);
    expect(() => unregisterCm5Modes(undefined, ALL_LANGUAGES)).not.toThrow();
  });
});
