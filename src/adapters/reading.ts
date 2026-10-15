import { languageForTag } from "../languages";
import { tokenizeLines } from "../tokenizer/tokenizeLines";
import type { Language } from "../tokenizer/types";
import { PRISM_CLASS } from "./styles";

export function languageForCodeElement(code: HTMLElement): Language | undefined {
  for (const cls of Array.from(code.classList)) {
    if (cls.startsWith("language-")) return languageForTag(cls.slice("language-".length));
  }
  return undefined;
}

/** Idempotent: always rebuilds from textContent, so re-running (or running after Prism) is safe. */
export function highlightCodeElement(code: HTMLElement, lang: Language): void {
  const lines = tokenizeLines(code.textContent ?? "", lang);
  code.empty();
  lines.forEach((tokens, i) => {
    if (i > 0) code.appendText("\n");
    for (const t of tokens) {
      if (!t.kind) code.appendText(t.text);
      else code.createSpan({ cls: `token ${PRISM_CLASS[t.kind]} asmlight-${t.kind} asmlight-lang-${t.lang}`, text: t.text });
    }
  });
}
