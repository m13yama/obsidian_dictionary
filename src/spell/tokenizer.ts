export interface WordRange {
  word: string;
  from: number;
  to: number;
}

const WORD_SOURCE = "[A-Za-z]+(?:['’][A-Za-z]+)*(?:[.-][A-Za-z]+(?:['’][A-Za-z]+)*)*";
const VALID_WORD = new RegExp(`^${WORD_SOURCE}$`);

export function findEnglishWords(text: string, baseOffset = 0): WordRange[] {
  const expression = new RegExp(WORD_SOURCE, "g");
  const words: WordRange[] = [];

  for (const match of text.matchAll(expression)) {
    const localFrom = match.index;
    const localTo = localFrom + match[0].length;
    const before = text[localFrom - 1];
    const after = text[localTo];

    if (isIdentifierCharacter(before) || isIdentifierCharacter(after)) {
      continue;
    }

    words.push({
      word: match[0],
      from: baseOffset + localFrom,
      to: baseOffset + localTo,
    });
  }

  return words;
}

export function wordAtOffset(text: string, offset: number): WordRange | null {
  if (offset < 0 || offset > text.length) {
    return null;
  }

  for (const word of findEnglishWords(text)) {
    if (word.from <= offset && offset <= word.to) {
      return word;
    }
  }

  return null;
}

export function isDictionaryWord(value: string): boolean {
  return VALID_WORD.test(value.trim());
}

export function normalizeWord(value: string): string {
  return value.trim().replaceAll("’", "'");
}

function isIdentifierCharacter(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z0-9_]/.test(value);
}
