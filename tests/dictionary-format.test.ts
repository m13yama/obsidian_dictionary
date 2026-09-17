import { describe, expect, it } from "vitest";
import {
  addDictionaryWord,
  parseCustomDictionary,
  removeDictionaryWord,
} from "../src/storage/dictionary-format";

describe("parseCustomDictionary", () => {
  it("handles comments, blank lines, a BOM, and duplicates", () => {
    const words = parseCustomDictionary(
      "\uFEFF# Shared terms\nOpenAI\n\nOpenAI\nit’s\ninvalid phrase\n",
    );
    expect([...words]).toEqual(["OpenAI", "it's"]);
  });
});

describe("addDictionaryWord", () => {
  it("adds a normalized word in alphabetical order", () => {
    expect(addDictionaryWord("OpenAI\n", "it’s")).toBe(
      "it's\nOpenAI\n",
    );
  });

  it("sorts all existing words ignoring case and preserves capitalization", () => {
    expect(addDictionaryWord("zebra\nOpenAI\napple\nBanana\n", "Codex")).toBe(
      "apple\nBanana\nCodex\nOpenAI\nzebra\n",
    );
  });

  it("preserves comments, blank lines, other text, and existing word formatting", () => {
    expect(
      addDictionaryWord(
        "# Terms\n  zebra  \n\n# More terms\nwell-known\ninvalid phrase\nit’s\n",
        "apple",
      ),
    ).toBe(
      "# Terms\napple\n\n# More terms\nit’s\ninvalid phrase\nwell-known\n  zebra  \n",
    );
  });

  it("preserves existing duplicates and distinct capitalizations", () => {
    expect(addDictionaryWord("zebra\nApple\napple\nApple\n", "banana")).toBe(
      "Apple\napple\nApple\nbanana\nzebra\n",
    );
  });

  it("keeps the BOM at the start when the first word moves", () => {
    expect(addDictionaryWord("\uFEFFzebra\napple\n", "Banana")).toBe(
      "\uFEFFapple\nBanana\nzebra\n",
    );
  });

  it.each([
    ["", "apple\n"],
    ["zebra", "apple\nzebra\n"],
    ["zebra\n\n", "apple\n\nzebra\n"],
    ["# Terms\n", "# Terms\napple\n"],
    ["zebra\r\nBanana\r\n", "apple\r\nBanana\r\nzebra\r\n"],
    ["zebra\r\nBanana", "apple\r\nBanana\r\nzebra\r\n"],
  ])("handles file formatting for %j", (contents, expected) => {
    expect(addDictionaryWord(contents, "apple")).toBe(expected);
  });

  it("leaves the file unchanged when the normalized word already exists", () => {
    const contents = "\uFEFF# Terms\r\nzebra\r\nit's\r\nOpenAI";
    expect(addDictionaryWord(contents, "it’s")).toBe(contents);
    expect(addDictionaryWord(contents, "OpenAI")).toBe(contents);
  });

  it("rejects unsupported entries", () => {
    expect(() => addDictionaryWord("", "two words")).toThrow();
  });
});

describe("removeDictionaryWord", () => {
  it("removes only the matching entry and preserves comments", () => {
    expect(removeDictionaryWord("# Terms\nOpenAI\nCodex\n", "OpenAI")).toBe(
      "# Terms\nCodex\n",
    );
  });
});
