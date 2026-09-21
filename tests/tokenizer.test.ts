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

  it("keeps internal periods but excludes sentence punctuation", () => {
    expect(findEnglishWords("Node.js. Next.js... hello. world")).toEqual([
      { word: "Node.js", from: 0, to: 7 },
      { word: "Next.js", from: 9, to: 16 },
      { word: "hello", from: 20, to: 25 },
      { word: "world", from: 27, to: 32 },
    ]);
    expect(findEnglishWords("System.IO.File node.js-based").map(w => w.word))
      .toEqual(["System.IO.File", "node.js-based"]);
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

  it("finds the whole dotted word when the cursor is on either part or the period", () => {
    for (const offset of [0, 3, 4, 5, 7]) {
      expect(wordAtOffset("Node.js.", offset))
        .toEqual({ word: "Node.js", from: 0, to: 7 });
    }
    expect(wordAtOffset("Node.js.", 8)).toBeNull();
  });

  it("returns null outside words", () => {
    expect(wordAtOffset("alpha  beta", 6)).toBeNull();
    expect(wordAtOffset("alpha", -1)).toBeNull();
  });
});

describe("dictionary word validation", () => {
  it("accepts supported English word forms", () => {
    expect(isDictionaryWord("OpenAI")).toBe(true);
    expect(isDictionaryWord("Node.js")).toBe(true);
    expect(isDictionaryWord("System.IO.File")).toBe(true);
    expect(isDictionaryWord("don't")).toBe(true);
    expect(isDictionaryWord("well-known")).toBe(true);
  });

  it("rejects phrases and identifiers", () => {
    expect(isDictionaryWord("two words")).toBe(false);
    expect(isDictionaryWord("snake_case")).toBe(false);
    expect(isDictionaryWord("Node.js.")).toBe(false);
    expect(isDictionaryWord("Node..js")).toBe(false);
    expect(isDictionaryWord(".Node")).toBe(false);
  });

  it("normalizes curly apostrophes", () => {
    expect(normalizeWord("  it’s  ")).toBe("it's");
  });
});
