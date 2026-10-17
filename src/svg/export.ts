import { renderMemmap } from "../memmap/render";
import { renderRegmap } from "../regmap/render";
import { LIGHT, SVG_NS, type Palette } from "./draw";

export type DiagramKind = "regmap" | "memmap";

export interface StandaloneSvg {
  /** File-name friendly name: the register name or the memory map title. */
  name: string;
  /** A complete SVG document. */
  svg: string;
}

const slug = (s: string) => s.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "diagram";

/**
 * Every drawing of a `regmap` / `memmap` block as a standalone SVG file, in the light palette:
 * it opens in a browser, Inkscape or a slide editor with no Obsidian CSS around it.
 */
export function standaloneSvgs(kind: DiagramKind, source: string, doc: Document = document): StandaloneSvg[] {
  const tmp = doc.createElement("div");
  (kind === "regmap" ? renderRegmap : renderMemmap)(source, tmp, { colors: "light" });
  return Array.from(tmp.querySelectorAll("svg")).map((svg, i) => {
    // Other programs (Inkscape, slide editors, converters) often ignore CSS variables, so the
    // file gets plain colors: the color <style> goes, every variable is replaced by its value,
    // and a white rectangle takes the place of the card behind the drawing.
    svg.querySelector(":scope > style")?.remove();
    const bg = doc.createElementNS(SVG_NS, "rect");
    for (const [k, v] of Object.entries({ width: "100%", height: "100%", fill: "#ffffff" })) bg.setAttribute(k, v);
    svg.insertBefore(bg, svg.querySelector(":scope > defs")?.nextSibling ?? svg.firstChild);
    svg.setAttribute("xmlns", SVG_NS);
    svg.removeAttribute("style");                 // page layout only (max-width, …)
    const name =
      kind === "regmap"
        ? svg.querySelector(".asmlight-regmap-name")?.textContent ?? `register-${i + 1}`
        : svg.querySelector(".asmlight-memmap-title")?.textContent ?? "memory-map";
    const raw = typeof XMLSerializer !== "undefined" ? new XMLSerializer().serializeToString(svg) : svg.outerHTML;
    const xml = raw.replace(/var\(--asmlight-c-(\w+)\)/g, (m, k: string) => LIGHT[k as keyof Palette] ?? m);
    return { name: slug(name), svg: `<?xml version="1.0" encoding="UTF-8"?>\n${xml}\n` };
  });
}
