import { describe, expect, it } from "vitest";
import {
  addDictionaryWord,
  addDictionaryWords,
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

describe("addDictionaryWords", () => {
  it("sorts distinct normalized additions while preserving comments", () => {
    expect(addDictionaryWords("# Terms\nOpenAI", ["OpenAI", "it’s", "it's", "Codex"]))
      .toEqual({ contents: "# Terms\nCodex\nit's\nOpenAI\n", added: 2 });
  });

  it("leaves content unchanged when no new words are supplied", () => {
    expect(addDictionaryWords("OpenAI", ["OpenAI"]))
      .toEqual({ contents: "OpenAI", added: 0 });
    expect(addDictionaryWords("", [])).toEqual({ contents: "", added: 0 });
  });

  it("rejects a batch containing an invalid entry", () => {
    expect(() => addDictionaryWords("", ["valid", "two words"])).toThrow();
  });
});

describe("dotted dictionary entries", () => {
  it("loads, sorts, deduplicates, and removes dotted words", () => {
    const updated = addDictionaryWords("# Terms\nZebra\n", ["Node.js", "Next.js", "Node.js"]);
    expect(updated).toEqual({ contents: "# Terms\nNext.js\nNode.js\nZebra\n", added: 2 });
    expect([...parseCustomDictionary(updated.contents)]).toEqual(["Next.js", "Node.js", "Zebra"]);
    expect(addDictionaryWord(updated.contents, "Node.js")).toBe(updated.contents);
    expect(removeDictionaryWord(updated.contents, "Node.js")).toBe("# Terms\nNext.js\nZebra\n");
  });
});
