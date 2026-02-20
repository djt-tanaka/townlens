import { describe, it, expect } from "vitest";
import { scoreCities } from "../../src/scoring";
import { CityIndicators, IndicatorDefinition, WeightPreset } from "../../src/scoring/types";

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
    label: "0-14歳比率",
    unit: "%",
    direction: "higher_better",
    category: "childcare",
    precision: 1,
  },
];

const preset: WeightPreset = {
  name: "childcare",
  label: "子育て重視",
  weights: {
    childcare: 0.5,
    price: 0.2,
    safety: 0.15,
    disaster: 0.1,
    transport: 0.05,
  },
};

function makeCities(): ReadonlyArray<CityIndicators> {
  return [
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
    {
      cityName: "目黒区",
      areaCode: "13110",
      indicators: [
        { indicatorId: "population_total", rawValue: 280200, dataYear: "2020", sourceId: "estat" },
        { indicatorId: "kids_ratio", rawValue: 10.5, dataYear: "2020", sourceId: "estat" },
      ],
    },
  ];
}

describe("scoreCities", () => {
  it("全都市のスコアとランクを計算する", () => {
    const results = scoreCities(makeCities(), definitions, preset);
    expect(results).toHaveLength(3);

    // ランクが付与されている
    const ranks = results.map((r) => r.rank).sort();
    expect(ranks).toEqual([1, 2, 3]);
  });

  it("各都市にchoiceスコアが含まれる", () => {
    const results = scoreCities(makeCities(), definitions, preset);
    for (const result of results) {
      expect(result.choice.length).toBeGreaterThan(0);
      for (const cs of result.choice) {
        expect(cs.score).toBeGreaterThanOrEqual(0);
        expect(cs.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("各都市にbaselineスコアが含まれる", () => {
    const results = scoreCities(makeCities(), definitions, preset);
    for (const result of results) {
      expect(result.baseline.length).toBeGreaterThan(0);
      for (const bs of result.baseline) {
        expect(bs.percentile).toBeGreaterThanOrEqual(0);
        expect(bs.baselineName).toBe("候補内");
      }
    }
  });

  it("compositeScoreが0-100の範囲内", () => {
    const results = scoreCities(makeCities(), definitions, preset);
    for (const result of results) {
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
    }
  });

  it("信頼度が付与される", () => {
    const results = scoreCities(makeCities(), definitions, preset);
    for (const result of results) {
      expect(["high", "medium", "low"]).toContain(result.confidence.level);
    }
  });

  it("目黒区が最高ratio → ランク1位相当", () => {
    const results = scoreCities(makeCities(), definitions, preset);
    const meguro = results.find((r) => r.cityName === "目黒区")!;
    // 目黒区: population_total=280200(中間), kids_ratio=10.5(最高)
    // 両方 childcare カテゴリなので ratio が高い目黒が有利
    expect(meguro).toBeDefined();
    expect(meguro.rank).toBe(1);
  });

  it("指標が欠損している都市はスキップされnotesに記録される", () => {
    const citiesWithMissing: ReadonlyArray<CityIndicators> = [
      {
        cityName: "新宿区",
        areaCode: "13104",
        indicators: [
          { indicatorId: "population_total", rawValue: 346235, dataYear: "2020", sourceId: "estat" },
          // kids_ratio が欠損
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

    const results = scoreCities(citiesWithMissing, definitions, preset);
    const shinjuku = results.find((r) => r.cityName === "新宿区")!;
    // 新宿区は kids_ratio が欠損 → notes にデータ欠損の記録がある
    expect(shinjuku.notes.length).toBeGreaterThan(0);
    expect(shinjuku.notes[0]).toContain("欠損");
  });

  it("全指標にnull値を持つ都市はstarRatingがundefinedになる", () => {
    const citiesAllNull: ReadonlyArray<CityIndicators> = [
      {
        cityName: "テスト市",
        areaCode: "99999",
        indicators: [
          { indicatorId: "population_total", rawValue: null, dataYear: "2020", sourceId: "estat" },
          { indicatorId: "kids_ratio", rawValue: null, dataYear: "2020", sourceId: "estat" },
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
    const results = scoreCities(citiesAllNull, definitions, preset);
    const testCity = results.find((r) => r.cityName === "テスト市")!;
    expect(testCity.starRating).toBeUndefined();
    expect(testCity.indicatorStars).toHaveLength(0);
  });

  it("スター評価と全国パーセンタイルが計算される", () => {
    const results = scoreCities(makeCities(), definitions, preset);
    for (const result of results) {
      expect(result.starRating).toBeDefined();
      expect(result.starRating).toBeGreaterThanOrEqual(1);
      expect(result.starRating).toBeLessThanOrEqual(5);
      expect(result.indicatorStars!.length).toBeGreaterThan(0);
      for (const is of result.indicatorStars!) {
        expect(is.stars).toBeGreaterThanOrEqual(1);
        expect(is.stars).toBeLessThanOrEqual(5);
        expect(is.nationalPercentile).toBeGreaterThanOrEqual(0);
        expect(is.nationalPercentile).toBeLessThanOrEqual(100);
      }
    }
  });

  it("dataYearが空の場合でも信頼度が計算される", () => {
    const citiesNoYear: ReadonlyArray<CityIndicators> = [
      {
        cityName: "テスト市",
        areaCode: "99999",
        indicators: [
          { indicatorId: "population_total", rawValue: 100000, dataYear: "", sourceId: "estat" },
        ],
      },
      {
        cityName: "渋谷区",
        areaCode: "13113",
        indicators: [
          { indicatorId: "population_total", rawValue: 200000, dataYear: "", sourceId: "estat" },
        ],
      },
    ];
    const results = scoreCities(citiesNoYear, definitions, preset);
    for (const r of results) {
      expect(r.confidence).toBeDefined();
      expect(["high", "medium", "low"]).toContain(r.confidence.level);
    }
  });
});
