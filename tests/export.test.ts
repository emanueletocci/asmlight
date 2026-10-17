// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import "./setup-dom";
import { standaloneSvgs } from "../src/svg/export";

describe("standaloneSvgs", () => {
  it("gives one complete, light SVG file per register, named after the register", () => {
    const files = standaloneSvgs("regmap", "SHPR2: 32 = 0x80000000\nPRI_11 31:24\nSHPR3: 32\nPRI_15 31:24");
    expect(files.map((f) => f.name)).toEqual(["SHPR2", "SHPR3"]);
    const svg = files[0].svg;
    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    // plain light colors: no CSS variables, no stylesheet, a white background
    expect(svg).not.toContain("var(");
    expect(svg).not.toContain("<style");
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain("fill: #f6f8fa");
    expect(svg).not.toContain("max-width");
  });

  it("names a memory map after its title", () => {
    const [file] = standaloneSvgs("memmap", "title: Cortex-M3 map\n0x0 4M FLASH");
    expect(file.name).toBe("Cortex-M3-map");
    expect(file.svg).toContain("FLASH");
  });
});
