import { type App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type AsmlightPlugin from "./main";

export interface AsmlightSettings {
  hoverCards: boolean;
  hoverRequiresModifier: boolean;
  hoverDelay: number;
}

export const DEFAULT_SETTINGS: AsmlightSettings = {
  hoverCards: true,
  hoverRequiresModifier: false,
  hoverDelay: 300,
};

const TEXT = {
  hoverCards: ["Hover cards", "Show what an instruction, register, CSR or keyword does when you hover it in a highlighted code block."],
  hoverRequiresModifier: ["Require Ctrl/Cmd", "Only show hover cards while Ctrl (Cmd on macOS) is held, like Obsidian's page preview."],
  hoverDelay: ["Hover delay", "Milliseconds to wait before showing a card."],
} as const;
const DELAY = { min: 0, max: 1000, step: 50 };

export class AsmlightSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: AsmlightPlugin) {
    super(app, plugin);
  }

  /** Obsidian 1.13+ renders the tab from these (and indexes them for settings search); display() is not called. */
  getSettingDefinitions(): SettingDefinitionItem[] {
    const [cards, mod, delay] = [TEXT.hoverCards, TEXT.hoverRequiresModifier, TEXT.hoverDelay];
    return [
      { name: cards[0], desc: cards[1], control: { type: "toggle", key: "hoverCards", defaultValue: DEFAULT_SETTINGS.hoverCards } },
      { name: mod[0], desc: mod[1], control: { type: "toggle", key: "hoverRequiresModifier", defaultValue: DEFAULT_SETTINGS.hoverRequiresModifier } },
      {
        name: delay[0], desc: delay[1],
        control: { type: "slider", key: "hoverDelay", defaultValue: DEFAULT_SETTINGS.hoverDelay, ...DELAY, displayFormat: (v) => `${v} ms` },
      },
    ];
  }

  /** Fallback for Obsidian older than 1.13, which doesn't know getSettingDefinitions(). */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    new Setting(containerEl)
      .setName(TEXT.hoverCards[0])
      .setDesc(TEXT.hoverCards[1])
      .addToggle((t) => t.setValue(s.hoverCards).onChange(async (v) => { s.hoverCards = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(TEXT.hoverRequiresModifier[0])
      .setDesc(TEXT.hoverRequiresModifier[1])
      .addToggle((t) => t.setValue(s.hoverRequiresModifier).onChange(async (v) => { s.hoverRequiresModifier = v; await this.plugin.saveSettings(); }));

    // Older sliders don't show their value, so put it in the description instead of the deprecated setDynamicTooltip().
    const delayDesc = (v: number) => `${TEXT.hoverDelay[1]} Now ${v} ms.`;
    const delay = new Setting(containerEl).setName(TEXT.hoverDelay[0]).setDesc(delayDesc(s.hoverDelay));
    delay.addSlider((sl) => sl.setLimits(DELAY.min, DELAY.max, DELAY.step).setValue(s.hoverDelay)
      .onChange(async (v) => { s.hoverDelay = v; delay.setDesc(delayDesc(v)); await this.plugin.saveSettings(); }));
  }
}
