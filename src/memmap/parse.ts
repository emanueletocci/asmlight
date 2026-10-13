import { parseNumber } from "../regmap/parse";

export interface MemMarker {
  addr: bigint;
  name: string;
  desc: string;
}

export interface MemRegion {
  start: bigint;
  end: bigint;                // exclusive
  name: string;
  desc: string;
  attrs: string;
  index?: number;             // `[N]` table entry
  children: MemRegion[];
  markers: MemMarker[];
}

export interface MemMap {
  title: string;
  order: "up" | "down";       // up: high addresses at the top
  scale: "even" | "log";
  base?: bigint;
  stride: bigint;
  regions: MemRegion[];       // top level, sorted by address, children nested
  markers: MemMarker[];       // markers outside every region
  digits: number;             // hex digits for addresses: 8 or 16
  errors: string[];
}

export type LayoutItem =
  | { kind: "region"; region: MemRegion }
  | { kind: "gap"; start: bigint; end: bigint; entries?: [number, number] }
  | { kind: "marker"; marker: MemMarker };

const SETTING = /^(title|order|scale|base|stride)\s*:\s*(.*)$/i;
const ENTRY = /^\[(\d+)\]\s+(\S+)(?:\s+(.*))?$/;
const RANGE = /^(\S+?)\s*\.\.\s*(\S+)\s+(\S+)(?:\s+(.*))?$/;
const UNITS: Record<string, number> = { k: 10, m: 20, g: 30 };

/** A size: any number `parseNumber` accepts, optionally with a K/M/G (KiB, MB, ...) suffix. */
export function parseSize(text: string): bigint | undefined {
  const m = /^(.+?)([kmg])(?:i?b)?$/i.exec(text);
  if (m && !/^0x/i.test(text)) {
    const n = parseNumber(m[1]);
    return n === undefined ? undefined : n << BigInt(UNITS[m[2].toLowerCase()]);
  }
  return parseNumber(text);
}

function splitAttrs(rest: string): { desc: string; attrs: string } {
  const m = /\{([^{}]*)\}\s*$/.exec(rest);
  return m ? { desc: rest.slice(0, m.index).trim(), attrs: m[1].trim() } : { desc: rest.trim(), attrs: "" };
}

