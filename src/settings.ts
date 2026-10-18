import { type App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type AsmlightPlugin from "./main";
import type { DiagramColors } from "./svg/draw";

export interface AsmlightSettings {
  hoverCards: boolean;
  hoverRequiresModifier: boolean;
  hoverDelay: number;
  diagramColors: DiagramColors;
}

export const DEFAULT_SETTINGS: AsmlightSettings = {
  hoverCards: true,
  hoverRequiresModifier: false,
  hoverDelay: 300,
  diagramColors: "theme",
};

const TEXT = {
  hoverCards: ["Hover cards", "Show what an instruction, register, CSR or keyword does when you hover it in a highlighted code block."],
  hoverRequiresModifier: ["Require Ctrl/Cmd", "Only show hover cards while Ctrl (Cmd on macOS) is held, like Obsidian's page preview."],
  hoverDelay: ["Hover delay", "Milliseconds to wait before showing a card."],
  diagramColors: [
    "Diagram colors",
    "Colors of register diagrams and memory maps. \"Follow theme\" uses your theme's colors; \"Always light\" draws them on a white card with print-friendly colors; \"Auto\" follows the theme on screen and switches to the light card when the note is printed or exported to PDF.",
  ],
} as const;
const COLOR_OPTIONS: Record<DiagramColors, string> = {
  theme: "Follow theme",
  light: "Always light (print-friendly)",
  auto: "Auto: theme on screen, light in print",
};
const DELAY = { min: 0, max: 1000, step: 50 };

export class AsmlightSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: AsmlightPlugin) {
    super(app, plugin);
  }

  /** Obsidian 1.13+ renders the tab from these (and indexes them for settings search); display() is not called. */
  getSettingDefinitions(): SettingDefinitionItem[] {
    const [cards, mod, delay, colors] = [TEXT.hoverCards, TEXT.hoverRequiresModifier, TEXT.hoverDelay, TEXT.diagramColors];
    return [
      { name: cards[0], desc: cards[1], control: { type: "toggle", key: "hoverCards", defaultValue: DEFAULT_SETTINGS.hoverCards } },
      { name: mod[0], desc: mod[1], control: { type: "toggle", key: "hoverRequiresModifier", defaultValue: DEFAULT_SETTINGS.hoverRequiresModifier } },
      {
        name: delay[0], desc: delay[1],
        control: { type: "slider", key: "hoverDelay", defaultValue: DEFAULT_SETTINGS.hoverDelay, ...DELAY, displayFormat: (v) => `${v} ms` },
      },
      {
        name: colors[0], desc: colors[1],
        control: { type: "dropdown", key: "diagramColors", defaultValue: DEFAULT_SETTINGS.diagramColors, options: COLOR_OPTIONS },
      },
    ];
  }

  /** Persists like the default, then redraws open notes when the diagram colors change. */
  async setControlValue(key: string, value: unknown): Promise<void> {
    await super.setControlValue(key, value);
    if (key === "diagramColors") this.plugin.redrawDiagrams();
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

    new Setting(containerEl)
      .setName(TEXT.diagramColors[0])
      .setDesc(TEXT.diagramColors[1])
      .addDropdown((d) => d.addOptions(COLOR_OPTIONS).setValue(s.diagramColors).onChange(async (v) => {
        s.diagramColors = v === "light" || v === "auto" ? v : "theme";
        await this.plugin.saveSettings();
        this.plugin.redrawDiagrams();
      }));
  }
}
