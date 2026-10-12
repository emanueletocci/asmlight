import { loadPrism, MarkdownView, Plugin } from "obsidian";
import { registerCm5Modes, unregisterCm5Modes } from "./adapters/cm5";
import { highlightCodeElement, languageForCodeElement } from "./adapters/reading";
import { HoverController } from "./hover/hover";
import { ALL_LANGUAGES, languageForTag } from "./languages";
import { renderRegmap } from "./regmap/render";
import { AsmlighSettingTab, DEFAULT_SETTINGS, type AsmlighSettings } from "./settings";

type PrismEnv = { element: HTMLElement; language: string };

export default class AsmlighPlugin extends Plugin {
  settings: AsmlighSettings = { ...DEFAULT_SETTINGS };
  private unloaded = false;
  private readonly hovers: HoverController[] = [];

  // Prism replaces the contents of code blocks whose language it doesn't know.
  // If it runs after our post-processor, this puts the highlighting back.
  private readonly prismHook = (env: PrismEnv) => {
    if (this.unloaded) return;
    const lang = languageForTag(env.language ?? "");
    if (lang && env.element) highlightCodeElement(env.element, lang);
  };

  async onload() {
    this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<AsmlighSettings> | null) };
    if (this.unloaded) return;
    this.addSettingTab(new AsmlighSettingTab(this.app, this));

    this.attachHover(document);
    this.registerEvent(this.app.workspace.on("window-open", (_w, win) => this.attachHover(win.document)));

    for (const tag of ["regmap", "bitfield"]) {
      this.registerMarkdownCodeBlockProcessor(tag, (source, el) => renderRegmap(source, el));
    }

    registerCm5Modes((window as any).CodeMirror, ALL_LANGUAGES);
    // Editor highlighting must not depend on Prism loading.
    this.app.workspace.updateOptions();

    this.registerMarkdownPostProcessor((el) => {
      if (this.unloaded) return;
      el.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
        const lang = languageForCodeElement(code);
        if (lang) highlightCodeElement(code, lang);
      });
    });

    const Prism = await loadPrism();
    if (this.unloaded) return;
    Prism.hooks.add("after-highlight", this.prismHook);

    this.app.workspace.updateOptions();
    this.rerenderReadingViews();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private attachHover(doc: Document) {
    const controller = new HoverController(doc, {
      enabled: () => this.settings.hoverCards,
      requireModifier: () => this.settings.hoverRequiresModifier,
      delay: () => this.settings.hoverDelay,
    });
    this.hovers.push(controller);
    // A closed popout window takes its document with it.
    this.registerDomEvent(doc.defaultView!, "unload", () => {
      controller.destroy();
      this.hovers.splice(this.hovers.indexOf(controller), 1);
    });
  }

  /** Reading view caches rendered sections; force a re-render so toggling the plugin takes effect. */
  private rerenderReadingViews() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
    }
  }

  onunload() {
    this.unloaded = true;
    for (const h of this.hovers.splice(0)) h.destroy();
    unregisterCm5Modes((window as any).CodeMirror, ALL_LANGUAGES);

    const hooks: unknown[] | undefined = (window as any).Prism?.hooks?.all?.["after-highlight"];
    const i = hooks?.indexOf(this.prismHook) ?? -1;
    if (hooks && i >= 0) hooks.splice(i, 1);

    this.app.workspace.updateOptions();
    // Deferred so Obsidian has removed the post-processor before views re-render.
    window.setTimeout(() => this.rerenderReadingViews(), 0);
  }
}
