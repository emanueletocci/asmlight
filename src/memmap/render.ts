import { formatAddr, formatSize, layout, parseMemmap, type LayoutItem, type MemMap, type MemMarker, type MemRegion } from "./parse";

type Make = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => HTMLElementTagNameMap[K];

function maker(d: Document): Make {
  return (tag, cls, text) => {
    const e = d.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
}

/** Box height for `scale: log`: 1 KiB and below get the base height, each doubling adds a little. */
function logHeight(size: bigint): string {
  const bits = size.toString(2).length - 1;
  return `${Math.min(10, 2.2 + Math.max(0, bits - 10) * 0.35).toFixed(2)}em`;
}

function renderList(items: LayoutItem[], map: MemMap, el: Make, parent?: MemRegion): HTMLElement {
  const list = el("div", "asmlight-memmap-list");
  const ordered = map.order === "up" ? [...items].reverse() : items;
  for (const it of ordered) {
    if (it.kind === "region") list.append(renderRegion(it.region, map, el, parent));
    else if (it.kind === "gap") list.append(renderGap(it, map, el));
    else list.append(renderMarker(it.marker, map, el));
  }
  return list;
}

function renderRegion(r: MemRegion, map: MemMap, el: Make, parent?: MemRegion): HTMLElement {
  const row = el("div", `asmlight-memmap-row${r.index !== undefined ? " is-entry" : ""}`);
  const last = r.end - BigInt(1);
  const addrs = el("div", "asmlight-memmap-addrs");
  if (r.index !== undefined || r.end - r.start <= BigInt(1)) {
    addrs.append(el("code", "", formatAddr(r.start, map.digits)));
  } else {
    const [top, bottom] = map.order === "up" ? [last, r.start] : [r.start, last];
    addrs.append(el("code", "", formatAddr(top, map.digits)), el("code", "", formatAddr(bottom, map.digits)));
  }

  const box = el("div", "asmlight-memmap-box");
  box.title = `${r.name}: ${formatAddr(r.start, map.digits)} – ${formatAddr(last, map.digits)} (${formatSize(r.end - r.start)})`;
  if (map.scale === "log" && !r.children.length) box.setCssProps({ "--asmlight-log-height": logHeight(r.end - r.start) });

  const head = el("div", "asmlight-memmap-head");
  if (r.index !== undefined) head.append(el("span", "asmlight-memmap-index", `[${r.index}]`));
  head.append(el("span", "asmlight-memmap-name", r.name));
  if (parent) head.append(el("span", "asmlight-memmap-offset", `+0x${(r.start - parent.start).toString(16).toUpperCase()}`));
  if (r.index === undefined) head.append(el("span", "asmlight-memmap-size", formatSize(r.end - r.start)));
  if (r.attrs) head.append(el("span", "asmlight-memmap-attrs", r.attrs));
  box.append(head);
  if (r.desc) box.append(el("div", "asmlight-memmap-desc", r.desc));
  if (r.children.length || r.markers.length) box.append(renderList(layout(r.children, r.markers, r), map, el, r));

  row.append(addrs, box);
  return row;
}

function renderGap(g: Extract<LayoutItem, { kind: "gap" }>, map: MemMap, el: Make): HTMLElement {
  const row = el("div", "asmlight-memmap-row is-gap");
  row.append(el("div", "asmlight-memmap-addrs"));
  const text = g.entries
    ? `⋮ ${g.entries[1] - g.entries[0] + 1} entries (${g.entries[0]}–${g.entries[1]})`
    : `⋮ ${formatSize(g.end - g.start)} unused`;
  const strip = el("div", "asmlight-memmap-gap", text);
  strip.title = `${formatAddr(g.start, map.digits)} – ${formatAddr(g.end - BigInt(1), map.digits)}`;
  row.append(strip);
  return row;
}

function renderMarker(m: MemMarker, map: MemMap, el: Make): HTMLElement {
  const row = el("div", "asmlight-memmap-row is-marker");
  const addrs = el("div", "asmlight-memmap-addrs");
  addrs.append(el("code", "", formatAddr(m.addr, map.digits)));
  const tag = el("div", "asmlight-memmap-marker");
  tag.append(el("span", "asmlight-memmap-arrow", "◀"), el("span", "asmlight-memmap-name", m.name));
  if (m.desc) tag.append(el("span", "asmlight-memmap-desc", m.desc));
  row.append(addrs, tag);
  return row;
}

/** Renders a `memmap` code block into `container`. */
export function renderMemmap(source: string, container: HTMLElement): void {
  const el = maker(container.ownerDocument);
  const map = parseMemmap(source);
  const root = el("div", `asmlight-memmap${map.digits > 8 ? " is-64bit" : ""}`);
  if (map.title) root.append(el("div", "asmlight-memmap-title", map.title));
  if (map.errors.length) {
    const ul = el("ul", "asmlight-memmap-errors");
    for (const e of map.errors) ul.append(el("li", "", e));
    root.append(ul);
  }
  if (!map.regions.length && !map.markers.length) {
    root.append(el("div", "asmlight-memmap-empty", "memmap: describe regions, e.g. \"0x2000_0000 128K SRAM\""));
  } else {
    root.append(renderList(layout(map.regions, map.markers), map, el));
  }
  container.replaceChildren(root);
}
