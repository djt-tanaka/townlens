/**
 * ラベル正規化モジュール。
 * 全角→半角変換、カナ統一、空白除去を行う。
 */
import { katakanaToHiragana } from "./kana";

const FULL_WIDTH_MAP: Record<string, string> = {
  "\uFF10": "0", // ０
  "\uFF11": "1", // １
  "\uFF12": "2", // ２
  "\uFF13": "3", // ３
  "\uFF14": "4", // ４
  "\uFF15": "5", // ５
  "\uFF16": "6", // ６
  "\uFF17": "7", // ７
  "\uFF18": "8", // ８
  "\uFF19": "9", // ９
  "\uFF0D": "-", // －
  "\u301C": "~", // 〜
  "\uFF5E": "~", // ～
  "\u3000": " ", //
};

/** 全角文字を半角に変換し、小文字化・空白除去する（既存互換） */
export function normalizeLabel(input: string): string {
  const half = input
    .split("")
    .map((char) => FULL_WIDTH_MAP[char] ?? char)
    .join("")
    .toLowerCase();

  return half.replace(/\s+/g, "").trim();
}

/** normalizeLabel + カタカナ→ひらがな統一。表記ゆれ比較用。 */
export function normalizeLabelWithKana(input: string): string {
  return katakanaToHiragana(normalizeLabel(input));
}
