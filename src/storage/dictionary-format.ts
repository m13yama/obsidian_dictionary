import { isDictionaryWord, normalizeWord } from "../spell/tokenizer";

export function parseCustomDictionary(contents: string): Set<string> {
  const words = new Set<string>();
  const normalizedContents = contents.replace(/^\uFEFF/, "");

  for (const line of normalizedContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    if (isDictionaryWord(trimmed)) {
      words.add(normalizeWord(trimmed));
    }
  }

  return words;
}

export function appendDictionaryWord(contents: string, word: string): string {
  const normalized = normalizeWord(word);
  if (!isDictionaryWord(normalized)) {
    throw new Error("Custom dictionary entries must be English words.");
  }

  if (parseCustomDictionary(contents).has(normalized)) {
    return contents;
  }

  if (contents.length === 0) {
    return `${normalized}\n`;
  }

  const separator = contents.endsWith("\n") ? "" : "\n";
  return `${contents}${separator}${normalized}\n`;
}

export function removeDictionaryWord(contents: string, word: string): string {
  const normalized = normalizeWord(word);
  const keptLines = contents
    .split(/\r?\n/)
    .filter((line) => normalizeWord(line) !== normalized);

  while (keptLines.length > 0 && keptLines.at(-1) === "") {
    keptLines.pop();
  }

  return keptLines.length > 0 ? `${keptLines.join("\n")}\n` : "";
}