/** Drops `# …` / `// …` comments: whole lines, or after whitespace at the end of a line. */
function stripComment(line: string): string {
  const t = line.trim();
  if (t.startsWith("#") || t.startsWith("//")) return "";
  return t.replace(/\s+(?:#|\/\/)\s.*$/, "").trim();
}

const contains = (outer: MemRegion, inner: MemRegion) => outer.start <= inner.start && inner.end <= outer.end;
const overlaps = (a: MemRegion, b: MemRegion) => a.start < b.end && b.start < a.end;

function insert(list: MemRegion[], r: MemRegion, errors: string[]): void {
  for (const node of list) {
    if (contains(node, r)) { insert(node.children, r, errors); return; }
    if (overlaps(node, r)) errors.push(`${r.name} overlaps ${node.name}`);
  }
  list.push(r);
}

function placeMarker(list: MemRegion[], m: MemMarker): boolean {
  for (const node of list) {
    if (node.start <= m.addr && m.addr < node.end) {
      if (!placeMarker(node.children, m)) node.markers.push(m);
      return true;
    }
  }
  return false;
}

export function parseMemmap(src: string): MemMap {
  const map: MemMap = { title: "", order: "up", scale: "even", stride: BigInt(4), regions: [], markers: [], digits: 8, errors: [] };
  const flat: MemRegion[] = [];
  const markers: MemMarker[] = [];
  const err = (lineNo: number, msg: string) => map.errors.push(`line ${lineNo}: ${msg}`);
  const region = (start: bigint, end: bigint, name: string, rest: string, index?: number): MemRegion =>
    ({ start, end, name, ...splitAttrs(rest), ...(index !== undefined ? { index } : {}), children: [], markers: [] });

  src.split("\n").forEach((raw, i) => {
    const line = stripComment(raw);
    const lineNo = i + 1;
    if (!line) return;

    const set = SETTING.exec(line);
    if (set) {
      const key = set[1].toLowerCase();
      const value = set[2].trim();
      if (key === "title") map.title = value;
      else if (key === "order") {
        if (value === "up" || value === "down") map.order = value; else err(lineNo, `order must be "up" or "down"`);
      } else if (key === "scale") {
        if (value === "even" || value === "log") map.scale = value; else err(lineNo, `scale must be "even" or "log"`);
      } else {
        const n = key === "stride" ? parseSize(value) : parseNumber(value);
        if (n === undefined || (key === "stride" && n <= BigInt(0))) err(lineNo, `"${value}" is not a valid ${key}`);
        else if (key === "base") map.base = n; else map.stride = n;
      }
      return;
    }

    const entry = ENTRY.exec(line);
    if (entry) {
      if (map.base === undefined) { err(lineNo, `[${entry[1]}] needs a "base:" line before it`); return; }
      const start = map.base + BigInt(entry[1]) * map.stride;
      flat.push(region(start, start + map.stride, entry[2], entry[3] ?? "", Number(entry[1])));
      return;
    }

    const range = RANGE.exec(line);
    if (range) {
      const start = parseNumber(range[1]);
      const last = parseNumber(range[2]);
      if (start === undefined || last === undefined) { err(lineNo, `"${range[1]}..${range[2]}" is not an address range`); return; }
      if (last < start) { err(lineNo, `${range[3]}: end is below start`); return; }
      flat.push(region(start, last + BigInt(1), range[3], range[4] ?? ""));
      return;
    }

    const [first, second, ...rest] = line.split(/\s+/);
    const start = parseNumber(first);
    if (start === undefined) { err(lineNo, `expected "ADDRESS SIZE NAME", got "${line}"`); return; }
    if (second === undefined) { err(lineNo, `${first} needs a name`); return; }
    const size = parseSize(second);
    if (size === undefined) {
      markers.push({ addr: start, name: second, desc: rest.join(" ") });
    } else if (rest.length === 0) {
      err(lineNo, `${first} ${second} needs a name`);
    } else if (size <= BigInt(0)) {
      err(lineNo, `${rest[0]}: size must be positive`);
    } else {
      flat.push(region(start, start + size, rest[0], rest.slice(1).join(" ")));
    }
  });

  // Parents before children: by start, then larger first.
  flat.sort((a, b) => (a.start !== b.start ? (a.start < b.start ? -1 : 1) : a.end > b.end ? -1 : a.end < b.end ? 1 : 0));
  for (const r of flat) insert(map.regions, r, map.errors);
  for (const m of [...markers].sort((a, b) => (a.addr < b.addr ? -1 : a.addr > b.addr ? 1 : 0))) {
    if (!placeMarker(map.regions, m)) map.markers.push(m);
  }
  const top = [...flat.map((r) => r.end - BigInt(1)), ...markers.map((m) => m.addr)].reduce((a, b) => (b > a ? b : a), BigInt(0));
  map.digits = top > BigInt("0xFFFFFFFF") ? 16 : 8;
  return map;
}

/**
 * Siblings in address order with gaps between them (and, inside a parent, before the
 * first and after the last child). Markers are interleaved by address. Low to high;
 * the renderer reverses it for `order: up`.
 */
export function layout(regions: MemRegion[], markers: MemMarker[], parent?: MemRegion): LayoutItem[] {
  const items: LayoutItem[] = [];
  // Edge gaps only make sense when the parent is subdivided; markers alone don't make it unused.
  const edges = parent !== undefined && regions.length > 0;
  let cursor = edges ? parent.start : undefined;
  let prev: MemRegion | undefined;
  for (const r of regions) {
    if (cursor !== undefined && r.start > cursor) items.push(gap(cursor, r.start, prev, r));
    items.push({ kind: "region", region: r });
    cursor = cursor === undefined || r.end > cursor ? r.end : cursor;
    prev = r;
  }
  if (edges && cursor !== undefined && cursor < parent.end) items.push(gap(cursor, parent.end, prev, undefined));

  // Markers go after the last item that starts at or below their address.
  for (const m of markers) {
    let at = items.length;
    for (let i = 0; i < items.length; i++) {
      const s = itemStart(items[i]);
      if (s > m.addr) { at = i; break; }
    }
    items.splice(at, 0, { kind: "marker", marker: m });
  }
  return items;
}

function itemStart(it: LayoutItem): bigint {
  return it.kind === "region" ? it.region.start : it.kind === "gap" ? it.start : it.marker.addr;
}

function gap(start: bigint, end: bigint, before?: MemRegion, after?: MemRegion): LayoutItem {
  if (before?.index !== undefined && after?.index !== undefined && after.index - before.index > 1) {
    return { kind: "gap", start, end, entries: [before.index + 1, after.index - 1] };
  }
  return { kind: "gap", start, end };
}

export function formatAddr(v: bigint, digits: number): string {
  const hex = v.toString(16).toUpperCase().padStart(digits, "0");
  return "0x" + hex.replace(/\B(?=(?:[0-9A-F]{4})+$)/g, "_");
}

export function formatSize(n: bigint): string {
  for (const [unit, shift] of [["GiB", 30], ["MiB", 20], ["KiB", 10]] as const) {
    const u = BigInt(1) << BigInt(shift);
    if (n >= u) {
      const whole = n / u;
      const frac = Number(((n % u) * BigInt(100)) / u) / 100;
      return `${(Number(whole) + frac).toString()} ${unit}`;
    }
  }
  return `${n} B`;
}
