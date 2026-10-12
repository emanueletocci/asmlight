import { loadPrism, Plugin } from "obsidian";
import { toCm5Mode } from "./adapters/cm5";
import { highlightCodeElement, isaForCodeElement } from "./adapters/reading";
import { ALL_ISAS, isaForTag } from "./isa";

type PrismEnv = { element: HTMLElement; language: string };

export default class AsmlighPlugin extends Plugin {
  private readonly tags = ALL_ISAS.flatMap((isa) => [isa.id, ...isa.aliases]);

  // Prism replaces the contents of code blocks whose language it doesn't know.
  // If it runs after our post-processor, this puts the highlighting back.
  private readonly prismHook = (env: PrismEnv) => {
    const isa = isaForTag(env.language ?? "");
    if (isa && env.element) highlightCodeElement(env.element, isa);
  };

  async onload() {
    const CM = (window as any).CodeMirror;
    for (const isa of ALL_ISAS) {
      for (const tag of [isa.id, ...isa.aliases]) CM?.defineMode?.(tag, () => toCm5Mode(isa));
    }

    this.registerMarkdownPostProcessor((el) => {
      el.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
        const isa = isaForCodeElement(code);
        if (isa) highlightCodeElement(code, isa);
      });
    });

    const Prism = await loadPrism();
    Prism.hooks.add("after-highlight", this.prismHook);

    this.app.workspace.updateOptions();
  }

  onunload() {
    const CM = (window as any).CodeMirror;
    for (const tag of this.tags) delete CM?.modes?.[tag];

    const hooks: unknown[] | undefined = (window as any).Prism?.hooks?.all?.["after-highlight"];
    const i = hooks?.indexOf(this.prismHook) ?? -1;
    if (hooks && i >= 0) hooks.splice(i, 1);

    this.app.workspace.updateOptions();
  }
}
