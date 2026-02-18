import { describe, it, expect } from "vitest";
import {
  getMunicipalityReading,
  findByReading,
  hasReading,
} from "../../src/normalize/readings";

describe("getMunicipalityReading", () => {
  it("東京23区の読みを取得できる", () => {
    expect(getMunicipalityReading("新宿区")).toContain("しんじゅくく");
    expect(getMunicipalityReading("渋谷区")).toContain("しぶやく");
    expect(getMunicipalityReading("千代田区")).toContain("ちよだく");
  });

  it("政令指定都市の読みを取得できる", () => {
    expect(getMunicipalityReading("横浜市")).toContain("よこはまし");
    expect(getMunicipalityReading("大阪市")).toContain("おおさかし");
    expect(getMunicipalityReading("名古屋市")).toContain("なごやし");
  });

  it("登録されていない市区町村は空配列を返す", () => {
    expect(getMunicipalityReading("存在しない市")).toEqual([]);
  });

  it("「さいたま市」のようなひらがな市名も登録されている", () => {
    expect(getMunicipalityReading("さいたま市")).toContain("さいたまし");
  });
});

describe("findByReading", () => {
  it("ひらがな読みから市区町村名を逆引きできる", () => {
    const results = findByReading("しんじゅくく");
    expect(results).toContain("新宿区");
  });

  it("完全一致しない読みは空配列を返す", () => {
    expect(findByReading("そんざいしないよみ")).toEqual([]);
  });

  it("部分一致ではなく完全一致で検索する", () => {
    const results = findByReading("しんじゅく");
    expect(results).not.toContain("新宿区");
  });
});

describe("hasReading", () => {
  it("登録済み市区町村はtrueを返す", () => {
    expect(hasReading("新宿区")).toBe(true);
  });

  it("未登録市区町村はfalseを返す", () => {
    expect(hasReading("存在しない市")).toBe(false);
  });
});
