import { loadPrism, MarkdownView, Plugin } from "obsidian";
import { toCm5Mode } from "./adapters/cm5";
import { highlightCodeElement, isaForCodeElement } from "./adapters/reading";
import { ALL_ISAS, isaForTag } from "./isa";

type PrismEnv = { element: HTMLElement; language: string };

export default class AsmlighPlugin extends Plugin {
  private readonly tags = ALL_ISAS.flatMap((isa) => [isa.id, ...isa.aliases]);

  // Prism replaces the contents of code blocks whose language it doesn't know.
  // If it runs after our post-processor, this puts the highlighting back.
  private unloaded = false;

  private readonly prismHook = (env: PrismEnv) => {
    if (this.unloaded) return;
    const isa = isaForTag(env.language ?? "");
    if (isa && env.element) highlightCodeElement(env.element, isa);
  };

  async onload() {
    const CM = (window as any).CodeMirror;
    for (const isa of ALL_ISAS) {
      for (const tag of [isa.id, ...isa.aliases]) CM?.defineMode?.(tag, () => toCm5Mode(isa));
    }

    this.registerMarkdownPostProcessor((el) => {
      if (this.unloaded) return;
      el.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
        const isa = isaForCodeElement(code);
        if (isa) highlightCodeElement(code, isa);
      });
    });

    const Prism = await loadPrism();
    if (this.unloaded) return;
    Prism.hooks.add("after-highlight", this.prismHook);

    this.app.workspace.updateOptions();
    this.rerenderReadingViews();
  }

  /** Reading view caches rendered sections; force a re-render so toggling the plugin takes effect. */
  private rerenderReadingViews() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
    }
  }

  onunload() {
    this.unloaded = true;
    const CM = (window as any).CodeMirror;
    for (const tag of this.tags) delete CM?.modes?.[tag];

    const hooks: unknown[] | undefined = (window as any).Prism?.hooks?.all?.["after-highlight"];
    const i = hooks?.indexOf(this.prismHook) ?? -1;
    if (hooks && i >= 0) hooks.splice(i, 1);

    this.app.workspace.updateOptions();
    // Deferred so Obsidian has removed the post-processor before views re-render.
    const workspace = this.app.workspace;
    window.setTimeout(() => {
      for (const leaf of workspace.getLeavesOfType("markdown")) {
        if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
      }
    }, 0);
  }
}
