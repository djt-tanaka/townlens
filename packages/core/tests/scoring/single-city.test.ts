import { describe, it, expect } from "vitest";
import { scoreSingleCity } from "../../src/scoring/single-city";
import type {
  CityIndicators,
  IndicatorDefinition,
  WeightPreset,
} from "../../src/scoring/types";

const TEST_DEFINITIONS: ReadonlyArray<IndicatorDefinition> = [
  {
    id: "population_total",
    label: "総人口",
    unit: "人",
    direction: "higher_better",
    category: "childcare",
    precision: 0,
  },
  {
    id: "kids_ratio",
    label: "0-14歳比率",
    unit: "%",
    direction: "higher_better",
    category: "childcare",
    precision: 1,
  },
  {
    id: "condo_price_median",
    label: "中古マンション価格",
    unit: "万円",
    direction: "lower_better",
    category: "price",
    precision: 0,
  },
  {
    id: "crime_rate",
    label: "犯罪率",
    unit: "件/千人",
    direction: "lower_better",
    category: "safety",
    precision: 2,
  },
];

const TEST_PRESET: WeightPreset = {
  name: "childcare",
  label: "子育て重視",
  weights: {
    childcare: 0.35,
    price: 0.2,
    safety: 0.15,
    disaster: 0.05,
    transport: 0.05,
    education: 0.2,
  },
};

function createTestCity(
  overrides: Partial<{
    population: number;
    kidsRatio: number;
    price: number | null;
    crimeRate: number | null;
  }> = {},
): CityIndicators {
  const {
    population = 300_000,
    kidsRatio = 12.0,
    price = 2500,
    crimeRate = 4.0,
  } = overrides;

  const indicators = [
    {
      indicatorId: "population_total",
      rawValue: population,
      dataYear: "2020",
      sourceId: "test",
    },
    {
      indicatorId: "kids_ratio",
      rawValue: kidsRatio,
      dataYear: "2020",
      sourceId: "test",
    },
    ...(price !== null
      ? [
          {
            indicatorId: "condo_price_median",
            rawValue: price,
            dataYear: "2023",
            sourceId: "test",
          },
        ]
      : []),
    ...(crimeRate !== null
      ? [
          {
            indicatorId: "crime_rate",
            rawValue: crimeRate,
            dataYear: "2022",
            sourceId: "test",
          },
        ]
      : []),
  ];

  return {
    cityName: "テスト市",
    areaCode: "99999",
    indicators,
  };
}

describe("scoreSingleCity", () => {
  it("全指標が揃った都市のスター評価を返す", () => {
    const city = createTestCity();
    const result = scoreSingleCity(city, TEST_DEFINITIONS, TEST_PRESET);

    expect(result.cityName).toBe("テスト市");
    expect(result.areaCode).toBe("99999");
    expect(result.starRating).toBeGreaterThanOrEqual(1);
    expect(result.starRating).toBeLessThanOrEqual(5);
    expect(result.indicatorStars).toHaveLength(4);
  });

  it("各指標のスター評価が1-5の範囲内", () => {
    const city = createTestCity();
    const result = scoreSingleCity(city, TEST_DEFINITIONS, TEST_PRESET);

    for (const star of result.indicatorStars) {
      expect(star.stars).toBeGreaterThanOrEqual(1);
      expect(star.stars).toBeLessThanOrEqual(5);
      expect(star.nationalPercentile).toBeGreaterThanOrEqual(0);
      expect(star.nationalPercentile).toBeLessThanOrEqual(100);
    }
  });

  it("高スコアの都市は高いスター評価を得る", () => {
    // 人口多い・子ども比率高い・価格安い・犯罪率低い
    const city = createTestCity({
      population: 500_000,
      kidsRatio: 14.0,
      price: 700,
      crimeRate: 1.5,
    });
    const result = scoreSingleCity(city, TEST_DEFINITIONS, TEST_PRESET);

    expect(result.starRating).toBeGreaterThanOrEqual(4);
  });

  it("低スコアの都市は低いスター評価を得る", () => {
    // 人口少ない・子ども比率低い・価格高い・犯罪率高い
    const city = createTestCity({
      population: 10_000,
      kidsRatio: 8.0,
      price: 5000,
      crimeRate: 10.0,
    });
    const result = scoreSingleCity(city, TEST_DEFINITIONS, TEST_PRESET);

    expect(result.starRating).toBeLessThanOrEqual(2.5);
  });

  it("一部指標が欠損している場合は有効指標のみでスコアリング", () => {
    const city = createTestCity({ price: null, crimeRate: null });
    const result = scoreSingleCity(city, TEST_DEFINITIONS, TEST_PRESET);

    expect(result.indicatorStars).toHaveLength(2);
    expect(result.indicatorStars.map((s) => s.indicatorId)).toEqual([
      "population_total",
      "kids_ratio",
    ]);
    expect(result.starRating).toBeGreaterThanOrEqual(1);
    expect(result.starRating).toBeLessThanOrEqual(5);
  });

  it("全指標が欠損している場合はデフォルト3を返す", () => {
    const city: CityIndicators = {
      cityName: "空市",
      areaCode: "00000",
      indicators: [],
    };
    const result = scoreSingleCity(city, TEST_DEFINITIONS, TEST_PRESET);

    expect(result.starRating).toBe(3);
    expect(result.indicatorStars).toHaveLength(0);
  });

  it("プリセットの重みがスコアに反映される", () => {
    const city = createTestCity({
      population: 300_000,
      kidsRatio: 13.5,
      price: 800,
      crimeRate: 8.0,
    });

    const childcareResult = scoreSingleCity(city, TEST_DEFINITIONS, TEST_PRESET);

    const safetyPreset: WeightPreset = {
      name: "safety",
      label: "安全重視",
      weights: {
        childcare: 0.15,
        price: 0.1,
        safety: 0.35,
        disaster: 0.2,
        transport: 0.1,
        education: 0.1,
      },
    };
    const safetyResult = scoreSingleCity(city, TEST_DEFINITIONS, safetyPreset);

    // 犯罪率が高い（8.0）ので安全重視プリセットでは低くなるはず
    expect(safetyResult.starRating).toBeLessThanOrEqual(
      childcareResult.starRating,
    );
  });
});
