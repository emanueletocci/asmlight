/**
 * Small SVG toolkit for the regmap and memmap diagrams.
 *
 * The diagrams are drawn as inline SVG instead of HTML + stylesheet so they keep their
 * look wherever the rendered note ends up: Obsidian, its native PDF export, and third-party
 * exporters that print the note in a separate window without the plugin's styles.css.
 *
 * Colors: every element is painted with a diagram-local CSS variable (`--asmlight-c-text`, …).
 * A <style> inside the SVG defines those variables on the diagram's container, for the chosen
 * color mode. Exporters keep <style> elements that live inside an <svg> (that is how Mermaid
 * survives them too), and a <style> inside an inline SVG applies to the whole page, so the same
 * rules also restyle the HTML around the drawing, such as the register legend.
 */

export const SVG_NS = "http://www.w3.org/2000/svg";

/** Monospace stack close to Obsidian's default; also used to measure text. */
export const FONT =
  'ui-monospace, SFMono-Regular, "Cascadia Mono", "Roboto Mono", "DejaVu Sans Mono", "Liberation Mono", Menlo, Monaco, Consolas, monospace';

export interface Palette {
  text: string;
  muted: string;
  faint: string;
  line: string;
  fill: string;
  accent: string;
  setFill: string;
  hatch: string;
  hatchBg: string;
}

const KEYS: Array<keyof Palette> = ["text", "muted", "faint", "line", "fill", "accent", "setFill", "hatch", "hatchBg"];

/** Fixed light colors: readable on paper and on any page, whatever the Obsidian theme. */
export const LIGHT: Palette = {
  text: "#1f2328",
  muted: "#59636e",
  faint: "#8c959f",
  line: "#8c959f",
  fill: "#f6f8fa",
  accent: "#0969da",
  setFill: "rgba(9, 105, 218, 0.14)",
  hatch: "#d0d7de",
  hatchBg: "#ffffff",
};

/** Theme colors, with the light palette as fallback where Obsidian's CSS variables don't exist. */
export const THEME: Palette = {
  text: `var(--text-normal, ${LIGHT.text})`,
  muted: `var(--text-muted, ${LIGHT.muted})`,
  faint: `var(--text-faint, ${LIGHT.faint})`,
  line: `var(--text-faint, ${LIGHT.line})`,
  fill: `var(--background-secondary, ${LIGHT.fill})`,
  accent: `var(--text-accent, ${LIGHT.accent})`,
  setFill: LIGHT.setFill,
  hatch: `var(--background-modifier-border, ${LIGHT.hatch})`,
  hatchBg: `var(--background-primary, ${LIGHT.hatchBg})`,
};

/** What the drawing code paints with: the diagram-local variables. */
export const VARS: Palette = Object.fromEntries(KEYS.map((k) => [k, `var(--asmlight-c-${k})`])) as unknown as Palette;

/**
 * "theme": follow Obsidian's theme. "light": always the light palette, on a white card.
 * "auto": follow the theme on screen, switch to the light card when printed or exported to PDF.
 */
export type DiagramColors = "theme" | "light" | "auto";

export interface DiagramOptions {
  colors?: DiagramColors;
}

export const colorMode = (o: DiagramOptions = {}): DiagramColors => (o.colors === "light" || o.colors === "auto" ? o.colors : "theme");

const declarations = (p: Palette) => KEYS.map((k) => `--asmlight-c-${k}: ${p[k]};`).join(" ");

/** The light card: white background, and dark text for the HTML parts (legend) as well. */
const card = (s: string) =>
  `${s} { ${declarations(LIGHT)} background: #ffffff; color: ${LIGHT.text}; padding: 8px 10px; border-radius: 6px; } ` +
  `${s} .asmlight-regmap-legend th, ${s} .asmlight-regmap-legend tr.is-reserved, ${s} .asmlight-regmap-enums { color: ${LIGHT.muted}; } ` +
  `${s} .asmlight-regmap-legend th, ${s} .asmlight-regmap-legend td, ${s} .asmlight-regmap-legend tr { background: transparent; border-color: ${LIGHT.hatch}; } ` +
  `${s} .asmlight-regmap-legend code { color: ${LIGHT.text}; background: ${LIGHT.fill}; }`;

/** CSS for one diagram, scoped to the class `scope` on its container. */
export function colorCss(mode: DiagramColors, scope: string): string {
  const s = `.${scope}`;
  if (mode === "light") return card(s);
  const theme = `${s} { ${declarations(THEME)} }`;
  return mode === "auto" ? `${theme} @media print { ${card(s)} }` : theme;
}

