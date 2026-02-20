import { describe, it, expect } from "vitest";
import {
  generateCityNarrative,
  generateComparisonNarrative,
} from "../../src/narrative";
import {
  CityScoreResult,
  IndicatorDefinition,
  WeightPreset,
} from "../../src/scoring/types";
import { ReportRow } from "../../src/types";

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
  overrides: Partial<CityScoreResult> & { cityName: string },
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

function makeRawRow(
  overrides: Partial<ReportRow> & { cityResolved: string; areaCode: string },
): ReportRow {
  return {
    cityInput: overrides.cityResolved,
    cityResolved: overrides.cityResolved,
    areaCode: overrides.areaCode,
    total: 0,
    kids: 0,
    ratio: 0,
    totalRank: 1,
    ratioRank: 1,
    ...overrides,
  };
}

const childcarePreset: WeightPreset = {
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

const pricePreset: WeightPreset = {
  name: "price",
  label: "価格重視",
  weights: {
    childcare: 0.1,
    price: 0.5,
    safety: 0.1,
    disaster: 0.1,
    transport: 0.1,
    education: 0.1,
  },
};

// ─── 後方互換テスト（options なし） ───

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
      choice: [{ indicatorId: "population_total", score: 50 }],
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
      choice: [{ indicatorId: "population_total", score: 60 }],
    });
    const text = generateCityNarrative(result, definitions, 2);
    // definitions は3つだが choice は1つなので欠損2件
    expect(text).toContain("2件の指標データが欠損");
  });
});

// ─── 実値付きナラティブテスト ───

describe("generateCityNarrative with rawRows", () => {
  it("強み・弱みに実値を付記する", () => {
    const result = makeResult({
      cityName: "世田谷区",
      areaCode: "13112",
      compositeScore: 78.5,
      rank: 1,
      choice: [
        { indicatorId: "population_total", score: 85 },
        { indicatorId: "kids_ratio", score: 75 },
        { indicatorId: "condo_price_median", score: 20 },
      ],
    });
    const rawRows: ReportRow[] = [
      makeRawRow({
        cityResolved: "世田谷区",
        areaCode: "13112",
        total: 939099,
        ratio: 11.5,
        condoPriceMedian: 4800,
      }),
    ];
    const text = generateCityNarrative(result, definitions, 3, { rawRows });
    expect(text).toContain("939,099人");
    expect(text).toContain("11.5%");
    expect(text).toContain("4,800万円");
    expect(text).toContain("強み");
    expect(text).toContain("課題");
  });

  it("rawRow が見つからない場合はラベルのみ（従来と同じ）", () => {
    const result = makeResult({
      cityName: "世田谷区",
      areaCode: "13112",
      compositeScore: 78.5,
      rank: 1,
      choice: [
        { indicatorId: "population_total", score: 85 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 3, {
      rawRows: [],
    });
    expect(text).toContain("総人口が強み");
    expect(text).not.toContain("人）");
  });
});

// ─── プリセット連動テスト ───

describe("generateCityNarrative with preset", () => {
  it("最重要カテゴリが強みの場合にプリセットコメントを生成する", () => {
    const result = makeResult({
      cityName: "世田谷区",
      areaCode: "13112",
      compositeScore: 78.5,
      rank: 1,
      choice: [
        { indicatorId: "population_total", score: 85 },
        { indicatorId: "kids_ratio", score: 75 },
        { indicatorId: "condo_price_median", score: 20 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 3, {
      preset: childcarePreset,
    });
    expect(text).toContain("子育て重視");
    expect(text).toContain("子育て");
    expect(text).toContain("押し上げ");
  });

  it("最重要カテゴリが弱みの場合にプリセットコメントを生成する", () => {
    const result = makeResult({
      cityName: "中野区",
      areaCode: "13114",
      compositeScore: 35.2,
      rank: 2,
      choice: [
        { indicatorId: "population_total", score: 15 },
        { indicatorId: "kids_ratio", score: 25 },
        { indicatorId: "condo_price_median", score: 80 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 3, {
      preset: childcarePreset,
    });
    expect(text).toContain("子育て重視");
    expect(text).toContain("下げる要因");
  });

  it("最重要カテゴリが中立の場合はプリセットコメントなし", () => {
    const result = makeResult({
      cityName: "渋谷区",
      areaCode: "13113",
      compositeScore: 55.0,
      rank: 2,
      choice: [
        { indicatorId: "population_total", score: 50 },
        { indicatorId: "kids_ratio", score: 55 },
        { indicatorId: "condo_price_median", score: 40 },
      ],
    });
    const text = generateCityNarrative(result, definitions, 3, {
      preset: childcarePreset,
    });
    expect(text).not.toContain("子育て重視");
  });
});

// ─── 比較ナラティブ後方互換テスト ───

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
    expect(text).toContain(
      "世田谷区は全ての指標で候補内最高値を記録しています",
    );
  });
});

// ─── 比較ナラティブ実値付きテスト ───

describe("generateComparisonNarrative with rawRows", () => {
  it("トレードオフに実値比較を含める", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        areaCode: "13112",
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
        areaCode: "13114",
        compositeScore: 55.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 40 },
          { indicatorId: "kids_ratio", score: 50 },
          { indicatorId: "condo_price_median", score: 90 },
        ],
      }),
    ];
    const rawRows: ReportRow[] = [
      makeRawRow({
        cityResolved: "世田谷区",
        areaCode: "13112",
        total: 939099,
        ratio: 11.5,
        condoPriceMedian: 4800,
      }),
      makeRawRow({
        cityResolved: "中野区",
        areaCode: "13114",
        total: 344880,
        ratio: 9.1,
        condoPriceMedian: 2600,
      }),
    ];
    const text = generateComparisonNarrative(results, definitions, {
      rawRows,
    });
    // 実値が含まれること
    expect(text).toContain("939,099人");
    expect(text).toContain("344,880人");
    expect(text).toContain("4,800万円");
    expect(text).toContain("2,600万円");
    expect(text).toContain("vs");
    expect(text).toContain("優先する観点によって選択が分かれます");
  });
});

