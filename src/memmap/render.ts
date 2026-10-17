import { box, colorMode, finish, startSvg, svgEl, text, textWidth, tooltip, type Canvas, type DiagramOptions, type Palette } from "../svg/draw";
import { formatAddr, formatSize, layout, parseMemmap, type LayoutItem, type MemMap, type MemMarker, type MemRegion } from "./parse";

/** Creates a child of `parent` with Obsidian's createEl, so it lands in the parent's window (popouts included). */
function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  return parent.createEl(tag, { cls: cls || undefined, text });
}

const PAD = 4;        // outer margin of the drawing
const HEAD = 20;      // name line of a region box
const DESC = 15;      // description line
const BOTTOM = 6;     // space under a box's text
const GAP_H = 22;     // "⋮ 508 MiB unused" strip
const MARK_H = 20;    // "◀ _estack" line
const ROW_GAP = 4;    // between rows
const INDENT = 8;     // children inside a box
const EM = 14;        // px per em, for `scale: log`
const ONE = BigInt(1);

interface Ctx {
  map: MemMap;
  c: Canvas;
  addrW: number;
}

/** Box height for `scale: log`: 1 KiB and below get the base height, each doubling adds a little. */
function logHeight(size: bigint): number {
  const bits = size.toString(2).length - 1;
  return Math.min(10, 2.2 + Math.max(0, bits - 10) * 0.35) * EM;
}

const childrenOf = (r: MemRegion) => layout(r.children, r.markers, r);
const hasChildren = (r: MemRegion) => r.children.length > 0 || r.markers.length > 0;
const ordered = (items: LayoutItem[], map: MemMap) => (map.order === "up" ? [...items].reverse() : items);

function gapText(g: Extract<LayoutItem, { kind: "gap" }>): string {
  if (!g.entries) return `⋮ ${formatSize(g.end - g.start)} unused`;
  const [a, b] = g.entries;
  return a === b ? `⋮ 1 entry (${a})` : `⋮ ${b - a + 1} entries (${a}–${b})`;
}

/** The pieces of a region's name line, in drawing order. */
function headParts(P: Palette, r: MemRegion, parent?: MemRegion): Array<{ s: string; size: number; bold?: boolean; fill: string; cls: string }> {
  const parts = [];
  if (r.index !== undefined) parts.push({ s: `[${r.index}]`, size: 11, fill: P.muted, cls: "asmlight-memmap-index" });
  parts.push({ s: r.name, size: 12, bold: true, fill: P.text, cls: "asmlight-memmap-name" });
  if (parent) parts.push({ s: `+0x${(r.start - parent.start).toString(16).toUpperCase()}`, size: 10, fill: P.muted, cls: "asmlight-memmap-offset" });
  if (r.index === undefined) parts.push({ s: formatSize(r.end - r.start), size: 11, fill: P.muted, cls: "asmlight-memmap-size" });
  if (r.attrs) parts.push({ s: r.attrs, size: 10, bold: true, fill: P.accent, cls: "asmlight-memmap-attrs" });
  return parts;
}

// ---------- measuring ----------

function widthOfList(items: LayoutItem[], x: Ctx, parent?: MemRegion): number {
  return items.reduce((w, it) => Math.max(w, widthOfItem(it, x, parent)), 0);
}

function widthOfItem(it: LayoutItem, x: Ctx, parent?: MemRegion): number {
  if (it.kind === "gap") return x.addrW + textWidth(gapText(it), 11) + 20;
  if (it.kind === "marker") {
    const m = it.marker;
    return x.addrW + 6 + textWidth(`◀ ${m.name}`, 11, true) + (m.desc ? 8 + textWidth(m.desc, 11) : 0) + 8;
  }
  const r = it.region;
  const head = headParts(x.c.pal, r, parent).reduce((w, p) => w + textWidth(p.s, p.size, p.bold) + 10, 0);
  let inner = Math.max(head, r.desc ? textWidth(r.desc, 11) : 0) + 2 * INDENT;
  if (hasChildren(r)) inner = Math.max(inner, widthOfList(childrenOf(r), x, r) + 2 * INDENT);
  return x.addrW + inner;
}

function heightOfList(items: LayoutItem[], x: Ctx): number {
  return items.reduce((h, it) => h + heightOfItem(it, x) + ROW_GAP, 0);
}

function heightOfItem(it: LayoutItem, x: Ctx): number {
  if (it.kind === "gap") return GAP_H;
  if (it.kind === "marker") return MARK_H;
  const r = it.region;
  let h = HEAD + (r.desc ? DESC : 0) + BOTTOM;
  if (hasChildren(r)) h += heightOfList(childrenOf(r), x) + 2;
  else if (r.index === undefined) h = Math.max(h, 38, x.map.scale === "log" ? logHeight(r.end - r.start) : 0);
  return h;
}

// ---------- drawing ----------

function drawList(into: Element, items: LayoutItem[], x: Ctx, left: number, top: number, width: number, parent?: MemRegion): number {
  let y = top;
  for (const it of ordered(items, x.map)) {
    const h = heightOfItem(it, x);
    if (it.kind === "region") drawRegion(into, it.region, x, left, y, width, h, parent);
    else if (it.kind === "gap") drawGap(into, it, x, left, y, width, h);
    else drawMarker(into, it.marker, x, left, y);
    y += h + ROW_GAP;
  }
  return y;
}

