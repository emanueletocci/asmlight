import { isaForTag } from "../isa";
import { tokenizeLines } from "../tokenizer/tokenizeLines";
import type { IsaSpec } from "../tokenizer/types";
import { PRISM_CLASS } from "./styles";

export function isaForCodeElement(code: HTMLElement): IsaSpec | undefined {
  for (const cls of Array.from(code.classList)) {
    if (cls.startsWith("language-")) return isaForTag(cls.slice("language-".length));
  }
  return undefined;
}

/** Idempotent: always rebuilds from textContent, so re-running (or running after Prism) is safe. */
export function highlightCodeElement(code: HTMLElement, isa: IsaSpec): void {
  const frag = document.createDocumentFragment();
  tokenizeLines(code.textContent ?? "", isa).forEach((tokens, i) => {
    if (i > 0) frag.append("\n");
    for (const t of tokens) {
      if (!t.kind) { frag.append(t.text); continue; }
      const span = document.createElement("span");
      span.className = `token ${PRISM_CLASS[t.kind]} asmligh-${t.kind}`;
      span.textContent = t.text;
      frag.append(span);
    }
  });
  code.replaceChildren(frag);
}
