import type { IsaSpec } from "../tokenizer/types";
import { ARM32 } from "./arm32";
import { ARM64 } from "./arm64";
import { RISCV } from "./riscv";

export const ALL_ISAS: readonly IsaSpec[] = [RISCV, ARM32, ARM64];

const BY_TAG = new Map<string, IsaSpec>();
for (const isa of ALL_ISAS) for (const tag of [isa.id, ...isa.aliases]) BY_TAG.set(tag, isa);

export function isaForTag(tag: string): IsaSpec | undefined {
  return BY_TAG.get(tag.trim().toLowerCase());
}
