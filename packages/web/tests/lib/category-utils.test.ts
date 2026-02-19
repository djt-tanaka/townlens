import { describe, it, expect } from "vitest";
import type {
  CityScoreResult,
  IndicatorDefinition,
} from "@townlens/core";
import { getCategoryScores, groupByCategory } from "@/lib/category-utils";

/** テスト用の指標定義 */
const definitions: ReadonlyArray<IndicatorDefinition> = [
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
    label: "年少人口比率",
    unit: "%",
    direction: "higher_better",
    category: "childcare",
    precision: 2,
  },
  {
    id: "condo_price_median",
    label: "取引価格中央値",
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

/** テスト用の都市スコア結果 */
const mockResult: CityScoreResult = {
  cityName: "世田谷区",
  areaCode: "13112",
  baseline: [
    { indicatorId: "population_total", percentile: 85, populationSize: 1000, baselineName: "全国" },
    { indicatorId: "kids_ratio", percentile: 60, populationSize: 1000, baselineName: "全国" },
    { indicatorId: "condo_price_median", percentile: 30, populationSize: 500, baselineName: "全国" },
  ],
  choice: [
    { indicatorId: "population_total", score: 80 },
    { indicatorId: "kids_ratio", score: 60 },
    { indicatorId: "condo_price_median", score: 40 },
    { indicatorId: "crime_rate", score: 70 },
  ],
  compositeScore: 62.5,
  confidence: { level: "high", reason: "十分なデータあり" },
  rank: 1,
  notes: [],
};

describe("getCategoryScores", () => {
  it("カテゴリごとのスコアを正しく集計する", () => {
    const result = getCategoryScores(mockResult, definitions);

    const childcare = result.find((r) => r.category === "childcare");
    expect(childcare).toBeDefined();
    expect(childcare!.avgScore).toBe(70); // (80 + 60) / 2
    expect(childcare!.count).toBe(2);
  });

  it("カテゴリごとの指標定義を返す", () => {
    const result = getCategoryScores(mockResult, definitions);

    const childcare = result.find((r) => r.category === "childcare");
    expect(childcare!.categoryDefs).toHaveLength(2);
    expect(childcare!.categoryDefs.map((d) => d.id)).toEqual([
      "population_total",
      "kids_ratio",
    ]);
  });

  it("単一指標のカテゴリも正しく処理する", () => {
    const result = getCategoryScores(mockResult, definitions);

    const price = result.find((r) => r.category === "price");
    expect(price).toBeDefined();
    expect(price!.avgScore).toBe(40);
    expect(price!.count).toBe(1);
    expect(price!.categoryDefs).toHaveLength(1);
  });

  it("定義に存在しない indicatorId はスキップする", () => {
    const resultWithUnknown: CityScoreResult = {
      ...mockResult,
      choice: [
        { indicatorId: "unknown_indicator", score: 50 },
        { indicatorId: "population_total", score: 80 },
      ],
    };
    const result = getCategoryScores(resultWithUnknown, definitions);

    // unknown_indicator はスキップされ、childcare のみ
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("childcare");
    expect(result[0].avgScore).toBe(80);
  });

  it("空の choice 配列では空配列を返す", () => {
    const emptyResult: CityScoreResult = {
      ...mockResult,
      choice: [],
    };
    const result = getCategoryScores(emptyResult, definitions);
    expect(result).toEqual([]);
  });

  it("同じ indicatorId が重複していても categoryDefs に重複を含めない", () => {
    const duplicatedResult: CityScoreResult = {
      ...mockResult,
      choice: [
        { indicatorId: "population_total", score: 80 },
        { indicatorId: "population_total", score: 90 },
      ],
    };
    const result = getCategoryScores(duplicatedResult, definitions);
    const childcare = result.find((r) => r.category === "childcare");
    expect(childcare!.categoryDefs).toHaveLength(1);
    expect(childcare!.count).toBe(2);
    expect(childcare!.avgScore).toBe(85); // (80 + 90) / 2
  });
});

describe("groupByCategory", () => {
  it("指標をカテゴリ別にグループ化する", () => {
    const groups = groupByCategory(definitions);

    expect(groups).toHaveLength(3); // childcare, price, safety
  });

  it("childcare カテゴリに2つの指標が含まれる", () => {
    const groups = groupByCategory(definitions);
    const childcare = groups.find((g) => g.category === "childcare");

    expect(childcare).toBeDefined();
    expect(childcare!.indicators).toHaveLength(2);
    expect(childcare!.indicators.map((i) => i.id)).toEqual([
      "population_total",
      "kids_ratio",
    ]);
  });

  it("単一指標のカテゴリも正しくグループ化する", () => {
    const groups = groupByCategory(definitions);
    const safety = groups.find((g) => g.category === "safety");

    expect(safety).toBeDefined();
    expect(safety!.indicators).toHaveLength(1);
    expect(safety!.indicators[0].id).toBe("crime_rate");
  });

  it("空の定義配列では空配列を返す", () => {
    const groups = groupByCategory([]);
    expect(groups).toEqual([]);
  });
});
