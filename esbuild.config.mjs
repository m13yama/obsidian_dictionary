import esbuild from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { builtinModules } from "node:module";

const production = process.argv[2] === "production";
const projectRoot = process.cwd();

const dictionaryAssetPlugin = {
  name: "dictionary-en-assets",
  setup(build) {
    build.onResolve(
      { filter: /^dictionary-en\/index\.(aff|dic)$/ },
      (args) => ({
        path: path.join(projectRoot, "node_modules", args.path),
      }),
    );
  },
};

async function readLicense(packageName) {
  const packageDirectory = path.join(projectRoot, "node_modules", packageName);
  const candidates = ["license", "LICENSE", "license.md", "LICENSE.md"];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(path.join(packageDirectory, candidate), "utf8");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Could not locate the license for ${packageName}`);
}

function safeComment(text) {
  return text.replaceAll("*/", "* /");
}

const thirdPartyNotice = production
  ? `/*
Vault Spellcheck includes the following third-party software and data.

nspell:
${safeComment(await readLicense("nspell"))}

dictionary-en:
${safeComment(await readLicense("dictionary-en"))}
*/`
  : "/* Generated development bundle. See THIRD_PARTY_LICENSES.md for notices. */";

const context = await esbuild.context({
  banner: { js: thirdPartyNotice },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  target: "es2021",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: production,
  legalComments: "eof",
  loader: {
    ".aff": "text",
    ".dic": "text"
  },
  plugins: [dictionaryAssetPlugin],
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
