import { describe, it, expect } from "vitest";
import { mergePriceIntoScoringInput } from "../../src/reinfo/merge-scoring";
import { CityIndicators } from "../../src/scoring/types";
import { CondoPriceStats } from "../../src/reinfo/types";

const baseCities: ReadonlyArray<CityIndicators> = [
  {
    cityName: "新宿区",
    areaCode: "13104",
    indicators: [
      { indicatorId: "population_total", rawValue: 346235, dataYear: "2020", sourceId: "estat" },
      { indicatorId: "kids_ratio", rawValue: 9.37, dataYear: "2020", sourceId: "estat" },
    ],
  },
  {
    cityName: "渋谷区",
    areaCode: "13113",
    indicators: [
      { indicatorId: "population_total", rawValue: 227850, dataYear: "2020", sourceId: "estat" },
      { indicatorId: "kids_ratio", rawValue: 9.7, dataYear: "2020", sourceId: "estat" },
    ],
  },
];

describe("mergePriceIntoScoringInput", () => {
  it("価格データを都市の指標に追加する", () => {
    const priceData = new Map<string, CondoPriceStats>([
      ["13104", { median: 40000000, q25: 30000000, q75: 50000000, count: 50, year: "2024" }],
      ["13113", { median: 35000000, q25: 25000000, q75: 45000000, count: 30, year: "2024" }],
    ]);

    const result = mergePriceIntoScoringInput(baseCities, priceData);

    expect(result).toHaveLength(2);
    // 新宿区: 元の2指標 + 価格1指標 = 3
    const shinjuku = result.find((c) => c.areaCode === "13104")!;
    expect(shinjuku.indicators).toHaveLength(3);
    const priceIndicator = shinjuku.indicators.find((i) => i.indicatorId === "condo_price_median")!;
    expect(priceIndicator.rawValue).toBe(4000); // 40000000 / 10000 = 4000万円
    expect(priceIndicator.sourceId).toBe("reinfolib");
    expect(priceIndicator.dataYear).toBe("2024");
  });

  it("価格データがない都市はnull値で追加する", () => {
    const priceData = new Map<string, CondoPriceStats>([
      ["13104", { median: 40000000, q25: 30000000, q75: 50000000, count: 50, year: "2024" }],
    ]);

    const result = mergePriceIntoScoringInput(baseCities, priceData);

    const shibuya = result.find((c) => c.areaCode === "13113")!;
    const priceIndicator = shibuya.indicators.find((i) => i.indicatorId === "condo_price_median")!;
    expect(priceIndicator.rawValue).toBeNull();
  });

  it("元のCityIndicatorsを変更しない（不変性）", () => {
    const priceData = new Map<string, CondoPriceStats>([
      ["13104", { median: 40000000, q25: 30000000, q75: 50000000, count: 50, year: "2024" }],
    ]);

    const result = mergePriceIntoScoringInput(baseCities, priceData);

    // 元データは2指標のまま
    expect(baseCities[0].indicators).toHaveLength(2);
    // 結果は3指標
    expect(result[0].indicators).toHaveLength(3);
    // 参照が異なる
    expect(result[0]).not.toBe(baseCities[0]);
  });

  it("空のpriceDataでも全都市にnull指標を追加する", () => {
    const priceData = new Map<string, CondoPriceStats>();

    const result = mergePriceIntoScoringInput(baseCities, priceData);

    for (const city of result) {
      expect(city.indicators).toHaveLength(3);
      const priceIndicator = city.indicators.find((i) => i.indicatorId === "condo_price_median")!;
      expect(priceIndicator.rawValue).toBeNull();
    }
  });

  it("空の都市配列で空配列を返す", () => {
    const result = mergePriceIntoScoringInput([], new Map());
    expect(result).toEqual([]);
  });
});
