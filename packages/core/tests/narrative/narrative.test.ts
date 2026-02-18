import { describe, it, expect } from "vitest";
import {
  generateCityNarrative,
  generateComparisonNarrative,
} from "../../src/narrative";
import {
  CityScoreResult,
  IndicatorDefinition,
} from "../../src/scoring/types";

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
  {
    id: "condo_price_median",
    label: "中古マンション価格（中央値）",
    unit: "万円",
    direction: "lower_better",
    category: "price",
    precision: 0,
  },
];

function makeResult(
  overrides: Partial<CityScoreResult> & { cityName: string }
): CityScoreResult {
  return {
    areaCode: "13000",
    baseline: [],
    choice: [],
    compositeScore: 50,
    confidence: { level: "high", reason: "テスト" },
    rank: 1,
    notes: [],
    ...overrides,
  };
}

describe("generateCityNarrative", () => {
  it("1位の都市のナラティブを生成する", () => {
    const result = makeResult({
      cityName: "世田谷区",
      compositeScore: 78.5,
      rank: 1,
      choice: [
        { indicatorId: "population_total", score: 85 },
        { indicatorId: "kids_ratio", score: 75 },
        { indicatorId: "condo_price_median", score: 20 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 3);
    expect(text).toContain("最も高い評価");
    expect(text).toContain("総人口");
    expect(text).toContain("0-14歳比率");
    expect(text).toContain("強み");
    expect(text).toContain("中古マンション価格");
    expect(text).toContain("課題");
  });

  it("最下位の都市のナラティブを生成する", () => {
    const result = makeResult({
      cityName: "中野区",
      compositeScore: 35.2,
      rank: 3,
      choice: [
        { indicatorId: "population_total", score: 15 },
        { indicatorId: "kids_ratio", score: 25 },
        { indicatorId: "condo_price_median", score: 80 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 3);
    expect(text).toContain("最も低い評価");
    expect(text).toContain("中古マンション価格");
    expect(text).toContain("強み");
    expect(text).toContain("総人口");
    expect(text).toContain("課題");
  });

  it("中間順位の都市のナラティブを生成する", () => {
    const result = makeResult({
      cityName: "渋谷区",
      compositeScore: 55.0,
      rank: 2,
      choice: [
        { indicatorId: "population_total", score: 50 },
        { indicatorId: "kids_ratio", score: 90 },
        { indicatorId: "condo_price_median", score: 40 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 3);
    expect(text).toContain("2位");
    expect(text).toContain("0-14歳比率");
    expect(text).toContain("強み");
  });

  it("単独都市の場合のナラティブを生成する", () => {
    const result = makeResult({
      cityName: "世田谷区",
      compositeScore: 60.0,
      rank: 1,
      choice: [
        { indicatorId: "population_total", score: 80 },
        { indicatorId: "kids_ratio", score: 50 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 1);
    expect(text).toContain("世田谷区の総合スコアは60.0点です。");
    expect(text).not.toContain("候補");
  });

  it("全指標が中立の場合", () => {
    const result = makeResult({
      cityName: "新宿区",
      compositeScore: 50.0,
      rank: 1,
      choice: [
        { indicatorId: "population_total", score: 50 },
        { indicatorId: "kids_ratio", score: 55 },
        { indicatorId: "condo_price_median", score: 45 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 2);
    expect(text).toContain("平均的な水準");
    expect(text).not.toContain("強み");
    expect(text).not.toContain("課題");
  });

  it("信頼度Lowの場合に注記を含む", () => {
    const result = makeResult({
      cityName: "練馬区",
      compositeScore: 45.0,
      rank: 2,
      confidence: { level: "low", reason: "データが古い" },
      choice: [
        { indicatorId: "population_total", score: 50 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 2);
    expect(text).toContain("参考値としてご確認ください");
    expect(text).toContain("欠損");
  });

  it("欠損指標がある場合に注記を含む（信頼度High）", () => {
    const result = makeResult({
      cityName: "板橋区",
      compositeScore: 55.0,
      rank: 1,
      confidence: { level: "high", reason: "良好" },
      choice: [
        { indicatorId: "population_total", score: 60 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 2);
    // definitions は3つだが choice は1つなので欠損2件
    expect(text).toContain("2件の指標データが欠損");
  });
});

describe("generateComparisonNarrative", () => {
  it("僅差の場合のナラティブを生成する", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        compositeScore: 52.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 80 },
          { indicatorId: "kids_ratio", score: 30 },
        ],
      }),
      makeResult({
        cityName: "渋谷区",
        compositeScore: 48.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 30 },
          { indicatorId: "kids_ratio", score: 80 },
        ],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions);
    expect(text).toContain("僅差");
    expect(text).toContain("世田谷区");
    expect(text).toContain("渋谷区");
  });

  it("大差の場合のナラティブを生成する", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        compositeScore: 85.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 100 },
          { indicatorId: "kids_ratio", score: 90 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        compositeScore: 30.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 10 },
          { indicatorId: "kids_ratio", score: 20 },
        ],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions);
    expect(text).toContain("大きな差");
    expect(text).toContain("85.0");
    expect(text).toContain("30.0");
  });

  it("全都市同スコアの場合", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        compositeScore: 50.0,
        rank: 1,
        choice: [{ indicatorId: "population_total", score: 50 }],
      }),
      makeResult({
        cityName: "渋谷区",
        compositeScore: 50.0,
        rank: 1,
        choice: [{ indicatorId: "population_total", score: 50 }],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions);
    expect(text).toContain("同等の評価");
  });

  it("1都市のみの場合は単独評価文を返す", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        compositeScore: 60.0,
        rank: 1,
        choice: [{ indicatorId: "population_total", score: 80 }],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions);
    expect(text).toContain("単独評価");
    expect(text).not.toContain("優位");
  });

  it("トレードオフがある場合の比較文を生成する", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        compositeScore: 65.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 90 },
          { indicatorId: "kids_ratio", score: 80 },
          { indicatorId: "condo_price_median", score: 30 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        compositeScore: 55.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 40 },
          { indicatorId: "kids_ratio", score: 50 },
          { indicatorId: "condo_price_median", score: 90 },
        ],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions);
    expect(text).toContain("世田谷区は総人口・0-14歳比率で優位");
    expect(text).toContain("中野区は中古マンション価格（中央値）で優位");
    expect(text).toContain("優先する観点によって選択が分かれます");
  });

  it("全指標で同一都市がリードしている場合", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        compositeScore: 80.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 90 },
          { indicatorId: "kids_ratio", score: 85 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        compositeScore: 30.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 10 },
          { indicatorId: "kids_ratio", score: 15 },
        ],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions);
    expect(text).toContain("世田谷区は全ての指標で候補内最高値を記録しています");
  });
});
