import { ALL_ISAS } from "./isa";
import { LINKER } from "./lang/linker";
import { MAKEFILE } from "./lang/makefile";
import { asmLanguage } from "./tokenizer/parser";
import type { Language } from "./tokenizer/types";

export const ALL_LANGUAGES: readonly Language[] = [...ALL_ISAS.map(asmLanguage), MAKEFILE, LINKER];

const BY_TAG = new Map<string, Language>();
for (const lang of ALL_LANGUAGES) for (const tag of [lang.id, ...lang.aliases]) BY_TAG.set(tag, lang);

export function languageForTag(tag: string): Language | undefined {
  return BY_TAG.get(tag.trim().toLowerCase());
}
