import english from "dictionary-en";
import nspell from "nspell";
import { describe, expect, it } from "vitest";

describe("bundled US English dictionary source", () => {
  it("recognizes standard US spelling and rejects a misspelling", () => {
    const checker = nspell(english.aff, english.dic);

    expect(checker.correct("color")).toBe(true);
    expect(checker.correct("colour")).toBe(false);
    expect(checker.correct("definately")).toBe(false);
  });

  it("accepts words added by the user", () => {
    const checker = nspell(english.aff, english.dic);

    expect(checker.correct("OpenAI")).toBe(false);
    checker.add("OpenAI");
    expect(checker.correct("OpenAI")).toBe(true);
  });
});
