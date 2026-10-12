export interface DocEntry {
  summary: string;
  syntax?: string;
  operation?: string;
}

/**
 * Parses doc rows of the form `key1 key2 ¦ summary ¦ syntax ¦ operation`.
 * `¦` is the separator because `|` shows up in operations (bitwise OR).
 * Keys are whitespace-separated (devicetree names contain commas) and stored
 * as written; callers normalize case before lookup.
 */
export function docTable(src: string): Map<string, DocEntry> {
  const out = new Map<string, DocEntry>();
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const [keys, summary, syntax, operation] = line.split("¦").map((c) => c.trim());
    if (!summary) throw new Error(`asmlight: doc row without summary: ${line}`);
    const entry: DocEntry = { summary };
    if (syntax) entry.syntax = syntax;
    if (operation) entry.operation = operation;
    for (const key of keys.split(/\s+/)) out.set(key, entry);
  }
  return out;
}

/** Condition codes shared by AArch32 and AArch64. */
export const CONDITIONS: Record<string, string> = {
  eq: "EQ: equal (Z == 1)",
  ne: "NE: not equal (Z == 0)",
  cs: "CS/HS: carry set, unsigned ≥ (C == 1)",
  hs: "HS/CS: unsigned ≥ (C == 1)",
  cc: "CC/LO: carry clear, unsigned < (C == 0)",
  lo: "LO/CC: unsigned < (C == 0)",
  mi: "MI: negative (N == 1)",
  pl: "PL: positive or zero (N == 0)",
  vs: "VS: overflow (V == 1)",
  vc: "VC: no overflow (V == 0)",
  hi: "HI: unsigned > (C == 1 && Z == 0)",
  ls: "LS: unsigned ≤ (C == 0 || Z == 1)",
  ge: "GE: signed ≥ (N == V)",
  lt: "LT: signed < (N != V)",
  gt: "GT: signed > (Z == 0 && N == V)",
  le: "LE: signed ≤ (Z == 1 || N != V)",
  al: "AL: always",
};
