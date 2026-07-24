import nspell, { type NSpell } from "nspell";
import enAff from "dictionary-en/index.aff";
import enDic from "dictionary-en/index.dic";
import type { SpellcheckSettings } from "../settings";
import { normalizeWord } from "./tokenizer";

export class DictionaryService {
  private checker: NSpell;
  private customWords = new Set<string>();
  private readonly ignoredForSession = new Set<string>();
  private readonly correctnessCache = new Map<string, boolean>();

  constructor(customWords: Iterable<string>) {
    this.checker = this.createChecker();
    this.replaceCustomWords(customWords);
  }

  isCorrect(word: string, settings: SpellcheckSettings): boolean {
    const normalized = normalizeWord(word);
    if (normalized.length === 0 || this.ignoredForSession.has(normalized)) {
      return true;
    }

    if (settings.ignoreAllCaps && isAllCaps(normalized)) {
      return true;
    }

    if (settings.ignoreCamelCase && isCamelCase(normalized)) {
      return true;
    }

    const cacheKey = [
      normalized,
      settings.ignoreAllCaps ? "1" : "0",
      settings.ignoreCamelCase ? "1" : "0",
      settings.acceptHyphenatedCompounds ? "1" : "0",
    ].join("\u0000");
    const cached = this.correctnessCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    let correct = this.checker.correct(normalized);
    if (
      !correct &&
      settings.acceptHyphenatedCompounds &&
      normalized.includes("-")
    ) {
      correct = normalized
        .split("-")
        .every((component) => this.checker.correct(component));
    }

    this.correctnessCache.set(cacheKey, correct);
    return correct;
  }

  suggestions(word: string, limit = 5): string[] {
    const normalized = normalizeWord(word);
    return [...new Set(this.checker.suggest(normalized))].slice(0, limit);
  }

  ignoreForSession(word: string): void {
    this.ignoredForSession.add(normalizeWord(word));
    this.correctnessCache.clear();
  }

  hasCustomWord(word: string): boolean {
    return this.customWords.has(normalizeWord(word));
  }

  replaceCustomWords(words: Iterable<string>): boolean {
    const nextWords = new Set(
      [...words].map(normalizeWord).filter((word) => word.length > 0),
    );
    if (setsAreEqual(this.customWords, nextWords)) {
      return false;
    }

    this.customWords = nextWords;
    this.checker = this.createChecker();
    for (const word of this.customWords) {
      this.checker.add(word);
    }
    this.correctnessCache.clear();
    return true;
  }

  private createChecker(): NSpell {
    return nspell(enAff, enDic);
  }
}

function setsAreEqual(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  return [...left].every((word) => right.has(word));
}

function isAllCaps(word: string): boolean {
  const lettersOnly = word.replace(/['-].*$/, "");
  return lettersOnly.length > 1 && /^[A-Z]+$/.test(lettersOnly);
}

function isCamelCase(word: string): boolean {
  return /[a-z][A-Z]/.test(word) || /^[A-Z]{2,}[a-z]/.test(word);
}
