/**
 * ひらがな・カタカナの変換ユーティリティ。
 * Unicode演算（オフセット0x60）で全角カタカナ↔ひらがなを変換する。
 */

/** ひらがなの Unicode 範囲 (U+3041 ~ U+3096) */
const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;

/** カタカナの Unicode 範囲 (U+30A1 ~ U+30F6) */
const KATAKANA_START = 0x30A1;
const KATAKANA_END = 0x30F6;

/** カタカナとひらがなのコードポイント差 */
const KANA_OFFSET = KATAKANA_START - HIRAGANA_START; // 0x60

/** 文字がひらがなか判定する */
export function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= HIRAGANA_START && code <= HIRAGANA_END;
}

/** 文字がカタカナか判定する */
export function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= KATAKANA_START && code <= KATAKANA_END;
}

/** 全角カタカナをひらがなに変換する。カタカナ以外の文字はそのまま保持する。 */
export function katakanaToHiragana(input: string): string {
  return input
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= KATAKANA_START && code <= KATAKANA_END) {
        return String.fromCharCode(code - KANA_OFFSET);
      }
      return char;
    })
    .join("");
}

/** ひらがなをカタカナに変換する。ひらがな以外の文字はそのまま保持する。 */
export function hiraganaToKatakana(input: string): string {
  return input
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= HIRAGANA_START && code <= HIRAGANA_END) {
        return String.fromCharCode(code + KANA_OFFSET);
      }
      return char;
    })
    .join("");
}

/** カタカナをひらがなに統一して正規化する。漢字・記号等はそのまま保持する。 */
export function normalizeKana(input: string): string {
  return katakanaToHiragana(input);
}
