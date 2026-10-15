import { ALL_ISAS } from "./isa";
import { CONSTRAINT_LANGUAGES } from "./lang/constraints";
import { DEVICETREE } from "./lang/devicetree";
import { LINKER } from "./lang/linker";
import { MAKEFILE } from "./lang/makefile";
import { OBJDUMP_LANGUAGES } from "./lang/objdump";
import { VERILOG } from "./lang/verilog";
import { VHDL } from "./lang/vhdl";
import { asmLanguage } from "./tokenizer/parser";
import type { Language } from "./tokenizer/types";

export const ALL_LANGUAGES: readonly Language[] = [
  ...ALL_ISAS.map(asmLanguage), MAKEFILE, LINKER, DEVICETREE, ...OBJDUMP_LANGUAGES,
  VERILOG, VHDL, ...CONSTRAINT_LANGUAGES,
];

const BY_TAG = new Map<string, Language>();
for (const lang of ALL_LANGUAGES) for (const tag of [lang.id, ...lang.aliases]) BY_TAG.set(tag, lang);

export function languageForTag(tag: string): Language | undefined {
  return BY_TAG.get(tag.trim().toLowerCase());
}

export function languageById(id: string): Language | undefined {
  return ALL_LANGUAGES.find((l) => l.id === id);
}
