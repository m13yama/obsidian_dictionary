import { describe, expect, it } from "vitest";
import {
  findEnglishWords,
  isDictionaryWord,
  normalizeWord,
  wordAtOffset,
} from "../src/spell/tokenizer";

describe("findEnglishWords", () => {
  it("returns document offsets", () => {
    expect(findEnglishWords("hello world", 10)).toEqual([
      { word: "hello", from: 10, to: 15 },
      { word: "world", from: 16, to: 21 },
    ]);
  });

  it("keeps apostrophes and hyphenated compounds", () => {
    expect(findEnglishWords("don't mother-in-law it’s")).toEqual([
      { word: "don't", from: 0, to: 5 },
      { word: "mother-in-law", from: 6, to: 19 },
      { word: "it’s", from: 20, to: 24 },
    ]);
  });

  it("does not spellcheck fragments of identifiers", () => {
    expect(findEnglishWords("snake_case abc123 123abc plain")).toEqual([
      { word: "plain", from: 25, to: 30 },
    ]);
  });
});

describe("wordAtOffset", () => {
  it("finds a word at its start, middle, or end", () => {
    expect(wordAtOffset("alpha beta", 0)?.word).toBe("alpha");
    expect(wordAtOffset("alpha beta", 2)?.word).toBe("alpha");
    expect(wordAtOffset("alpha beta", 5)?.word).toBe("alpha");
    expect(wordAtOffset("alpha beta", 7)?.word).toBe("beta");
  });

  it("returns null outside words", () => {
    expect(wordAtOffset("alpha  beta", 6)).toBeNull();
    expect(wordAtOffset("alpha", -1)).toBeNull();
  });
});

describe("dictionary word validation", () => {
  it("accepts supported English word forms", () => {
    expect(isDictionaryWord("OpenAI")).toBe(true);
    expect(isDictionaryWord("don't")).toBe(true);
    expect(isDictionaryWord("well-known")).toBe(true);
  });

  it("rejects phrases and identifiers", () => {
    expect(isDictionaryWord("two words")).toBe(false);
    expect(isDictionaryWord("snake_case")).toBe(false);
    expect(isDictionaryWord("Node.js")).toBe(false);
  });

  it("normalizes curly apostrophes", () => {
    expect(normalizeWord("  it’s  ")).toBe("it's");
  });
});
