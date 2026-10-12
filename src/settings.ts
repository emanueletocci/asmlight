import { type App, PluginSettingTab, Setting } from "obsidian";
import type AsmlighPlugin from "./main";

export interface AsmlighSettings {
  hoverCards: boolean;
  hoverRequiresModifier: boolean;
  hoverDelay: number;
}

export const DEFAULT_SETTINGS: AsmlighSettings = {
  hoverCards: true,
  hoverRequiresModifier: false,
  hoverDelay: 300,
};

export class AsmlighSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: AsmlighPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;

    new Setting(containerEl)
      .setName("Hover cards")
      .setDesc("Show what an instruction, register, CSR or keyword does when you hover it in a highlighted code block.")
      .addToggle((t) => t.setValue(s.hoverCards).onChange(async (v) => { s.hoverCards = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Require Ctrl/Cmd")
      .setDesc("Only show hover cards while Ctrl (Cmd on macOS) is held, like Obsidian's page preview.")
      .addToggle((t) => t.setValue(s.hoverRequiresModifier).onChange(async (v) => { s.hoverRequiresModifier = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName("Hover delay")
      .setDesc("Milliseconds to wait before showing a card.")
      .addSlider((sl) => sl.setLimits(0, 1000, 50).setValue(s.hoverDelay).setDynamicTooltip()
        .onChange(async (v) => { s.hoverDelay = v; await this.plugin.saveSettings(); }));
  }
}
