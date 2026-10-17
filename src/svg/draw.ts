/**
 * Small SVG toolkit for the regmap and memmap diagrams.
 *
 * The diagrams are drawn as inline SVG instead of HTML + stylesheet so they keep their
 * look wherever the rendered note ends up: Obsidian, its native PDF export, and third-party
 * exporters that print the note in a separate window without the plugin's styles.css.
 * Everything visual is therefore an attribute of the SVG itself. Colors use Obsidian's
 * theme variables (light/dark aware inside Obsidian) with a fixed fallback, which is what
 * an exporter window without Obsidian's CSS ends up using.
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
  /** Card behind the whole drawing; only the fixed palette needs one. */
  background?: string;
}

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
  background: "#ffffff",
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

export type DiagramColors = "theme" | "light";

export interface DiagramOptions {
  /** "theme" follows Obsidian's theme; "light" always uses the light palette (print-friendly). */
  colors?: DiagramColors;
}

export const paletteFor = (o: DiagramOptions = {}): Palette => (o.colors === "light" ? LIGHT : THEME);

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
  const attrs: Attrs = { x, y, "font-size": size, style: `fill: ${o.fill ?? "currentColor"}` };
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
  let style = `fill: ${fill}; stroke: ${o.stroke ?? "currentColor"}; stroke-width: 1`;
  if (o.dashed) style += "; stroke-dasharray: 4 3";
  const attrs: Attrs = { x, y, width: w, height: h, style };
  if (o.rx) attrs.rx = o.rx;
  if (o.cls) attrs.class = o.cls;
  return svgEl(parent, "rect", attrs);
}

/** Adds a native tooltip to an SVG element. */
export function tooltip(target: Element, s: string): void {
  svgEl(target, "title", {}, s);
}

let patternCount = 0;

export interface Canvas {
  svg: SVGSVGElement;
  pal: Palette;
  /** `url(#…)` of this SVG's hatch pattern, for reserved fields, gaps and holes. */
  hatch: string;
}

/** Starts an SVG inside `container`; call `finish` once the drawing size is known. */
export function startSvg(container: HTMLElement, cls: string, pal: Palette): Canvas {
  const svg = svgEl(container, "svg", {
    class: cls,
    "font-family": FONT,
    style: "display: block; max-width: 100%; height: auto; overflow: visible",
  });
  const id = `asmlight-hatch-${++patternCount}`;
  const pattern = svgEl(svgEl(svg, "defs"), "pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
  svgEl(pattern, "rect", { width: 6, height: 6, style: `fill: ${pal.hatchBg}` });
  svgEl(pattern, "line", { x1: 0, y1: 0, x2: 0, y2: 6, style: `stroke: ${pal.hatch}; stroke-width: 2` });
  return { svg, pal, hatch: `url(#${id})` };
}

export function finish(c: Canvas, width: number, height: number): void {
  const w = Math.ceil(width), h = Math.ceil(height);
  c.svg.setAttribute("width", String(w));
  c.svg.setAttribute("height", String(h));
  c.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  if (c.pal.background) {
    // Card behind the drawing, so fixed dark text stays readable on a dark page.
    const card = svgEl(c.svg, "rect", { class: "asmlight-diagram-bg", width: w, height: h, rx: 4, style: `fill: ${c.pal.background}` });
    c.svg.insertBefore(card, c.svg.firstChild?.nextSibling ?? null);   // right after <defs>
  }
}
