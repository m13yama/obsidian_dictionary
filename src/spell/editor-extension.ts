import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { RangeSetBuilder, type Extension } from "@codemirror/state";
import type { SyntaxNode, Tree } from "@lezer/common";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import type { SpellcheckSettings } from "../settings";
import type { DictionaryService } from "./dictionary-service";
import { findEnglishWords, type WordRange } from "./tokenizer";

interface TextRange {
  from: number;
  to: number;
}

interface SpellcheckExtensionOptions {
  dictionary: DictionaryService;
  getSettings: () => SpellcheckSettings;
  registerView?: (view: EditorView) => void;
  unregisterView?: (view: EditorView) => void;
}

const EXCLUDED_SYNTAX_NAMES = [
  "codeblock",
  "codeinfo",
  "fencedcode",
  "inlinecode",
  "comment",
  "frontmatter",
  "html",
  "math",
  "url",
  "autolink",
  "hashtag",
  "internallink",
  "hmdinternallink",
];

const TEXT_EXCLUSION_PATTERNS = [
  /(?:https?:\/\/|www\.)[^\s<>()]+/gi,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /!?\[\[[^\]\n]+\]\]/g,
  /\]\([^\)\n]+\)/g,
  /(?:^|\s)#[A-Za-z][A-Za-z'-]*/g,
];

export function createSpellcheckExtension({
  dictionary,
  getSettings,
  registerView,
  unregisterView,
}: SpellcheckExtensionOptions): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(private readonly view: EditorView) {
        registerView?.(view);
        this.decorations = buildDecorations(view, dictionary, getSettings());
      }

      destroy(): void {
        unregisterView?.(this.view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(
            update.view,
            dictionary,
            getSettings(),
          );
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
}

function buildDecorations(
  view: EditorView,
  dictionary: DictionaryService,
  settings: SpellcheckSettings,
): DecorationSet {
  if (!settings.enabled) {
    return Decoration.none;
  }

  const builder = new RangeSetBuilder<Decoration>();
  const visibleRanges = expandedVisibleRanges(view);

  for (const visibleRange of visibleRanges) {
    for (const word of findMisspellings(
      view.state.doc.sliceString(visibleRange.from, visibleRange.to),
      visibleRange.from,
      syntaxTree(view.state),
      dictionary,
      settings,
    )) {
      builder.add(
        word.from,
        word.to,
        Decoration.mark({
          class: "vault-spellcheck-error",
          attributes: {
            "data-spellcheck-word": word.word,
          },
        }),
      );
    }
  }

  return builder.finish();
}

function expandedVisibleRanges(view: EditorView): TextRange[] {
  const expanded = view.visibleRanges.map((range) => ({
    from: view.state.doc.lineAt(range.from).from,
    to: view.state.doc.lineAt(range.to).to,
  }));
  const merged: TextRange[] = [];

  for (const range of expanded) {
    const previous = merged.at(-1);
    if (previous !== undefined && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to);
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

function collectTextExclusions(text: string, baseOffset: number): TextRange[] {
  const ranges: TextRange[] = [];
  for (const pattern of TEXT_EXCLUSION_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      ranges.push({
        from: baseOffset + match.index,
        to: baseOffset + match.index + match[0].length,
      });
    }
  }
  return ranges.sort((left, right) => left.from - right.from || left.to - right.to);
}

function isExcludedBySyntax(tree: Tree, position: number): boolean {
  let node: SyntaxNode | null = tree.resolveInner(position, 1);
  while (node !== null) {
    const normalizedName = node.type.name.toLowerCase().replace(/[-_]/g, "");
    if (EXCLUDED_SYNTAX_NAMES.some((name) => normalizedName.includes(name))) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function overlapsAny(word: TextRange, exclusions: readonly TextRange[]): boolean {
  return exclusions.some(
    (excluded) => word.from < excluded.to && word.to > excluded.from,
  );
}

export function collectDocumentMisspellings(
  view: EditorView,
  dictionary: Pick<DictionaryService, "isCorrect">,
  settings: SpellcheckSettings,
): string[] {
  if (!settings.enabled) return [];
  const tree = ensureSyntaxTree(view.state, view.state.doc.length, 1000);
  if (tree === null) {
    throw new Error("The document is still being parsed. Try the command again.");
  }
  return [...new Set(findMisspellings(
    view.state.doc.toString(), 0, tree, dictionary, settings,
  ).map((word) => word.word))];
}

export function findMisspellings(
  text: string,
  baseOffset: number,
  tree: Tree,
  dictionary: Pick<DictionaryService, "isCorrect">,
  settings: SpellcheckSettings,
): WordRange[] {
  if (!settings.enabled) return [];
  const exclusions = collectTextExclusions(text, baseOffset);
  return findEnglishWords(text, baseOffset).filter((word) =>
    !overlapsAny(word, exclusions) &&
    !isExcludedBySyntax(tree, word.from) &&
    !dictionary.isCorrect(word.word, settings),
  );
}
