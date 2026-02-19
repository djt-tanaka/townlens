import { describe, it, expect } from "vitest";
import { mergeIndicators } from "../../src/scoring/merge-indicators";
import type { CityIndicators, IndicatorValue } from "../../src/scoring/types";

const baseCities: ReadonlyArray<CityIndicators> = [
  {
    cityName: "新宿区",
    areaCode: "13104",
    indicators: [
      { indicatorId: "population_total", rawValue: 346235, dataYear: "2020", sourceId: "estat" },
    ],
  },
  {
    cityName: "渋谷区",
    areaCode: "13113",
    indicators: [
      { indicatorId: "population_total", rawValue: 227850, dataYear: "2020", sourceId: "estat" },
    ],
  },
];

describe("mergeIndicators", () => {
  it("dataMapのデータをextractorで変換して指標に追加する", () => {
    const dataMap = new Map([
      ["13104", { value: 100 }],
      ["13113", { value: 200 }],
    ]);

    const result = mergeIndicators(baseCities, dataMap, (data) => {
      const indicator: IndicatorValue = {
        indicatorId: "test_metric",
        rawValue: data?.value ?? null,
        dataYear: "2024",
        sourceId: "test",
      };
      return [indicator];
    });

    expect(result).toHaveLength(2);
    const shinjuku = result.find((c) => c.areaCode === "13104")!;
    expect(shinjuku.indicators).toHaveLength(2);
    expect(shinjuku.indicators[1]).toEqual({
      indicatorId: "test_metric",
      rawValue: 100,
      dataYear: "2024",
      sourceId: "test",
    });
  });

  it("dataMapに含まれない都市にはextractor(undefined)の結果を追加する", () => {
    const dataMap = new Map([["13104", { value: 100 }]]);

    const result = mergeIndicators(baseCities, dataMap, (data) => [
      {
        indicatorId: "test_metric",
        rawValue: data?.value ?? null,
        dataYear: "",
        sourceId: "test",
      },
    ]);

    const shibuya = result.find((c) => c.areaCode === "13113")!;
    expect(shibuya.indicators[1].rawValue).toBeNull();
  });

  it("extractorが複数の指標を返す場合すべて追加する", () => {
    const dataMap = new Map([["13104", { a: 1, b: 2 }]]);

    const result = mergeIndicators(baseCities, dataMap, (data) => [
      { indicatorId: "metric_a", rawValue: data?.a ?? null, dataYear: "", sourceId: "test" },
      { indicatorId: "metric_b", rawValue: data?.b ?? null, dataYear: "", sourceId: "test" },
    ]);

    const shinjuku = result.find((c) => c.areaCode === "13104")!;
    expect(shinjuku.indicators).toHaveLength(3);
  });

  it("元のCityIndicatorsを変更しない（不変性）", () => {
    const dataMap = new Map([["13104", { value: 100 }]]);

    const result = mergeIndicators(baseCities, dataMap, (data) => [
      { indicatorId: "test_metric", rawValue: data?.value ?? null, dataYear: "", sourceId: "test" },
    ]);

    expect(baseCities[0].indicators).toHaveLength(1);
    expect(result[0].indicators).toHaveLength(2);
    expect(result[0]).not.toBe(baseCities[0]);
  });

  it("空の都市配列で空配列を返す", () => {
    const result = mergeIndicators([], new Map(), () => []);
    expect(result).toEqual([]);
  });

  it("空のdataMapでもextractor(undefined)を全都市に適用する", () => {
    const result = mergeIndicators(baseCities, new Map(), (data) => [
      { indicatorId: "test_metric", rawValue: data ?? null, dataYear: "", sourceId: "test" },
    ]);

    for (const city of result) {
      expect(city.indicators).toHaveLength(2);
      expect(city.indicators[1].rawValue).toBeNull();
    }
  });
});
