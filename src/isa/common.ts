export const COND = ["eq", "ne", "cs", "hs", "cc", "lo", "mi", "pl", "vs", "vc", "hi", "ls", "ge", "lt", "gt", "le", "al"];
export const COND_SET: ReadonlySet<string> = new Set(COND);

export function range(prefix: string, from: number, to: number): string[] {
  const out: string[] = [];
  for (let i = from; i <= to; i++) out.push(prefix + i);
  return out;
}

export function words(s: string): string[] {
  return s.trim().split(/\s+/);
}

/**
 * Strips vector arrangement (`v0.4s`, `v1.16b`, `v0.s`), RVV mask (`v0.t`) or
 * PSR field mask (`apsr_nzcvq`, `cpsr_fc`) before lookup.
 */
export function isRegister(registers: ReadonlySet<string>, word: string): boolean {
  return registers.has(word.replace(/\.(\d*[bhsdq]|t)$/, "").replace(/^(apsr|cpsr|spsr)_[a-z]+$/, "$1"));
}
