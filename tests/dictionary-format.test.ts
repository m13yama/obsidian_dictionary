import { describe, expect, it } from "vitest";
import {
  appendDictionaryWord,
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

describe("appendDictionaryWord", () => {
  it("appends one normalized word per line", () => {
    expect(appendDictionaryWord("OpenAI\n", "it’s")).toBe(
      "OpenAI\nit's\n",
    );
  });

  it("does not append an existing word", () => {
    expect(appendDictionaryWord("OpenAI\n", "OpenAI")).toBe("OpenAI\n");
  });

  it("rejects unsupported entries", () => {
    expect(() => appendDictionaryWord("", "two words")).toThrow();
  });
});

describe("removeDictionaryWord", () => {
  it("removes only the matching entry and preserves comments", () => {
    expect(removeDictionaryWord("# Terms\nOpenAI\nCodex\n", "OpenAI")).toBe(
      "# Terms\nCodex\n",
    );
  });
});
