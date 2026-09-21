# Vault Spellcheck

Vault Spellcheck is an English spellchecker for Obsidian with a custom dictionary that lives inside the vault. Unlike the operating system or Chromium custom dictionary, its words can be synchronized by Dropbox, Git, or another vault sync tool.

## Features

- Bundled US English Hunspell dictionary; no network access at runtime.
- Wavy underlines for misspellings in Source mode and Live Preview.
- Up to five correction suggestions in the editor context menu.
- Add a word, remove a word, or ignore it for the current session.
- One-word-per-line custom dictionary stored at `_dictionary/custom-words.md` by default, so it can be edited directly in Obsidian.
- Automatic alphabetical sorting of the custom dictionary whenever a new word is added.
- Automatic reload when a sync tool modifies the custom dictionary.
- Desktop and mobile support without Node.js or Electron APIs at runtime.

## Usage

After enabling the plugin, misspelled English words in visible editor text are underlined. The underline remains visible while the word is selected or edited.

Right-click a misspelled word to replace it with a suggestion, add it to the custom dictionary, or ignore it for the current session. On mobile, use the command palette:

- **Add word under cursor to custom dictionary**
- **Add all highlighted words in current document to custom dictionary**
- **Remove word under cursor from custom dictionary**
- **Reload custom dictionary**
- **Toggle spellcheck**

The bulk-add command adds all words marked as misspelled by this plugin throughout the current document, including text outside the visible area. It respects the spellcheck settings and skipped regions, saves duplicate words only once, and reports how many words were added. Use it in Source mode or Live Preview with spellcheck enabled.

The custom dictionary is a UTF-8 Markdown file containing one word per line. Blank lines and lines beginning with `#` are ignored. Apostrophes and hyphenated words are supported. Adding a new word sorts all word entries alphabetically, ignoring case while preserving their capitalization. Comments, blank lines, and other non-word lines stay in place. Adding an existing word leaves the file unchanged.

```text
# Project terms
Codex
OpenAI
well-known
```

The dictionary path and acronym, camel case, and hyphenated-compound behavior can be changed in the plugin settings.

## What is skipped

The plugin checks only ASCII English words and skips common non-prose Markdown regions, including code, URLs, email addresses, frontmatter, math, HTML, tags, and internal links. Reading View is not checked.

If Obsidian's built-in spellcheck is enabled, both spellcheckers may draw underlines. Disable the built-in spellcheck if you only want the synchronized dictionary behavior.

## Development

Requirements: Node.js 18 or later and npm.

```bash
npm install
npm run check
```

For development builds that watch source files:

```bash
npm run dev
```

Copy or link this repository into `VaultFolder/.obsidian/plugins/vault-spellcheck`, then enable **Vault Spellcheck** in Obsidian. The production release consists of `main.js`, `manifest.json`, and `styles.css`. The build embeds the English dictionary and its license notice into `main.js`.

## Dictionary and licenses

Spellchecking uses [nspell](https://github.com/wooorm/nspell) and the US English [dictionary-en](https://github.com/wooorm/dictionaries/tree/main/dictionaries/en) Hunspell dictionary. See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). The production build also embeds the complete upstream license texts in `main.js`.
