export interface RegField {
  name: string;
  hi: number;
  lo: number;
  desc: string;
  enums: Array<[bigint, string]>;
  reserved: boolean;
}

export interface Register {
  name: string;
  caption: string;
  width: number;
  perRow: number;
  value?: bigint;
  fields: RegField[];
  errors: string[];
}

/** A row segment: a field (or the unlisted gap) clipped to one row of the diagram. */
export interface Segment {
  hi: number;
  lo: number;
  field?: RegField;
}

const RESERVED = new Set(["-", "0", "1", "res0", "res1", "reserved", "rsvd", "wpri", "raz", "rao"]);

// `name: width [/ perRow] [= value] [caption]`, name may be quoted to allow spaces
const HEADER = /^(?:"([^"]+)"|([^\s:"]+)):\s*(\d+)(?:\s*\/\s*(\d+))?(?:\s*=\s*(\S+))?(?:\s+(.*))?$/;
// `NAME hi[:lo] [description] [{0: A, 1: B}]`, bit range may be bracketed
const FIELD = /^(\S+)\s+\[?(\d+)(?:\s*[:\-]\s*(\d+))?\]?(?:\s+(.*))?$/;
const VALUE = /^=\s*(\S+)\s*$/;

export function parseNumber(text: string): bigint | undefined {
  const t = text.replace(/_/g, "").toLowerCase();
  if (!/^(?:0x[0-9a-f]+|0b[01]+|0o[0-7]+|\d+)$/.test(t)) return undefined;
  return BigInt(t);
}

function parseEnums(desc: string): { desc: string; enums: Array<[bigint, string]> } {
  const m = /\{([^{}]*)\}\s*$/.exec(desc);
  if (!m) return { desc, enums: [] };
  const enums: Array<[bigint, string]> = [];
  for (const part of m[1].split(",")) {
    const kv = /^\s*(\S+?)\s*[:=]\s*(.+?)\s*$/.exec(part);
    const key = kv ? parseNumber(kv[1]) : undefined;
    if (kv && key !== undefined) enums.push([key, kv[2]]);
  }
  return enums.length ? { desc: desc.slice(0, m.index).trim(), enums } : { desc, enums: [] };
}

function newRegister(name = "", width = 0, perRow = 0, caption = ""): Register {
  return { name, caption, width, perRow, fields: [], errors: [] };
}

function finish(reg: Register): Register {
  const maxBit = reg.fields.reduce((m, f) => Math.max(m, f.hi), -1);
  if (!reg.width) reg.width = [8, 16, 32, 64, 128].find((w) => w > maxBit) ?? maxBit + 1;
  if (!reg.perRow) reg.perRow = Math.min(reg.width, 32);
  for (const f of reg.fields) {
    if (f.hi >= reg.width) reg.errors.push(`${f.name}: bit ${f.hi} is outside a ${reg.width}-bit register`);
  }
  const sorted = [...reg.fields].sort((a, b) => b.hi - a.hi);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].hi >= sorted[i - 1].lo) reg.errors.push(`${sorted[i].name} overlaps ${sorted[i - 1].name}`);
  }
  reg.fields = sorted;
  if (reg.value !== undefined && reg.value >> BigInt(reg.width) !== BigInt(0)) {
    reg.errors.push(`value does not fit in ${reg.width} bits`);
  }
  return reg;
}

export function parseRegmap(src: string): Register[] {
  const regs: Register[] = [];
  let cur: Register | undefined;
  src.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) return;
    const lineNo = i + 1;

    const h = HEADER.exec(line);
    if (h) {
      if (cur) regs.push(finish(cur));
      cur = newRegister(h[1] ?? h[2], Number(h[3]), h[4] ? Number(h[4]) : 0, h[6] ?? "");
      if (cur.width < 1 || cur.width > 128) { cur.errors.push(`line ${lineNo}: width must be 1–128`); cur.width = 32; }
      if (cur.perRow < 0 || cur.perRow > cur.width) cur.perRow = 0;
      if (h[5]) {
        const v = parseNumber(h[5]);
        if (v === undefined) cur.errors.push(`line ${lineNo}: "${h[5]}" is not a number`);
        else cur.value = v;
      }
      return;
    }
    cur ??= newRegister();

    const v = VALUE.exec(line);
    if (v) {
      const n = parseNumber(v[1]);
      if (n === undefined) cur.errors.push(`line ${lineNo}: "${v[1]}" is not a number`);
      else cur.value = n;
      return;
    }

    const f = FIELD.exec(line);
    if (!f) { cur.errors.push(`line ${lineNo}: expected "NAME hi:lo description", got "${line}"`); return; }
    let hi = Number(f[2]);
    let lo = f[3] === undefined ? hi : Number(f[3]);
    if (lo > hi) [hi, lo] = [lo, hi];
    const { desc, enums } = parseEnums(f[4] ?? "");
    cur.fields.push({ name: f[1], hi, lo, desc, enums, reserved: RESERVED.has(f[1].toLowerCase()) });
  });
  if (cur) regs.push(finish(cur));
  return regs;
}

/** Splits a register into rows (MSB first) of segments, filling gaps with unnamed segments. */
export function layoutRows(reg: Register): Segment[][] {
  const rows: Segment[][] = [];
  for (let top = reg.width - 1; top >= 0; top -= reg.perRow) {
    const bottom = Math.max(0, top - reg.perRow + 1);
    const row: Segment[] = [];
    let next = top;
    for (const field of reg.fields) {
      const hi = Math.min(field.hi, top);
      const lo = Math.max(field.lo, bottom);
      if (hi < lo || hi > next) continue;          // outside this row, or overlapping (reported)
      if (hi < next) row.push({ hi: next, lo: hi + 1 });
      row.push({ hi, lo, field });
      next = lo - 1;
    }
    if (next >= bottom) row.push({ hi: next, lo: bottom });
    rows.push(row);
  }
  return rows;
}

export function fieldValue(value: bigint, hi: number, lo: number): bigint {
  return (value >> BigInt(lo)) & ((BigInt(1) << BigInt(hi - lo + 1)) - BigInt(1));
}

export function formatValue(v: bigint, bits: number): string {
  if (bits === 1) return v.toString();
  if (bits <= 4) return `0b${v.toString(2).padStart(bits, "0")} (${v})`;
  return `0x${v.toString(16).toUpperCase()} (${v})`;
}

export function bitRange(hi: number, lo: number): string {
  return hi === lo ? `${hi}` : `${hi}:${lo}`;
}
