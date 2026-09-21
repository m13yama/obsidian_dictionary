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

export function addDictionaryWord(contents: string, word: string): string {
  return addDictionaryWords(contents, [word]).contents;
}

export function addDictionaryWords(
  contents: string,
  words: Iterable<string>,
): { contents: string; added: number } {
  const existing = parseCustomDictionary(contents);
  const additions: string[] = [];
  for (const word of words) {
    const normalized = normalizeWord(word);
    if (!isDictionaryWord(normalized)) {
      throw new Error("Custom dictionary entries must be English words.");
    }
    if (!existing.has(normalized)) {
      existing.add(normalized);
      additions.push(normalized);
    }
  }
  if (additions.length === 0) {
    return { contents, added: 0 };
  }

  const bom = contents.startsWith("\uFEFF") ? "\uFEFF" : "";
  const lineEnding = contents.includes("\r\n") ? "\r\n" : "\n";
  const lines = contents.slice(bom.length).split(/\r?\n/);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  lines.push(...additions);

  const sortedWords = lines.filter(isDictionaryWord).sort((left, right) => {
    const leftKey = normalizeWord(left).toLowerCase();
    const rightKey = normalizeWord(right).toLowerCase();
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  // Replace only word lines so comments, blank lines, and other text stay put.
  let wordIndex = 0;
  const sortedLines = lines.map((line) =>
    isDictionaryWord(line) ? sortedWords[wordIndex++] : line,
  );
  return { contents: `${bom}${sortedLines.join(lineEnding)}${lineEnding}`, added: additions.length };
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
