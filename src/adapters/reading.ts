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
  const frag = document.createDocumentFragment();
  tokenizeLines(code.textContent ?? "", lang).forEach((tokens, i) => {
    if (i > 0) frag.append("\n");
    for (const t of tokens) {
      if (!t.kind) { frag.append(t.text); continue; }
      const span = document.createElement("span");
      span.className = `token ${PRISM_CLASS[t.kind]} asmligh-${t.kind} asmligh-lang-${lang.id}`;
      span.textContent = t.text;
      frag.append(span);
    }
  });
  code.replaceChildren(frag);
}
