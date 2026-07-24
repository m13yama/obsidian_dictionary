import {
  App,
  Notice,
  PluginSettingTab,
  Setting,
  normalizePath,
} from "obsidian";
import type VaultSpellcheckPlugin from "./main";

export interface SpellcheckSettings {
  enabled: boolean;
  customDictionaryPath: string;
  ignoreAllCaps: boolean;
  ignoreCamelCase: boolean;
  acceptHyphenatedCompounds: boolean;
}

export const DEFAULT_SETTINGS: SpellcheckSettings = {
  enabled: true,
  customDictionaryPath: "_dictionary/custom-words.txt",
  ignoreAllCaps: true,
  ignoreCamelCase: false,
  acceptHyphenatedCompounds: true,
};

export function sanitizeSettings(
  value: Partial<SpellcheckSettings> | null | undefined,
): SpellcheckSettings {
  const customDictionaryPath = isValidDictionaryPath(value?.customDictionaryPath)
    ? normalizePath(value.customDictionaryPath.trim())
    : DEFAULT_SETTINGS.customDictionaryPath;

  return {
    enabled:
      typeof value?.enabled === "boolean"
        ? value.enabled
        : DEFAULT_SETTINGS.enabled,
    customDictionaryPath,
    ignoreAllCaps:
      typeof value?.ignoreAllCaps === "boolean"
        ? value.ignoreAllCaps
        : DEFAULT_SETTINGS.ignoreAllCaps,
    ignoreCamelCase:
      typeof value?.ignoreCamelCase === "boolean"
        ? value.ignoreCamelCase
        : DEFAULT_SETTINGS.ignoreCamelCase,
    acceptHyphenatedCompounds:
      typeof value?.acceptHyphenatedCompounds === "boolean"
        ? value.acceptHyphenatedCompounds
        : DEFAULT_SETTINGS.acceptHyphenatedCompounds,
  };
}

export function isValidDictionaryPath(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.startsWith("/") || trimmed.endsWith("/")) {
    return false;
  }

  const segments = trimmed.replaceAll("\\", "/").split("/");
  return !segments.some((segment) => segment === ".." || segment.length === 0);
}

export class SpellcheckSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: VaultSpellcheckPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Enable spellcheck")
      .setDesc("Underline misspelled English words in the editor.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enabled)
          .onChange(async (enabled) => {
            await this.plugin.updateSettings({ enabled });
          }),
      );

    new Setting(containerEl)
      .setName("Custom dictionary file")
      .setDesc(
        "Vault-relative text file containing one accepted word per line. Keep it outside hidden folders for reliable syncing.",
      )
      .addText((text) => {
        text.setValue(this.plugin.settings.customDictionaryPath);
        text.inputEl.addEventListener("change", () => {
          const value = text.getValue();
          if (!isValidDictionaryPath(value)) {
            text.setValue(this.plugin.settings.customDictionaryPath);
            new Notice("Enter a valid path relative to the vault.");
            return;
          }

          void this.plugin.updateSettings({
            customDictionaryPath: normalizePath(value.trim()),
          });
        });
      });

    new Setting(containerEl)
      .setName("Ignore words in all caps")
      .setDesc("Useful for acronyms such as API and HTML.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ignoreAllCaps)
          .onChange(async (ignoreAllCaps) => {
            await this.plugin.updateSettings({ ignoreAllCaps });
          }),
      );

    new Setting(containerEl)
      .setName("Ignore camel case words")
      .setDesc("Useful for identifiers such as spellChecker and iPhone.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.ignoreCamelCase)
          .onChange(async (ignoreCamelCase) => {
            await this.plugin.updateSettings({ ignoreCamelCase });
          }),
      );

    new Setting(containerEl)
      .setName("Accept hyphenated compounds")
      .setDesc(
        "Accept a hyphenated word when each component is spelled correctly.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.acceptHyphenatedCompounds)
          .onChange(async (acceptHyphenatedCompounds) => {
            await this.plugin.updateSettings({ acceptHyphenatedCompounds });
          }),
      );

    new Setting(containerEl)
      .setName("Reload custom dictionary")
      .setDesc("Reload the dictionary file after editing it outside Obsidian.")
      .addButton((button) =>
        button.setButtonText("Reload").onClick(async () => {
          await this.plugin.reloadCustomDictionary(true);
        }),
      );
  }
}
