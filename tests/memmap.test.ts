// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import "./setup-dom";
import { formatAddr, formatSize, layout, parseMemmap, parseSize, type LayoutItem } from "../src/memmap/parse";
import { renderMemmap } from "../src/memmap/render";

const B = (n: number | string) => BigInt(n);

const STM32 = `
title: STM32F407 (subset)
0x0800_0000  512K   FLASH   Code {rx}
0x2000_0000  128K   SRAM    {rwx}
0x2001_FC00         _estack          # a single address = marker
0x4000_0000  0x8000 APB1
0x4000_4400  1K     USART2  Serial port 2
0x4000_4800  1K     USART3
0xE000_E000..0xE000_EFFF  SCS  NVIC, SysTick
`;

const describeItems = (items: LayoutItem[]) => items.map((it) =>
  it.kind === "region" ? it.region.name
  : it.kind === "marker" ? `@${it.marker.name}`
  : it.entries ? `gap[${it.entries.join("-")}]` : `gap(${formatSize(it.end - it.start)})`);

describe("numbers and formatting", () => {
  it("sizes with K/M/G suffixes", () => {
    expect(parseSize("512K")).toBe(B(512 * 1024));
    expect(parseSize("1M")).toBe(B(1 << 20));
    expect(parseSize("2GiB")).toBe(B(2) << B(30));
    expect(parseSize("64KB")).toBe(B(65536));
    expect(parseSize("0x400")).toBe(B(1024));
    expect(parseSize("1_024")).toBe(B(1024));
    expect(parseSize("SRAM")).toBeUndefined();
  });
  it("addresses and sizes print readably", () => {
    expect(formatAddr(B(0x40004400), 8)).toBe("0x4000_4400");
    expect(formatAddr(B(0x1000), 16)).toBe("0x0000_0000_0000_1000");
    expect(formatSize(B(1024))).toBe("1 KiB");
    expect(formatSize(B(1536))).toBe("1.5 KiB");
    expect(formatSize(B(512 * 1024 * 1024))).toBe("512 MiB");
    expect(formatSize(B(4))).toBe("4 B");
  });
});

describe("parseMemmap", () => {
  it("regions, ranges, attrs, descriptions, settings", () => {
    const m = parseMemmap(STM32);
    expect(m).toMatchObject({ title: "STM32F407 (subset)", order: "up", scale: "even", digits: 8, errors: [] });
    expect(m.regions.map((r) => r.name)).toEqual(["FLASH", "SRAM", "APB1", "SCS"]);
    expect(m.regions[0]).toMatchObject({ start: B(0x08000000), end: B(0x08080000), desc: "Code", attrs: "rx" });
    expect(m.regions[3]).toMatchObject({ start: B(0xE000E000), end: B(0xE000F000), desc: "NVIC, SysTick" });
  });

  it("nests contained regions and places markers in the deepest region", () => {
    const m = parseMemmap(STM32);
    expect(m.regions[2].children.map((r) => r.name)).toEqual(["USART2", "USART3"]);
    expect(m.regions[1].markers).toEqual([{ addr: B(0x2001FC00), name: "_estack", desc: "" }]);
    expect(m.markers).toEqual([]);
  });

  it("indexed entries need base and use stride", () => {
    const m = parseMemmap("base: 0x0800_0000\n[0] _estack Initial MSP\n[1] Reset_Handler\n[15] SysTick_Handler\n[16] WWDG_IRQHandler IRQ0");
    expect(m.regions.map((r) => [r.index, r.name, r.start, r.end])).toEqual([
      [0, "_estack", B(0x08000000), B(0x08000004)], [1, "Reset_Handler", B(0x08000004), B(0x08000008)],
      [15, "SysTick_Handler", B(0x0800003C), B(0x08000040)], [16, "WWDG_IRQHandler", B(0x08000040), B(0x08000044)],
    ]);
    expect(parseMemmap("[3] X").errors).toEqual(['line 1: [3] needs a "base:" line before it']);
    expect(parseMemmap("base: 0x0\nstride: 8\n[2] X").regions[0].start).toBe(B(16));
  });

  it("64-bit address spaces get 16 digits", () => {
    expect(parseMemmap("0xFFFF_0000_0000_0000 1G kernel").digits).toBe(16);
  });

  it("reports errors", () => {
    const m = parseMemmap("order: sideways\nscale: huge\nstride: 0\n0x10..0x0 BAD\nnonsense here\n0x100\n0x100 0x10\n0x200 0 ZERO\n0x0 0x100 A\n0x80 0x100 B");
    expect(m.errors).toEqual([
      'line 1: order must be "up" or "down"',
      'line 2: scale must be "even" or "log"',
      'line 3: "0" is not a valid stride',
      "line 4: BAD: end is below start",
      'line 5: expected "ADDRESS SIZE NAME", got "nonsense here"',
      "line 6: 0x100 needs a name",
      "line 7: 0x100 0x10 needs a name",
      "line 8: ZERO: size must be positive",
      "B overlaps A",
    ]);
  });
});