type Attrs = Record<string, string | number>;

/** Creates an SVG child of `parent` in the parent's own document (popout windows included). */
export function svgEl<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Attrs = {}, text?: string): SVGElementTagNameMap[K] {
  const doc = parent.ownerDocument ?? document;
  const e = doc.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === "number" ? fmt(v) : v);
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

let measureCtx: CanvasRenderingContext2D | null | undefined;

/** Width of `s` in px, measured with a canvas when one is available, estimated otherwise. */
export function textWidth(s: string, size: number, bold = false): number {
  if (measureCtx === undefined) {
    try {
      measureCtx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
    } catch {
      measureCtx = null;
    }
  }
  if (measureCtx) {
    measureCtx.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
    const w = measureCtx.measureText(s).width;
    if (w > 0) return w;
  }
  return s.length * size * 0.62 * (bold ? 1.08 : 1);
}

export interface TextOpts {
  fill?: string;
  bold?: boolean;
  anchor?: "start" | "middle" | "end";
  vertical?: boolean;
  cls?: string;
}

export function text(parent: Element, x: number, y: number, s: string, size: number, o: TextOpts = {}): SVGTextElement {
  const attrs: Attrs = { x, y, "font-size": size, style: `fill: ${o.fill ?? VARS.text}` };
  if (o.bold) attrs["font-weight"] = "bold";
  if (o.anchor) attrs["text-anchor"] = o.anchor;
  if (o.vertical) attrs.transform = `rotate(-90 ${fmt(x)} ${fmt(y)})`;
  if (o.cls) attrs.class = o.cls;
  return svgEl(parent, "text", attrs, s);
}

export interface BoxOpts {
  dashed?: boolean;
  rx?: number;
  cls?: string;
  stroke?: string;
}

export function box(parent: Element, x: number, y: number, w: number, h: number, fill: string, o: BoxOpts = {}): SVGRectElement {
  let style = `fill: ${fill}; stroke: ${o.stroke ?? VARS.line}; stroke-width: 1`;
  if (o.dashed) style += "; stroke-dasharray: 4 3";
  const attrs: Attrs = { x, y, width: w, height: h, style };
  if (o.rx) attrs.rx = o.rx;
  if (o.cls) attrs.class = o.cls;
  return svgEl(parent, "rect", attrs);
}

export function line(parent: Element, x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1): SVGLineElement {
  return svgEl(parent, "line", { x1, y1, x2, y2, style: `stroke: ${stroke}; stroke-width: ${width}` });
}

/** Adds a native tooltip to an SVG element. */
export function tooltip(target: Element, s: string): void {
  svgEl(target, "title", {}, s);
}

let diagramCount = 0;

export interface Canvas {
  svg: SVGSVGElement;
  /** Colors to paint with (diagram-local CSS variables). */
  pal: Palette;
  /** `url(#…)` of this SVG's hatch pattern, for reserved fields, gaps and holes. */
  hatch: string;
}

/**
 * Starts an SVG inside `container`; call `finish` once the drawing size is known.
 * `scope` is the element the color variables are defined on: the diagram's own container,
 * so that the light card can also cover the HTML next to the drawing (the register legend).
 */
export function startSvg(container: HTMLElement, cls: string, opts: { scope: HTMLElement; label: string; colors?: DiagramColors }): Canvas {
  const n = ++diagramCount;
  const scope = `asmlight-scope-${n}`;
  opts.scope.classList.add(scope);
  const svg = svgEl(container, "svg", {
    class: cls,
    role: "img",
    "aria-label": opts.label,
    "font-family": FONT,
    style: "display: block; max-width: 100%; height: auto; overflow: visible",
  });
  svgEl(svg, "style", {}, colorCss(opts.colors ?? "theme", scope));
  const id = `asmlight-hatch-${n}`;
  const pattern = svgEl(svgEl(svg, "defs"), "pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
  svgEl(pattern, "rect", { width: 6, height: 6, style: `fill: ${VARS.hatchBg}` });
  svgEl(pattern, "line", { x1: 0, y1: 0, x2: 0, y2: 6, style: `stroke: ${VARS.hatch}; stroke-width: 2` });
  return { svg, pal: VARS, hatch: `url(#${id})` };
}

export function finish(c: Canvas, width: number, height: number): void {
  const w = Math.ceil(width), h = Math.ceil(height);
  c.svg.setAttribute("width", String(w));
  c.svg.setAttribute("height", String(h));
  c.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
}
