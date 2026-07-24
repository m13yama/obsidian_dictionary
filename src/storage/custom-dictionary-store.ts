import { TFile, TFolder, Vault, normalizePath } from "obsidian";
import {
  appendDictionaryWord,
  parseCustomDictionary,
  removeDictionaryWord,
} from "./dictionary-format";

export class CustomDictionaryStore {
  constructor(
    private readonly vault: Vault,
    private readonly getPath: () => string,
  ) {}

  currentPath(): string {
    return normalizePath(this.getPath());
  }

  async loadWords(): Promise<Set<string>> {
    const file = await this.ensureFile();
    return parseCustomDictionary(await this.vault.read(file));
  }

  async addWord(word: string): Promise<boolean> {
    const file = await this.ensureFile();
    let changed = false;
    await this.vault.process(file, (contents) => {
      const updated = appendDictionaryWord(contents, word);
      changed = updated !== contents;
      return updated;
    });
    return changed;
  }

  async removeWord(word: string): Promise<boolean> {
    const file = await this.ensureFile();
    let changed = false;
    await this.vault.process(file, (contents) => {
      const updated = removeDictionaryWord(contents, word);
      changed = updated !== contents;
      return updated;
    });
    return changed;
  }

  private async ensureFile(): Promise<TFile> {
    const filePath = this.currentPath();
    await this.ensureParentFolders(filePath);

    const existing = this.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
      return existing;
    }
    if (existing !== null) {
      throw new Error(`The custom dictionary path is not a file: ${filePath}`);
    }

    return this.vault.create(filePath, "");
  }

  private async ensureParentFolders(filePath: string): Promise<void> {
    const segments = filePath.split("/").slice(0, -1);
    let currentPath = "";

    for (const segment of segments) {
      currentPath = currentPath.length > 0 ? `${currentPath}/${segment}` : segment;
      const existing = this.vault.getAbstractFileByPath(currentPath);
      if (existing instanceof TFolder) {
        continue;
      }
      if (existing !== null) {
        throw new Error(`A file prevents creating dictionary folder: ${currentPath}`);
      }
      await this.vault.createFolder(currentPath);
    }
  }
}