describe("layout", () => {
  it("top level: regions with gaps, low to high", () => {
    const m = parseMemmap(STM32);
    expect(describeItems(layout(m.regions, m.markers))).toEqual([
      "FLASH", "gap(383.5 MiB)", "SRAM", "gap(511.87 MiB)", "APB1", "gap(2.5 GiB)", "SCS",
    ]);
  });
  it("inside a parent: leading, middle and trailing gaps", () => {
    const apb1 = parseMemmap(STM32).regions[2];
    expect(describeItems(layout(apb1.children, apb1.markers, apb1))).toEqual(["gap(17 KiB)", "USART2", "USART3", "gap(13 KiB)"]);
  });
  it("contiguous regions have no gap; markers are interleaved", () => {
    const m = parseMemmap("0x0 1K A\n0x400 1K B\n0x500 inB\n0x900 hole");
    expect(describeItems(layout(m.regions, m.markers))).toEqual(["A", "B", "@hole"]);
    expect(m.regions[1].markers.map((x) => x.name)).toEqual(["inB"]);
  });
  it("table gaps count entries", () => {
    const m = parseMemmap("base: 0\n[0] SP\n[1] Reset\n[11] SVCall\n[14] PendSV\n[15] SysTick");
    expect(describeItems(layout(m.regions, m.markers))).toEqual(["SP", "Reset", "gap[2-10]", "SVCall", "gap[12-13]", "PendSV", "SysTick"]);
  });
});

describe("renderMemmap", () => {
  it("draws an SVG: high addresses on top by default, nested boxes with offsets, markers and gaps", () => {
    const el = document.createElement("div");
    renderMemmap(STM32, el);
    const svg = el.querySelector(".asmlight-memmap > svg.asmlight-memmap-svg")!;
    expect(svg).not.toBeNull();
    expect(svg.querySelector(".asmlight-memmap-title")!.textContent).toBe("STM32F407 (subset)");
    const top = Array.from(svg.children).filter((c) => c.classList.contains("asmlight-memmap-row"));
    expect(top.map((r) => r.querySelector(".asmlight-memmap-name, .asmlight-memmap-gap")!.textContent)).toEqual([
      "SCS", "⋮ 2.5 GiB unused", "APB1", "⋮ 511.87 MiB unused", "SRAM", "⋮ 383.5 MiB unused", "FLASH",
    ]);
    const addrs = (row: Element) => Array.from(row.children).filter((c) => c.classList.contains("asmlight-memmap-addr")).map((c) => c.textContent);
    expect(addrs(top[0])).toEqual(["0xE000_EFFF", "0xE000_E000"]);
    // children are drawn inside their parent's group
    const apb1 = top[2];
    const usart2 = Array.from(apb1.querySelectorAll(".asmlight-memmap-row")).find((r) => r.querySelector(".asmlight-memmap-name")?.textContent === "USART2")!;
    expect(usart2.querySelector(".asmlight-memmap-offset")!.textContent).toBe("+0x4400");
    expect(usart2.querySelector(".asmlight-memmap-size")!.textContent).toBe("1 KiB");
    // hover tooltip: a <title> on the row itself, so it shows over the box, the name and the description
    const ownTitle = (row: Element) => Array.from(row.children).find((c) => c.tagName.toLowerCase() === "title")?.textContent;
    expect(ownTitle(usart2)).toBe("USART2: 0x4000_4400 – 0x4000_47FF (1 KiB)");
    expect(ownTitle(apb1)).toBe("APB1: 0x4000_0000 – 0x4000_7FFF (32 KiB)");
    const gap = top.find((r) => r.classList.contains("is-gap"))!;
    expect(ownTitle(gap)).toMatch(/^0x[0-9A-F_]+ – 0x[0-9A-F_]+$/);
    expect(svg.querySelector(".asmlight-memmap-marker")!.textContent).toBe("◀ _estack");
    expect(svg.querySelector(".asmlight-memmap-attrs")!.textContent).toBe("rwx");
    expect(Number(svg.getAttribute("width"))).toBeGreaterThan(0);
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 \d+ \d+$/);
  });

  it("order: down puts low addresses first; scale: log sizes leaf boxes", () => {
    const el = document.createElement("div");
    renderMemmap("order: down\nscale: log\n0x0 1K A\n0x10000 1M B", el);
    const names = Array.from(el.querySelectorAll(".asmlight-memmap-name")).map((n) => n.textContent);
    expect(names).toEqual(["A", "B"]);
    const heights = Array.from(el.querySelectorAll(".asmlight-memmap-box")).map((b) => Number(b.getAttribute("height")));
    expect(heights[1]).toBeGreaterThan(heights[0]);
  });

  it("uses theme colors with fallbacks, so exporters without Obsidian's CSS still draw it", () => {
    const el = document.createElement("div");
    renderMemmap("0x0 1K A", el);
    const style = el.querySelector(".asmlight-memmap-box")!.getAttribute("style")!;
    expect(style).toMatch(/var\(--[\w-]+, #[0-9a-f]+\)/);
  });

  it("colors: \"light\" uses fixed colors on a white card instead of theme variables", () => {
    const el = document.createElement("div");
    renderMemmap("0x0 1K A", el, { colors: "light" });
    const svg = el.querySelector("svg")!;
    expect(svg.outerHTML).not.toContain("var(--");
    expect(svg.querySelector(".asmlight-diagram-bg")!.getAttribute("style")).toContain("#ffffff");
    renderMemmap("0x0 1K A", el);
    expect(el.querySelector(".asmlight-diagram-bg")).toBeNull();
  });

  it("errors, empty hint, and no markup injection", () => {
    const el = document.createElement("div");
    renderMemmap("0x0 1K <img/src=x> <b>bold</b>\n0x0 0x10 B", el);
    expect(el.querySelector("img, b")).toBeNull();
    renderMemmap("# nothing", el);
    expect(el.querySelector(".asmlight-memmap-empty")).not.toBeNull();
    renderMemmap("junk", el);
    expect(el.querySelector(".asmlight-memmap-errors")!.textContent).toContain("expected");
  });
});
