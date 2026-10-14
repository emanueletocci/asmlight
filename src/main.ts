import { loadPrism, MarkdownView, Plugin } from "obsidian";
import { registerCm5Modes, unregisterCm5Modes, type Cm5Like } from "./adapters/cm5";
import { highlightCodeElement, languageForCodeElement } from "./adapters/reading";
import { HoverController } from "./hover/hover";
import { ALL_LANGUAGES, languageForTag } from "./languages";
import { renderMemmap } from "./memmap/render";
import { renderRegmap } from "./regmap/render";
import { AsmlightSettingTab, DEFAULT_SETTINGS, type AsmlightSettings } from "./settings";

/** Globals Obsidian puts on window that aren't in its public typings. */
function globals() {
  return window as unknown as {
    CodeMirror?: Cm5Like;
    Prism?: { hooks?: { all?: Record<string, unknown[]> } };
  };
}

type PrismEnv = { element: HTMLElement; language: string };

export default class AsmlightPlugin extends Plugin {
  settings: AsmlightSettings = { ...DEFAULT_SETTINGS };
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
    this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<AsmlightSettings> | null) };
    if (this.unloaded) return;
    this.addSettingTab(new AsmlightSettingTab(this.app, this));

    this.attachHover(document);
    this.registerEvent(this.app.workspace.on("window-open", (_w, win) => this.attachHover(win.document)));

    for (const tag of ["regmap", "bitfield"]) {
      this.registerMarkdownCodeBlockProcessor(tag, (source, el) => renderRegmap(source, el));
    }
    for (const tag of ["memmap", "memory", "addrmap"]) {
      this.registerMarkdownCodeBlockProcessor(tag, (source, el) => renderMemmap(source, el));
    }

    registerCm5Modes(globals().CodeMirror, ALL_LANGUAGES);
    // Editor highlighting must not depend on Prism loading.
    this.app.workspace.updateOptions();
    this.app.workspace.onLayoutReady(() => {
      if (!this.unloaded) this.rebuildEditors();
    });

    this.registerMarkdownPostProcessor((el) => {
      if (this.unloaded) return;
      el.querySelectorAll<HTMLElement>("pre > code").forEach((code) => {
        const lang = languageForCodeElement(code);
        if (lang) highlightCodeElement(code, lang);
      });
    });

    const Prism = (await loadPrism()) as { hooks: { add(name: string, cb: (env: PrismEnv) => void): void } };
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

  /**
   * Live Preview and Source mode cache each code block's parse, including which
   * mode a fence resolved to. Notes already open when the plugin loads (every
   * restored tab at startup) parsed our fences as plain text, and updateOptions()
   * keeps that cache, so reopen those editors to parse them again.
   */
  private rebuildEditors() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.getMode() === "source") {
        // Not in the public typings; reopens the file keeping scroll and cursor.
        void (leaf as unknown as { rebuildView?: () => Promise<void> }).rebuildView?.();
      }
    }
  }

  onunload() {
    this.unloaded = true;
    for (const h of this.hovers.splice(0)) h.destroy();
    unregisterCm5Modes(globals().CodeMirror, ALL_LANGUAGES);

    const hooks: unknown[] | undefined = globals().Prism?.hooks?.all?.["after-highlight"];
    const i = hooks?.indexOf(this.prismHook) ?? -1;
    if (hooks && i >= 0) hooks.splice(i, 1);

    this.app.workspace.updateOptions();
    // Deferred so Obsidian has removed the post-processor before views re-render.
    window.setTimeout(() => {
      this.rerenderReadingViews();
      this.rebuildEditors();
    }, 0);
  }
}
