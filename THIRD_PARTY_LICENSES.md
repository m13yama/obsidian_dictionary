# Third-party notices

Vault Spellcheck uses the following third-party components:

- [nspell](https://github.com/wooorm/nspell), licensed under the MIT License.
- [dictionary-en](https://github.com/wooorm/dictionaries/tree/main/dictionaries/en), whose JavaScript packaging is MIT-licensed and whose dictionary and affix data are licensed under the included MIT and BSD terms.

The authoritative, complete license files are installed with these npm packages. `npm run build` reads those files and embeds them verbatim at the beginning of the production `main.js`, so the notices remain present when Obsidian distributes the three plugin release assets.
