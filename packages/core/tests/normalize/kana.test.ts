import { describe, it, expect } from "vitest";
import {
  katakanaToHiragana,
  hiraganaToKatakana,
  normalizeKana,
  isHiragana,
  isKatakana,
} from "../../src/normalize/kana";

describe("katakanaToHiragana", () => {
  it("全角カタカナをひらがなに変換する", () => {
    expect(katakanaToHiragana("シンジュク")).toBe("しんじゅく");
  });

  it("ひらがなはそのまま返す", () => {
    expect(katakanaToHiragana("しんじゅく")).toBe("しんじゅく");
  });

  it("漢字混じりのカタカナを変換する", () => {
    expect(katakanaToHiragana("シンジュク区")).toBe("しんじゅく区");
  });

  it("空文字を処理できる", () => {
    expect(katakanaToHiragana("")).toBe("");
  });

  it("半角カタカナは変換しない（全角のみ対象）", () => {
    expect(katakanaToHiragana("ｼﾝｼﾞｭｸ")).toBe("ｼﾝｼﾞｭｸ");
  });

  it("濁音・半濁音を正しく変換する", () => {
    expect(katakanaToHiragana("ガギグゲゴ")).toBe("がぎぐげご");
    expect(katakanaToHiragana("パピプペポ")).toBe("ぱぴぷぺぽ");
  });

  it("拗音を正しく変換する", () => {
    expect(katakanaToHiragana("キャ")).toBe("きゃ");
    expect(katakanaToHiragana("シュ")).toBe("しゅ");
  });

  it("長音記号はそのまま保持する", () => {
    expect(katakanaToHiragana("サービス")).toBe("さーびす");
  });
});

describe("hiraganaToKatakana", () => {
  it("ひらがなをカタカナに変換する", () => {
    expect(hiraganaToKatakana("しんじゅく")).toBe("シンジュク");
  });

  it("カタカナはそのまま返す", () => {
    expect(hiraganaToKatakana("シンジュク")).toBe("シンジュク");
  });

  it("漢字混じりのひらがなを変換する", () => {
    expect(hiraganaToKatakana("しんじゅく区")).toBe("シンジュク区");
  });

  it("空文字を処理できる", () => {
    expect(hiraganaToKatakana("")).toBe("");
  });

  it("濁音・半濁音を正しく変換する", () => {
    expect(hiraganaToKatakana("がぎぐげご")).toBe("ガギグゲゴ");
    expect(hiraganaToKatakana("ぱぴぷぺぽ")).toBe("パピプペポ");
  });
});

describe("normalizeKana", () => {
  it("カタカナをひらがなに統一する", () => {
    expect(normalizeKana("シンジュク")).toBe("しんじゅく");
  });

  it("ひらがなはそのまま", () => {
    expect(normalizeKana("しんじゅく")).toBe("しんじゅく");
  });

  it("混在文字列をひらがなに統一する", () => {
    expect(normalizeKana("シンジュクく")).toBe("しんじゅくく");
  });

  it("漢字はそのまま保持する", () => {
    expect(normalizeKana("新宿区")).toBe("新宿区");
  });

  it("カタカナ+漢字の混在を処理する", () => {
    expect(normalizeKana("サイタマ市")).toBe("さいたま市");
  });

  it("空文字を処理できる", () => {
    expect(normalizeKana("")).toBe("");
  });
});

describe("isHiragana", () => {
  it("ひらがな文字を判定する", () => {
    expect(isHiragana("あ")).toBe(true);
    expect(isHiragana("ん")).toBe(true);
  });

  it("カタカナ文字はfalse", () => {
    expect(isHiragana("ア")).toBe(false);
  });

  it("漢字はfalse", () => {
    expect(isHiragana("新")).toBe(false);
  });
});

describe("isKatakana", () => {
  it("カタカナ文字を判定する", () => {
    expect(isKatakana("ア")).toBe(true);
    expect(isKatakana("ン")).toBe(true);
  });

  it("ひらがな文字はfalse", () => {
    expect(isKatakana("あ")).toBe(false);
  });

  it("漢字はfalse", () => {
    expect(isKatakana("新")).toBe(false);
  });
});
