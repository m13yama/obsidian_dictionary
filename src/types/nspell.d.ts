declare module "nspell" {
  export interface NSpell {
    add(word: string, model?: string): NSpell;
    correct(word: string): boolean;
    personal(dictionary: string): NSpell;
    remove(word: string): NSpell;
    suggest(word: string): string[];
  }

  export default function nspell(
    aff: string | Uint8Array,
    dic: string | Uint8Array,
  ): NSpell;
}
