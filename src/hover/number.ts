import type { HoverDoc } from "../tokenizer/types";

// BigInt literals need ES2020; the build targets ES2018.
const ZERO = BigInt(0);
const ONE = BigInt(1);
const WIDTHS = [8, 16, 32, 64];
const LINKER_SCALE: Record<string, number> = { k: 10, m: 20, g: 30 };

interface Literal {
  value: bigint;     // magnitude, before applying `negative`
  negative: boolean;
  base: 2 | 8 | 16;
  digits: number;    // written digit count, used to pick the display width
  shift: number;     // linker K/M/G suffix
}

/**
 * Parses a non-decimal integer literal: `0x`/`0b`/`0o` prefixed or C-style `0755`
 * octal, with optional `#` (ARM immediates), `-`, C integer suffixes and linker
 * K/M/G. Objdump addresses and devicetree unit addresses are hex without a prefix.
 */
export function parseLiteral(text: string, lang = ""): Literal | undefined {
  let s = text.trim().replace(/^#/, "");
  let bareHex = lang.startsWith("objdump");
  if (lang === "devicetree" && s.startsWith("@")) { s = s.slice(1); bareHex = true; }
  const negative = s.startsWith("-");
  if (negative) s = s.slice(1);
  s = s.replace(/_/g, "");

  let shift = 0;
  const m = /^0([xbo])([0-9a-f]+?)(ull|ul|ll|u|l|[kmg])?$/i.exec(s);
  let base: 2 | 8 | 16;
  let digits: string;
  if (m) {
    base = ({ x: 16, b: 2, o: 8 } as const)[m[1].toLowerCase() as "x" | "b" | "o"];
    digits = m[2];
    const suffix = m[3]?.toLowerCase();
    if (suffix && suffix in LINKER_SCALE) {
      if (lang !== "linker") return undefined;
      shift = LINKER_SCALE[suffix];
    }
  } else if (bareHex && /^[0-9a-f]+$/i.test(s)) {
    base = 16;
    digits = s;
  } else if (/^0[0-7]+(?:ull|ul|ll|u|l)?$/i.test(s)) {
    base = 8;                                       // C and GNU as: a leading 0 means octal
    digits = s.slice(1).replace(/[ul]+$/i, "");
  } else {
    return undefined;
  }
  const valid = base === 16 ? /^[0-9a-f]+$/i : base === 8 ? /^[0-7]+$/ : /^[01]+$/;
  if (!valid.test(digits)) return undefined;
  const prefix = base === 16 ? "0x" : base === 8 ? "0o" : "0b";
  return { value: BigInt(prefix + digits), negative, base, digits: digits.length, shift };
}

function group(s: string, size: number, sep: string): string {
  const out: string[] = [];
  for (let i = s.length; i > 0; i -= size) out.unshift(s.slice(Math.max(0, i - size), i));
  return out.join(sep);
}

function ascii(bits: bigint, width: number): string | undefined {
  let s = "";
  for (let i = width - 8; i >= 0; i -= 8) {
    const c = Number((bits >> BigInt(i)) & BigInt(0xff));
    if (c === 0 && !s) continue;                    // skip leading NUL bytes
    if (c < 0x20 || c > 0x7e) return undefined;
    s += String.fromCharCode(c);
  }
  return s ? `"${s}"` : undefined;
}

/** Hover card showing a non-decimal literal in decimal (unsigned and signed), hex, binary and octal. */
export function describeNumber(text: string, lang = ""): HoverDoc | undefined {
  const lit = parseLiteral(text, lang);
  if (!lit) return undefined;
  const magnitude = lit.value << BigInt(lit.shift);
  const value = lit.negative ? -magnitude : magnitude;

  // Width: what the literal was written as (0x00ff is 16-bit), widened to fit the value.
  const writtenBits = lit.shift ? 0 : lit.digits * (lit.base === 16 ? 4 : lit.base === 8 ? 3 : 1);
  const needed = lit.negative ? (magnitude - ONE).toString(2).length + 1 : magnitude.toString(2).length;
  const width = WIDTHS.find((w) => w >= Math.max(writtenBits, needed));

  const rows: Array<[string, string]> = [];
  if (width === undefined) {
    // Wider than 64 bits: no fixed-width two's complement to show.
    rows.push(["Decimal", value.toString()]);
    rows.push(["Hex", (lit.negative ? "-0x" : "0x") + group(magnitude.toString(16), 4, "_")]);
    return { title: text.trim(), tag: "Number", summary: "", rows };
  }

  const mask = (ONE << BigInt(width)) - ONE;
  const bits = value & mask;                        // two's complement pattern
  const signBit = ONE << BigInt(width - 1);
  const signed = bits & signBit ? bits - (ONE << BigInt(width)) : bits;
  const pad = (s: string, n: number) => s.padStart(n, "0");

  rows.push(["Unsigned", group(bits.toString(10), 3, ",")]);
  rows.push([`Signed (i${width})`, (signed < ZERO ? "-" : "") + group((signed < ZERO ? -signed : signed).toString(10), 3, ",")]);
  rows.push(["Hex", "0x" + group(pad(bits.toString(16), width / 4), 4, "_")]);
  rows.push(["Binary", group(pad(bits.toString(2), width), 4, " ")]);
  rows.push(["Octal", "0o" + bits.toString(8)]);
  const chars = ascii(bits, width);
  if (chars) rows.push(["ASCII", chars]);

  return { title: text.trim(), tag: `Number · ${width}-bit`, summary: "", rows };
}
