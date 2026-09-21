import type { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import {
  Editor,
  editorInfoField,
  Menu,
  Notice,
  Plugin,
  type TAbstractFile,
} from "obsidian";
import { collectDocumentMisspellings, createSpellcheckExtension } from "./spell/editor-extension";
import { DictionaryService } from "./spell/dictionary-service";
import { wordAtOffset, type WordRange } from "./spell/tokenizer";
import {
  DEFAULT_SETTINGS,
  SpellcheckSettingTab,
  sanitizeSettings,
  type SpellcheckSettings,
} from "./settings";
import { CustomDictionaryStore } from "./storage/custom-dictionary-store";

export default class VaultSpellcheckPlugin extends Plugin {
  settings: SpellcheckSettings = DEFAULT_SETTINGS;

  private readonly editorViews = new Set<EditorView>();
  private dictionary!: DictionaryService;
  private dictionaryStore!: CustomDictionaryStore;
  private readonly editorExtensions: Extension[] = [];
  private editorExtensionRegistered = false;
  private reloadTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.dictionaryStore = new CustomDictionaryStore(
      this.app.vault,
      () => this.settings.customDictionaryPath,
    );

    let customWords = new Set<string>();
    try {
      customWords = await this.dictionaryStore.loadWords();
    } catch (error) {
      this.reportError("Could not load the custom dictionary", error);
    }
    this.dictionary = new DictionaryService(customWords);

    this.replaceEditorExtension();
    this.registerEditorExtension(this.editorExtensions);
    this.editorExtensionRegistered = true;

    this.addSettingTab(new SpellcheckSettingTab(this.app, this));
    this.registerCommands();
    this.registerContextMenu();
    this.registerDictionaryFileEvents();
  }

  onunload(): void {
    if (this.reloadTimer !== null) {
      window.clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
  }

  async onExternalSettingsChange(): Promise<void> {
    const previousPath = this.settings.customDictionaryPath;
    await this.loadSettings();
    if (previousPath !== this.settings.customDictionaryPath) {
      await this.reloadCustomDictionary(false);
    }
    this.refreshEditorExtension();
  }

  async updateSettings(update: Partial<SpellcheckSettings>): Promise<void> {
    const previousPath = this.settings.customDictionaryPath;
    this.settings = sanitizeSettings({ ...this.settings, ...update });
    await this.saveData(this.settings);

    if (previousPath !== this.settings.customDictionaryPath) {
      await this.reloadCustomDictionary(false);
    }
    this.refreshEditorExtension();
  }

  async reloadCustomDictionary(showNotice: boolean): Promise<void> {
    if (this.reloadTimer !== null) {
      window.clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }

    try {
      const words = await this.dictionaryStore.loadWords();
      const changed = this.dictionary.replaceCustomWords(words);
      if (changed) {
        this.refreshEditorExtension();
      }
      if (showNotice) {
        new Notice(`Loaded ${words.size} custom dictionary words.`);
      }
    } catch (error) {
      this.reportError("Could not reload the custom dictionary", error);
    }
  }

  private async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<SpellcheckSettings> | null;
    this.settings = sanitizeSettings(stored);
  }

  private replaceEditorExtension(): void {
    this.editorExtensions.length = 0;
    this.editorExtensions.push(
      createSpellcheckExtension({
        dictionary: this.dictionary,
        getSettings: () => this.settings,
        registerView: (view) => { this.editorViews.add(view); },
        unregisterView: (view) => { this.editorViews.delete(view); },
      }),
    );
  }

  private refreshEditorExtension(): void {
    this.replaceEditorExtension();
    if (this.editorExtensionRegistered) {
      this.app.workspace.updateOptions();
    }
  }

  private registerCommands(): void {
    this.addCommand({
      id: "add-all-highlighted-words",
      name: "Add all highlighted words in current document to custom dictionary",
      editorCallback: (editor) => {
        void this.addHighlightedWords(editor);
      },
    });

    this.addCommand({
      id: "add-word-under-cursor",
      name: "Add word under cursor to custom dictionary",
      editorCallback: (editor) => {
        const word = this.getWordUnderCursor(editor);
        if (word === null) {
          new Notice("Place the cursor on an English word first.");
          return;
        }
        void this.addCustomWord(word.word);
      },
    });

    this.addCommand({
      id: "remove-word-under-cursor",
      name: "Remove word under cursor from custom dictionary",
      editorCallback: (editor) => {
        const word = this.getWordUnderCursor(editor);
        if (word === null) {
          new Notice("Place the cursor on an English word first.");
          return;
        }
        void this.removeCustomWord(word.word);
      },
    });

    this.addCommand({
      id: "reload-custom-dictionary",
      name: "Reload custom dictionary",
      callback: () => {
        void this.reloadCustomDictionary(true);
      },
    });

    this.addCommand({
      id: "toggle-spellcheck",
      name: "Toggle spellcheck",
      callback: () => {
        const enabled = !this.settings.enabled;
        void this.updateSettings({ enabled }).then(() => {
          new Notice(`Spellcheck ${enabled ? "enabled" : "disabled"}.`);
        });
      },
    });
  }

  private registerContextMenu(): void {
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        this.addSpellcheckMenuItems(menu, editor);
      }),
    );
  }

  private addSpellcheckMenuItems(menu: Menu, editor: Editor): void {
    if (!this.settings.enabled) {
      return;
    }

    const word = this.getWordUnderCursor(editor);
    if (
      word === null ||
      this.dictionary.isCorrect(word.word, this.settings)
    ) {
      return;
    }

    const cursor = editor.getCursor();
    const from = { line: cursor.line, ch: word.from };
    const to = { line: cursor.line, ch: word.to };
    const suggestions = this.dictionary.suggestions(word.word);

    menu.addSeparator();
    for (const suggestion of suggestions) {
      menu.addItem((item) =>
        item
          .setTitle(suggestion)
          .setIcon("spell-check")
          .onClick(() => editor.replaceRange(suggestion, from, to)),
      );
    }

    menu.addItem((item) =>
      item
        .setTitle(`Add “${word.word}” to dictionary`)
        .setIcon("book-plus")
        .onClick(() => {
          void this.addCustomWord(word.word);
        }),
    );
    menu.addItem((item) =>
      item
        .setTitle(`Ignore “${word.word}” for this session`)
        .setIcon("eye-off")
        .onClick(() => {
          this.dictionary.ignoreForSession(word.word);
          this.refreshEditorExtension();
        }),
    );
  }

  private registerDictionaryFileEvents(): void {
    const concernsDictionary = (file: TAbstractFile): boolean =>
      file.path === this.dictionaryStore.currentPath();

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (concernsDictionary(file)) {
          this.scheduleDictionaryReload();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (concernsDictionary(file)) {
          this.scheduleDictionaryReload();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (concernsDictionary(file)) {
          this.scheduleDictionaryReload();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (concernsDictionary(file) || oldPath === this.dictionaryStore.currentPath()) {
          this.scheduleDictionaryReload();
        }
      }),
    );
  }

  private scheduleDictionaryReload(): void {
    if (this.reloadTimer !== null) {
      window.clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = window.setTimeout(() => {
      this.reloadTimer = null;
      void this.reloadCustomDictionary(false);
    }, 300);
  }

  private async addHighlightedWords(editor: Editor): Promise<void> {
    try {
      if (!this.settings.enabled) {
        new Notice("Enable spellcheck first to highlight misspelled words.");
        return;
      }
      const view = [...this.editorViews].find(
        (candidate) => candidate.state.field(editorInfoField, false)?.editor === editor,
      );
      if (view === undefined) {
        new Notice("Open the document in Source mode or Live Preview first.");
        return;
      }
      const words = collectDocumentMisspellings(view, this.dictionary, this.settings);
      if (words.length === 0) {
        new Notice("No highlighted words found in the current document.");
        return;
      }
      const added = await this.dictionaryStore.addWords(words);
      await this.reloadCustomDictionary(false);
      new Notice(`Added ${added} ${added === 1 ? "word" : "words"} to the custom dictionary.`);
    } catch (error) {
      this.reportError("Could not add highlighted words", error);
    }
  }

  private async addCustomWord(word: string): Promise<void> {
    try {
      const changed = await this.dictionaryStore.addWord(word);
      await this.reloadCustomDictionary(false);
      new Notice(
        changed
          ? `Added “${word}” to the custom dictionary.`
          : `“${word}” is already in the custom dictionary.`,
      );
    } catch (error) {
      this.reportError(`Could not add “${word}”`, error);
    }
  }

  private async removeCustomWord(word: string): Promise<void> {
    if (!this.dictionary.hasCustomWord(word)) {
      new Notice(`“${word}” is not in the custom dictionary.`);
      return;
    }

    try {
      const changed = await this.dictionaryStore.removeWord(word);
      await this.reloadCustomDictionary(false);
      new Notice(
        changed
          ? `Removed “${word}” from the custom dictionary.`
          : `“${word}” is not in the custom dictionary.`,
      );
    } catch (error) {
      this.reportError(`Could not remove “${word}”`, error);
    }
  }

  private getWordUnderCursor(editor: Editor): WordRange | null {
    const cursor = editor.getCursor();
    return wordAtOffset(editor.getLine(cursor.line), cursor.ch);
  }

  private reportError(prefix: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`${prefix}:`, error);
    new Notice(`${prefix}: ${detail}`);
  }
}
