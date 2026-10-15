import { formatAddr, formatSize, layout, parseMemmap, type LayoutItem, type MemMap, type MemMarker, type MemRegion } from "./parse";

/** Creates a child of `parent` with Obsidian's createEl, so it lands in the parent's window (popouts included). */
function el<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  return parent.createEl(tag, { cls: cls || undefined, text });
}

/** Box height for `scale: log`: 1 KiB and below get the base height, each doubling adds a little. */
function logHeight(size: bigint): string {
  const bits = size.toString(2).length - 1;
  return `${Math.min(10, 2.2 + Math.max(0, bits - 10) * 0.35).toFixed(2)}em`;
}

function renderList(into: HTMLElement, items: LayoutItem[], map: MemMap, parent?: MemRegion): void {
  const list = el(into, "div", "asmlight-memmap-list");
  const ordered = map.order === "up" ? [...items].reverse() : items;
  for (const it of ordered) {
    if (it.kind === "region") renderRegion(list, it.region, map, parent);
    else if (it.kind === "gap") renderGap(list, it, map);
    else renderMarker(list, it.marker, map);
  }
}

function renderRegion(into: HTMLElement, r: MemRegion, map: MemMap, parent?: MemRegion): void {
  const row = el(into, "div", `asmlight-memmap-row${r.index !== undefined ? " is-entry" : ""}`);
  const last = r.end - BigInt(1);
  const addrs = el(row, "div", "asmlight-memmap-addrs");
  if (r.index !== undefined || r.end - r.start <= BigInt(1)) {
    el(addrs, "code", "", formatAddr(r.start, map.digits));
  } else {
    const [top, bottom] = map.order === "up" ? [last, r.start] : [r.start, last];
    el(addrs, "code", "", formatAddr(top, map.digits));
    el(addrs, "code", "", formatAddr(bottom, map.digits));
  }

  const box = el(row, "div", "asmlight-memmap-box");
  box.title = `${r.name}: ${formatAddr(r.start, map.digits)} – ${formatAddr(last, map.digits)} (${formatSize(r.end - r.start)})`;
  if (map.scale === "log" && !r.children.length) box.setCssProps({ "--asmlight-log-height": logHeight(r.end - r.start) });

  const head = el(box, "div", "asmlight-memmap-head");
  if (r.index !== undefined) el(head, "span", "asmlight-memmap-index", `[${r.index}]`);
  el(head, "span", "asmlight-memmap-name", r.name);
  if (parent) el(head, "span", "asmlight-memmap-offset", `+0x${(r.start - parent.start).toString(16).toUpperCase()}`);
  if (r.index === undefined) el(head, "span", "asmlight-memmap-size", formatSize(r.end - r.start));
  if (r.attrs) el(head, "span", "asmlight-memmap-attrs", r.attrs);
  if (r.desc) el(box, "div", "asmlight-memmap-desc", r.desc);
  if (r.children.length || r.markers.length) renderList(box, layout(r.children, r.markers, r), map, r);
}

function renderGap(into: HTMLElement, g: Extract<LayoutItem, { kind: "gap" }>, map: MemMap): void {
  const row = el(into, "div", "asmlight-memmap-row is-gap");
  el(row, "div", "asmlight-memmap-addrs");
  const text = g.entries
    ? `⋮ ${g.entries[1] - g.entries[0] + 1} entries (${g.entries[0]}–${g.entries[1]})`
    : `⋮ ${formatSize(g.end - g.start)} unused`;
  const strip = el(row, "div", "asmlight-memmap-gap", text);
  strip.title = `${formatAddr(g.start, map.digits)} – ${formatAddr(g.end - BigInt(1), map.digits)}`;
}

function renderMarker(into: HTMLElement, m: MemMarker, map: MemMap): void {
  const row = el(into, "div", "asmlight-memmap-row is-marker");
  const addrs = el(row, "div", "asmlight-memmap-addrs");
  el(addrs, "code", "", formatAddr(m.addr, map.digits));
  const tag = el(row, "div", "asmlight-memmap-marker");
  el(tag, "span", "asmlight-memmap-arrow", "◀");
  el(tag, "span", "asmlight-memmap-name", m.name);
  if (m.desc) el(tag, "span", "asmlight-memmap-desc", m.desc);
}

/** Renders a `memmap` code block into `container`. */
export function renderMemmap(source: string, container: HTMLElement): void {
  const map = parseMemmap(source);
  container.empty();
  const root = el(container, "div", `asmlight-memmap${map.digits > 8 ? " is-64bit" : ""}`);
  if (map.title) el(root, "div", "asmlight-memmap-title", map.title);
  if (map.errors.length) {
    const ul = el(root, "ul", "asmlight-memmap-errors");
    for (const e of map.errors) el(ul, "li", "", e);
  }
  if (!map.regions.length && !map.markers.length) {
    el(root, "div", "asmlight-memmap-empty", "memmap: describe regions, e.g. \"0x2000_0000 128K SRAM\"");
  } else {
    renderList(root, layout(map.regions, map.markers), map);
  }
}