function drawRegion(into: Element, r: MemRegion, x: Ctx, left: number, y: number, width: number, h: number, parent?: MemRegion): void {
  const { map, addrW } = x;
  const P = x.c.pal;
  // Rows nest like the regions do: a child row is drawn inside its parent's group.
  const g = svgEl(into, "g", { class: `asmlight-memmap-row${r.index !== undefined ? " is-entry" : ""}` });
  const last = r.end - ONE;
  // The tooltip belongs to the whole row (box, name, description), like the old box's title
  // attribute. A nested row has its own <title>, and the innermost one wins on hover.
  tooltip(g, `${r.name}: ${formatAddr(r.start, map.digits)} – ${formatAddr(last, map.digits)} (${formatSize(r.end - r.start)})`);
  if (r.index !== undefined || r.end - r.start <= ONE) {
    text(g, left, y + 14, formatAddr(r.start, map.digits), 10, { fill: P.accent, cls: "asmlight-memmap-addr" });
  } else {
    const [hi, lo] = map.order === "up" ? [last, r.start] : [r.start, last];
    text(g, left, y + 13, formatAddr(hi, map.digits), 10, { fill: P.accent, cls: "asmlight-memmap-addr" });
    text(g, left, y + h - 4, formatAddr(lo, map.digits), 10, { fill: P.accent, cls: "asmlight-memmap-addr" });
  }

  const bx = left + addrW;
  const bw = width - addrW;
  box(g, bx, y, bw, h, P.fill, { rx: 3, stroke: P.line, cls: "asmlight-memmap-box" });

  let tx = bx + INDENT;
  for (const p of headParts(x.c.pal, r, parent)) {
    text(g, tx, y + 14, p.s, p.size, { bold: p.bold, fill: p.fill, cls: p.cls });
    tx += textWidth(p.s, p.size, p.bold) + 10;
  }
  let cy = y + HEAD;
  if (r.desc) {
    text(g, bx + INDENT, cy + 10, r.desc, 11, { fill: P.muted, cls: "asmlight-memmap-desc" });
    cy += DESC;
  }
  if (hasChildren(r)) drawList(g, childrenOf(r), x, bx + INDENT, cy + 2, bw - 2 * INDENT, r);
}

function drawGap(into: Element, gp: Extract<LayoutItem, { kind: "gap" }>, x: Ctx, left: number, y: number, width: number, h: number): void {
  const P = x.c.pal;
  const g = svgEl(into, "g", { class: "asmlight-memmap-row is-gap" });
  const bx = left + x.addrW;
  box(g, bx, y, width - x.addrW, h, x.c.hatch, { dashed: true, stroke: P.faint });
  text(g, bx + INDENT, y + 15, gapText(gp), 11, { fill: P.muted, cls: "asmlight-memmap-gap" });
  tooltip(g, `${formatAddr(gp.start, x.map.digits)} – ${formatAddr(gp.end - ONE, x.map.digits)}`);
}

function drawMarker(into: Element, m: MemMarker, x: Ctx, left: number, y: number): void {
  const P = x.c.pal;
  const g = svgEl(into, "g", { class: "asmlight-memmap-row is-marker" });
  text(g, left, y + 14, formatAddr(m.addr, x.map.digits), 10, { fill: P.accent, cls: "asmlight-memmap-addr" });
  const label = `◀ ${m.name}`;
  const bx = left + x.addrW + 6;
  text(g, bx, y + 14, label, 11, { bold: true, fill: P.accent, cls: "asmlight-memmap-marker" });
  if (m.desc) text(g, bx + textWidth(label, 11, true) + 8, y + 14, m.desc, 11, { fill: P.muted, cls: "asmlight-memmap-desc" });
}

/** Renders a `memmap` code block into `container`, as an SVG drawing. */
export function renderMemmap(source: string, container: HTMLElement, opts: DiagramOptions = {}): void {
  const map = parseMemmap(source);
  container.empty();
  const root = el(container, "div", `asmlight-memmap${map.digits > 8 ? " is-64bit" : ""}`);
  if (map.errors.length) {
    const ul = el(root, "ul", "asmlight-memmap-errors");
    for (const e of map.errors) el(ul, "li", "", e);
  }
  if (!map.regions.length && !map.markers.length) {
    el(root, "div", "asmlight-memmap-empty", "memmap: describe regions, e.g. \"0x2000_0000 128K SRAM\"");
    return;
  }

  const regionCount = (rs: MemRegion[]): number => rs.reduce((n, r) => n + 1 + regionCount(r.children), 0);
  const label = `Memory map${map.title ? ` ${map.title}` : ""}: ${regionCount(map.regions)} regions, ` +
    `${formatAddr(map.regions[0]?.start ?? BigInt(0), map.digits)} to ${formatAddr((map.regions[map.regions.length - 1]?.end ?? ONE) - ONE, map.digits)}`;
  const c = startSvg(root, "asmlight-memmap-svg", { scope: root, label, colors: colorMode(opts) });
  const P = c.pal;
  const x: Ctx = { map, c, addrW: textWidth(formatAddr(BigInt(0), map.digits), 10) + 12 };
  const items = layout(map.regions, map.markers);
  const titleW = map.title ? textWidth(map.title, 13, true) : 0;
  const width = Math.max(420, titleW, widthOfList(items, x));

  let y = PAD;
  if (map.title) {
    text(c.svg, PAD, y + 14, map.title, 13, { bold: true, fill: P.text, cls: "asmlight-memmap-title" });
    y += 24;
  }
  y = drawList(c.svg, items, x, PAD, y, width);
  finish(c, width + 2 * PAD, y - ROW_GAP + PAD);
}
