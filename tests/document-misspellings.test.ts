import { StreamLanguage } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { NodeType, Tree } from "@lezer/common";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import { collectDocumentMisspellings, findMisspellings } from "../src/spell/editor-extension";
import type { SpellcheckSettings } from "../src/settings";

const settings: SpellcheckSettings = {
  enabled: true, customDictionaryPath: "words.md", ignoreAllCaps: true,
  ignoreCamelCase: false, acceptHyphenatedCompounds: true,
};
const dictionary = { isCorrect: (word: string) => word === "hello" };

describe("document misspellings", () => {
  it("skips correct words, URLs, emails, tags, and internal links", () => {
    const text = "hello wrng https://example.com user@example.com #tag [[target]] [wrng](target)";
    expect(findMisspellings(text, 0, Tree.empty, dictionary, settings).map(w => w.word))
      .toEqual(["wrng", "wrng"]);
  });

  it("checks dotted terms as whole words while still excluding URLs and emails", () => {
    expect(findMisspellings(
      "Node.js. https://Node.js user@Node.js", 0, Tree.empty, dictionary, settings,
    )).toEqual([{ word: "Node.js", from: 0, to: 7 }]);
  });

  it("uses syntax exclusions and preserves absolute offsets", () => {
    const root = NodeType.define({ id: 0, name: "Document", top: true });
    const code = NodeType.define({ id: 1, name: "InlineCode" });
    const tree = new Tree(root, [new Tree(code, [], [], 4)], [10], 19);
    expect(findMisspellings("code wrng", 10, tree, dictionary, settings))
      .toEqual([{ word: "wrng", from: 15, to: 19 }]);
  });

  it("scans beyond the viewport and deduplicates repeated words", () => {
    const view = { state: EditorState.create({ doc: "wrng\nhello\nwrng\notherr",
      extensions: [StreamLanguage.define({ token(stream) { stream.skipToEnd(); return null; } })] }),
      visibleRanges: [{ from: 0, to: 4 }] } as unknown as EditorView;
    expect(collectDocumentMisspellings(view, dictionary, settings))
      .toEqual(["wrng", "otherr"]);
    expect(collectDocumentMisspellings(view, dictionary, { ...settings, enabled: false }))
      .toEqual([]);
  });
});