describe("generateComparisonNarrative with rawRows - edge cases", () => {
  it("3都市以上の場合に都市名付き実値比較を含める", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        areaCode: "13112",
        compositeScore: 75.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 90 },
          { indicatorId: "condo_price_median", score: 30 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        areaCode: "13114",
        compositeScore: 55.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 50 },
          { indicatorId: "condo_price_median", score: 90 },
        ],
      }),
      makeResult({
        cityName: "渋谷区",
        areaCode: "13113",
        compositeScore: 45.0,
        rank: 3,
        choice: [
          { indicatorId: "population_total", score: 40 },
          { indicatorId: "condo_price_median", score: 50 },
        ],
      }),
    ];
    const rawRows: ReportRow[] = [
      makeRawRow({
        cityResolved: "世田谷区",
        areaCode: "13112",
        total: 939099,
        condoPriceMedian: 4800,
      }),
      makeRawRow({
        cityResolved: "中野区",
        areaCode: "13114",
        total: 344880,
        condoPriceMedian: 2600,
      }),
      makeRawRow({
        cityResolved: "渋谷区",
        areaCode: "13113",
        total: 243000,
        condoPriceMedian: 3200,
      }),
    ];
    const text = generateComparisonNarrative(results, definitions, {
      rawRows,
    });
    // 3都市なので都市名付き比較
    expect(text).toContain("vs");
    expect(text).toContain("優位");
  });

  it("rawRow が見つからない指標はラベルのみ表示", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        areaCode: "13112",
        compositeScore: 65.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 90 },
          { indicatorId: "condo_price_median", score: 30 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        areaCode: "13114",
        compositeScore: 55.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 40 },
          { indicatorId: "condo_price_median", score: 90 },
        ],
      }),
    ];
    // rawRows はあるが世田谷区の condoPriceMedian が null
    const rawRows: ReportRow[] = [
      makeRawRow({
        cityResolved: "世田谷区",
        areaCode: "13112",
        total: 939099,
        condoPriceMedian: null,
      }),
      makeRawRow({
        cityResolved: "中野区",
        areaCode: "13114",
        total: 344880,
        condoPriceMedian: 2600,
      }),
    ];
    const text = generateComparisonNarrative(results, definitions, {
      rawRows,
    });
    // 世田谷区の人口は実値あり
    expect(text).toContain("939,099人");
    // 中野区のマンション価格は実値あるが比較対象のリーダー値がnullなのでフォールバック
    expect(text).toContain("優位");
  });
});

// ─── 比較ナラティブプリセット連動テスト ───

describe("generateComparisonNarrative with preset", () => {
  it("プリセットの重みが比較結果に影響する説明を含む", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        areaCode: "13112",
        compositeScore: 75.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 90 },
          { indicatorId: "kids_ratio", score: 85 },
          { indicatorId: "condo_price_median", score: 20 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        areaCode: "13114",
        compositeScore: 45.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 20 },
          { indicatorId: "kids_ratio", score: 25 },
          { indicatorId: "condo_price_median", score: 90 },
        ],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions, {
      preset: childcarePreset,
    });
    expect(text).toContain("子育て重視");
    expect(text).toContain("子育てカテゴリ");
    expect(text).toContain("重み");
  });

  it("1位が最重要カテゴリで負けている場合のプリセットコメント", () => {
    // 価格重視プリセットで、1位は価格カテゴリで負けているが他で補って1位
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        areaCode: "13112",
        compositeScore: 60.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 90 },
          { indicatorId: "kids_ratio", score: 85 },
          { indicatorId: "condo_price_median", score: 10 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        areaCode: "13114",
        compositeScore: 40.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 10 },
          { indicatorId: "kids_ratio", score: 15 },
          { indicatorId: "condo_price_median", score: 90 },
        ],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions, {
      preset: pricePreset,
    });
    expect(text).toContain("価格重視");
    expect(text).toContain("他の分野で補って");
  });

  it("プリセットコメントが不要な場合は含まれない", () => {
    const results: ReadonlyArray<CityScoreResult> = [
      makeResult({
        cityName: "世田谷区",
        compositeScore: 55.0,
        rank: 1,
        choice: [
          { indicatorId: "population_total", score: 55 },
          { indicatorId: "kids_ratio", score: 50 },
          { indicatorId: "condo_price_median", score: 45 },
        ],
      }),
      makeResult({
        cityName: "中野区",
        compositeScore: 45.0,
        rank: 2,
        choice: [
          { indicatorId: "population_total", score: 45 },
          { indicatorId: "kids_ratio", score: 50 },
          { indicatorId: "condo_price_median", score: 55 },
        ],
      }),
    ];
    const text = generateComparisonNarrative(results, definitions, {
      preset: childcarePreset,
    });
    // カテゴリ平均が中立帯なのでプリセットコメントは出ない
    expect(text).not.toContain("子育て重視");
  });
});
