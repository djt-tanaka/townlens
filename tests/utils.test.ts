import { describe, it, expect } from "vitest";
import {
  arrify,
  textFrom,
  normalizeLabel,
  parseNumber,
  toCdParamName,
  resolveOutPath,
  escapeHtml,
} from "../src/utils";

describe("arrify", () => {
  it("null を空配列にする", () => {
    expect(arrify(null)).toEqual([]);
  });

  it("undefined を空配列にする", () => {
    expect(arrify(undefined)).toEqual([]);
  });

  it("単一値を配列に包む", () => {
    expect(arrify("hello")).toEqual(["hello"]);
  });

  it("配列はそのまま返す", () => {
    expect(arrify([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("空配列はそのまま返す", () => {
    expect(arrify([])).toEqual([]);
  });
});

describe("textFrom", () => {
  it("文字列をそのまま返す", () => {
    expect(textFrom("hello")).toBe("hello");
  });

  it("数値を文字列に変換する", () => {
    expect(textFrom(42)).toBe("42");
  });

  it("{ $ } オブジェクトから値を取り出す", () => {
    expect(textFrom({ $: "value" })).toBe("value");
  });

  it("{ $ } がネストしている場合も再帰的に取り出す", () => {
    expect(textFrom({ $: { $: "deep" } })).toBe("deep");
  });

  it("null は空文字列を返す", () => {
    expect(textFrom(null)).toBe("");
  });

  it("undefined は空文字列を返す", () => {
    expect(textFrom(undefined)).toBe("");
  });

  it("$ を含まないオブジェクトは空文字列を返す", () => {
    expect(textFrom({ key: "val" })).toBe("");
  });
});

describe("normalizeLabel", () => {
  it("全角数字を半角に変換する", () => {
    expect(normalizeLabel("０〜１４歳")).toBe("0~14歳");
  });

  it("全角スペースを除去する", () => {
    expect(normalizeLabel("新宿　区")).toBe("新宿区");
  });

  it("半角スペースを除去する", () => {
    expect(normalizeLabel("新宿 区")).toBe("新宿区");
  });

  it("大文字を小文字に変換する", () => {
    expect(normalizeLabel("CAT01")).toBe("cat01");
  });

  it("〜 と ～ の両方を ~ に変換する", () => {
    expect(normalizeLabel("0〜14")).toBe("0~14");
    expect(normalizeLabel("0～14")).toBe("0~14");
  });

  it("全角ハイフンを半角に変換する", () => {
    expect(normalizeLabel("０－１４")).toBe("0-14");
  });
});

describe("parseNumber", () => {
  it("通常の数値文字列をパースする", () => {
    expect(parseNumber("12345")).toBe(12345);
  });

  it("カンマ付き数値をパースする", () => {
    expect(parseNumber("1,234,567")).toBe(1234567);
  });

  it("小数をパースする", () => {
    expect(parseNumber("3.14")).toBe(3.14);
  });

  it('"-" は null を返す', () => {
    expect(parseNumber("-")).toBeNull();
  });

  it('"..." は null を返す', () => {
    expect(parseNumber("...")).toBeNull();
  });

  it('"x" は null を返す', () => {
    expect(parseNumber("x")).toBeNull();
  });

  it("空文字列は null を返す", () => {
    expect(parseNumber("")).toBeNull();
  });

  it("null は null を返す", () => {
    expect(parseNumber(null)).toBeNull();
  });

  it("{ $ } オブジェクトから値をパースする", () => {
    expect(parseNumber({ $: "999" })).toBe(999);
  });

  it("数値型もパースする", () => {
    expect(parseNumber(42)).toBe(42);
  });
});

describe("toCdParamName", () => {
  it("cat01 を cdCat01 に変換する", () => {
    expect(toCdParamName("cat01")).toBe("cdCat01");
  });

  it("area を cdArea に変換する", () => {
    expect(toCdParamName("area")).toBe("cdArea");
  });

  it("空文字列は空文字列を返す", () => {
    expect(toCdParamName("")).toBe("");
  });
});

describe("resolveOutPath", () => {
  it("指定があればそのパスを解決する", () => {
    const result = resolveOutPath("/tmp/test.pdf");
    expect(result).toBe("/tmp/test.pdf");
  });

  it("指定がなければタイムスタンプ付きパスを生成する", () => {
    const result = resolveOutPath();
    expect(result).toMatch(/out\/estat_report_\d{8}_\d{6}\.pdf$/);
  });
});

describe("escapeHtml", () => {
  it("& をエスケープする", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });

  it("< をエスケープする", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it('" をエスケープする', () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("' をエスケープする", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("特殊文字がない場合はそのまま返す", () => {
    expect(escapeHtml("hello")).toBe("hello");
  });
});
