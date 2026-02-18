import { describe, it, expect } from "vitest";
import {
  arrify,
  textFrom,
  parseNumber,
  toCdParamName,
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
