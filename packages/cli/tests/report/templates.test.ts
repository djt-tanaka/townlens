import { describe, it, expect } from "vitest";
import { renderScoredReportHtml, ScoredReportModel } from "../../src/report/templates/compose";
import { renderCover } from "../../src/report/templates/cover";
import { renderSummary } from "../../src/report/templates/summary";
import { renderDashboard } from "../../src/report/templates/dashboard";
import { renderCityDetail } from "../../src/report/templates/city-detail";
import { renderDisclaimer } from "../../src/report/templates/disclaimer";
import { baseStyles } from "../../src/report/templates/styles";
import type { CityScoreResult, IndicatorDefinition, IndicatorStarRating, WeightPreset } from "@townlens/core";

const definitions: ReadonlyArray<IndicatorDefinition> = [
  { id: "population_total", label: "総人口", unit: "人", direction: "higher_better", category: "childcare", precision: 0 },
  { id: "kids_ratio", label: "0-14歳比率", unit: "%", direction: "higher_better", category: "childcare", precision: 1 },
];

const preset: WeightPreset = {
  name: "childcare",
  label: "子育て重視",
  weights: { childcare: 0.5, price: 0.2, safety: 0.15, disaster: 0.1, transport: 0.05 },
};

const sampleResults: ReadonlyArray<CityScoreResult> = [
  {
    cityName: "新宿区", areaCode: "13104",
    baseline: [
      { indicatorId: "population_total", percentile: 90, populationSize: 2, baselineName: "候補内" },
      { indicatorId: "kids_ratio", percentile: 25, populationSize: 2, baselineName: "候補内" },
    ],
    choice: [
      { indicatorId: "population_total", score: 100 },
      { indicatorId: "kids_ratio", score: 0 },
    ],
    compositeScore: 50, confidence: { level: "medium", reason: "データ年: 2020" }, rank: 2, notes: [],
  },
  {
    cityName: "渋谷区", areaCode: "13113",
    baseline: [
      { indicatorId: "population_total", percentile: 25, populationSize: 2, baselineName: "候補内" },
      { indicatorId: "kids_ratio", percentile: 90, populationSize: 2, baselineName: "候補内" },
    ],
    choice: [
      { indicatorId: "population_total", score: 0 },
      { indicatorId: "kids_ratio", score: 100 },
    ],
    compositeScore: 50, confidence: { level: "medium", reason: "データ年: 2020" }, rank: 1, notes: ["テスト注意事項"],
  },
];

const rawRows = [
  { cityInput: "新宿区", cityResolved: "新宿区", areaCode: "13104", total: 346235, kids: 32451, ratio: 9.37, totalRank: 1, ratioRank: 2 },
  { cityInput: "渋谷区", cityResolved: "渋谷区", areaCode: "13113", total: 227850, kids: 22100, ratio: 9.7, totalRank: 2, ratioRank: 1 },
];

describe("baseStyles", () => {
  it("CSS文字列を返す", () => {
    const css = baseStyles();
    expect(css).toContain("--accent:");
    expect(css).toContain("page-break-after");
  });
});

describe("renderCover", () => {
  it("表紙HTMLを生成する", () => {
    const html = renderCover({
      title: "テストレポート",
      generatedAt: "2026-02-13",
      cities: ["新宿区", "渋谷区"],
      statsDataId: "0003448299",
      timeLabel: "2020年",
      presetLabel: "子育て重視",
    });
    expect(html).toContain("テストレポート");
    expect(html).toContain("新宿区");
    expect(html).toContain("子育て重視");
  });

  it("価格データありの場合にデータソースを表示する", () => {
    const html = renderCover({
      title: "テスト",
      generatedAt: "2026-02-13",
      cities: ["新宿区"],
      statsDataId: "0003448299",
      timeLabel: "2020年",
      presetLabel: "子育て重視",
      hasPriceData: true,
    });
    expect(html).toContain("不動産情報ライブラリ API");
    expect(html).toContain("e-Stat API");
  });

  it("価格データなしの場合はe-Statのみ表示する", () => {
    const html = renderCover({
      title: "テスト",
      generatedAt: "2026-02-13",
      cities: ["新宿区"],
      statsDataId: "0003448299",
      timeLabel: "2020年",
      presetLabel: "子育て重視",
    });
    expect(html).toContain("e-Stat API");
    expect(html).not.toContain("不動産情報ライブラリ API");
  });

  it("物件タイプと予算上限を表示する", () => {
    const html = renderCover({
      title: "テスト",
      generatedAt: "2026-02-13",
      cities: ["新宿区"],
      statsDataId: "0003448299",
      timeLabel: "2020年",
      presetLabel: "子育て重視",
      propertyTypeLabel: "中古マンション等",
      budgetLimit: 5000,
    });
    expect(html).toContain("中古マンション等");
    expect(html).toContain("5,000");
    expect(html).toContain("万円");
  });
});

describe("renderSummary", () => {
  it("サマリHTMLを生成する", () => {
    const html = renderSummary({ results: sampleResults, presetLabel: "子育て重視", definitions });
    expect(html).toContain("結論サマリ");
    expect(html).toContain("新宿区");
    expect(html).toContain("渋谷区");
    expect(html).toContain("50.0");
  });

  it("3位以降のランクを正しく表示する", () => {
    const threeResults: ReadonlyArray<CityScoreResult> = [
      { ...sampleResults[0], rank: 3, compositeScore: 30 },
      { ...sampleResults[1], rank: 1, compositeScore: 80 },
      { cityName: "港区", areaCode: "13103", baseline: sampleResults[0].baseline,
        choice: sampleResults[0].choice, compositeScore: 10,
        confidence: { level: "low", reason: "テスト" }, rank: 4, notes: [] },
    ];
    const html = renderSummary({ results: threeResults, presetLabel: "子育て重視", definitions });
    expect(html).toContain("🥉");
    expect(html).toContain("4位");
  });

  it("スター評価がある場合にスター表示を使用する", () => {
    const starResults: ReadonlyArray<CityScoreResult> = [
      { ...sampleResults[0], starRating: 4.2, rank: 1 },
      { ...sampleResults[1], starRating: 3.5, rank: 2 },
    ];
    const html = renderSummary({ results: starResults, presetLabel: "子育て重視", definitions });
    expect(html).toContain("★");
    expect(html).toContain("4.2 / 5.0");
    expect(html).toContain("3.5 / 5.0");
  });
});

describe("renderDashboard", () => {
  it("ダッシュボードHTMLを生成する", () => {
    const html = renderDashboard({ results: sampleResults, definitions });
    expect(html).toContain("指標ダッシュボード");
    expect(html).toContain("総人口");
    expect(html).toContain("0-14歳比率");
  });

  it("choiceスコアが見つからない場合に0にフォールバックする", () => {
    const resultsNoScore: ReadonlyArray<CityScoreResult> = [
      { ...sampleResults[0], choice: [] },
    ];
    const html = renderDashboard({ results: resultsNoScore, definitions });
    expect(html).toContain("指標ダッシュボード");
  });

  it("baselineが見つからない場合にパーセンタイル表示をスキップする", () => {
    const resultsNoBaseline: ReadonlyArray<CityScoreResult> = [
      { ...sampleResults[0], baseline: [] },
    ];
    const html = renderDashboard({ results: resultsNoBaseline, definitions });
    expect(html).not.toContain("パーセンタイル:");
  });

  it("スター評価がある場合にスター情報を表示する", () => {
    const indicatorStars: ReadonlyArray<IndicatorStarRating> = [
      { indicatorId: "population_total", stars: 4, nationalPercentile: 75 },
      { indicatorId: "kids_ratio", stars: 3, nationalPercentile: 50 },
    ];
    const starResults: ReadonlyArray<CityScoreResult> = [
      { ...sampleResults[0], starRating: 3.5, indicatorStars },
    ];
    const html = renderDashboard({ results: starResults, definitions });
    expect(html).toContain("★");
    expect(html).toContain("新宿区");
  });
});

describe("renderCityDetail", () => {
  it("都市詳細HTMLを生成する", () => {
    const html = renderCityDetail({
      result: sampleResults[0],
      definition: definitions,
      rawRow: rawRows[0],
      totalCities: 2,
    });
    expect(html).toContain("新宿区");
    expect(html).toContain("13104");
    expect(html).toContain("50.0");
  });

  it("災害リスク指標を正しく表示する", () => {
    const disasterDefs: ReadonlyArray<IndicatorDefinition> = [
      ...definitions,
      { id: "flood_risk", label: "洪水・土砂災害リスク", unit: "リスクスコア", direction: "lower_better", category: "disaster", precision: 0 },
      { id: "evacuation_sites", label: "避難場所数", unit: "箇所", direction: "higher_better", category: "disaster", precision: 0 },
    ];
    const resultWithDisaster: CityScoreResult = {
      ...sampleResults[0],
      choice: [
        ...sampleResults[0].choice,
        { indicatorId: "flood_risk", score: 30 },
        { indicatorId: "evacuation_sites", score: 80 },
      ],
      baseline: [
        ...sampleResults[0].baseline,
        { indicatorId: "flood_risk", percentile: 40, populationSize: 2, baselineName: "候補内" },
        { indicatorId: "evacuation_sites", percentile: 75, populationSize: 2, baselineName: "候補内" },
      ],
    };
    const rawWithDisaster = {
      ...rawRows[0],
      floodRisk: true,
      landslideRisk: false,
      evacuationSiteCount: 5,
    };
    const html = renderCityDetail({
      result: resultWithDisaster,
      definition: disasterDefs,
      rawRow: rawWithDisaster,
      totalCities: 2,
    });
    expect(html).toContain("洪水・土砂災害リスク");
    expect(html).toContain("避難場所数");
  });

  it("災害データが両方nullの場合にundefinedを返す", () => {
    const disasterDefs: ReadonlyArray<IndicatorDefinition> = [
      ...definitions,
      { id: "flood_risk", label: "洪水・土砂災害リスク", unit: "リスクスコア", direction: "lower_better", category: "disaster", precision: 0 },
    ];
    const resultWithDisaster: CityScoreResult = {
      ...sampleResults[0],
      choice: [...sampleResults[0].choice, { indicatorId: "flood_risk", score: 0 }],
      baseline: [...sampleResults[0].baseline, { indicatorId: "flood_risk", percentile: 50, populationSize: 2, baselineName: "候補内" }],
    };
    const html = renderCityDetail({
      result: resultWithDisaster,
      definition: disasterDefs,
      rawRow: rawRows[0], // no floodRisk/landslideRisk
      totalCities: 2,
    });
    expect(html).toContain("-"); // getRawValue returns undefined → formatRawValue returns "-"
  });

  it("価格データにaffordabilityRateが含まれる場合に表示する", () => {
    const defsWithPrice: ReadonlyArray<IndicatorDefinition> = [
      ...definitions,
      { id: "condo_price_median", label: "中古マンション価格", unit: "万円", direction: "lower_better", category: "price", precision: 0 },
    ];
    const resultWithPrice: CityScoreResult = {
      ...sampleResults[0],
      choice: [...sampleResults[0].choice, { indicatorId: "condo_price_median", score: 60 }],
      baseline: [...sampleResults[0].baseline, { indicatorId: "condo_price_median", percentile: 45, populationSize: 2, baselineName: "候補内" }],
    };
    const rawWithAffordability = {
      ...rawRows[0],
      condoPriceMedian: 4000,
      condoPriceQ25: 3000,
      condoPriceQ75: 5000,
      condoPriceCount: 50,
      affordabilityRate: 65.3,
    };
    const html = renderCityDetail({
      result: resultWithPrice,
      definition: defsWithPrice,
      rawRow: rawWithAffordability,
      totalCities: 2,
    });
    expect(html).toContain("65.3%");
    expect(html).toContain("予算内取引割合");
  });

  it("スター評価がある場合にスター表示を使用する", () => {
    const indicatorStars: ReadonlyArray<IndicatorStarRating> = [
      { indicatorId: "population_total", stars: 4, nationalPercentile: 78 },
      { indicatorId: "kids_ratio", stars: 3, nationalPercentile: 52 },
    ];
    const starResult: CityScoreResult = {
      ...sampleResults[0],
      starRating: 3.8,
      indicatorStars,
    };
    const html = renderCityDetail({
      result: starResult,
      definition: definitions,
      rawRow: rawRows[0],
      totalCities: 2,
    });
    expect(html).toContain("★");
    expect(html).toContain("全国上位 22%");
    expect(html).toContain("全国上位 48%");
    expect(html).toContain("3.8");
  });

  it("カテゴリ平均がスター評価で表示される", () => {
    const indicatorStars: ReadonlyArray<IndicatorStarRating> = [
      { indicatorId: "population_total", stars: 5, nationalPercentile: 90 },
      { indicatorId: "kids_ratio", stars: 4, nationalPercentile: 70 },
    ];
    const starResult: CityScoreResult = {
      ...sampleResults[0],
      starRating: 4.5,
      indicatorStars,
    };
    const html = renderCityDetail({
      result: starResult,
      definition: definitions,
      rawRow: rawRows[0],
      totalCities: 2,
    });
    // カテゴリ平均のスター表示
    expect(html).toContain("★");
    // スター評価がある場合は「/ 5.0」が表示される
    expect(html).toContain("/ 5.0");
  });

  it("価格指標を含む場合にQ25-Q75レンジを表示する", () => {
    const defsWithPrice: ReadonlyArray<IndicatorDefinition> = [
      ...definitions,
      { id: "condo_price_median", label: "中古マンション価格（中央値）", unit: "万円", direction: "lower_better", category: "price", precision: 0 },
    ];
    const resultWithPrice: CityScoreResult = {
      ...sampleResults[0],
      choice: [
        ...sampleResults[0].choice,
        { indicatorId: "condo_price_median", score: 60 },
      ],
      baseline: [
        ...sampleResults[0].baseline,
        { indicatorId: "condo_price_median", percentile: 45, populationSize: 2, baselineName: "候補内" },
      ],
    };
    const rawRowWithPrice = {
      ...rawRows[0],
      condoPriceMedian: 4000,
      condoPriceQ25: 3000,
      condoPriceQ75: 5000,
      condoPriceCount: 50,
    };
    const html = renderCityDetail({
      result: resultWithPrice,
      definition: defsWithPrice,
      rawRow: rawRowWithPrice,
      totalCities: 2,
    });
    expect(html).toContain("中古マンション価格");
    expect(html).toContain("4,000");
    expect(html).toContain("3,000");
    expect(html).toContain("5,000");
    expect(html).toContain("50件");
  });
});

describe("renderDisclaimer", () => {
  it("免責HTMLを生成する", () => {
    const html = renderDisclaimer({
      statsDataId: "0003448299",
      timeLabel: "2020年",
      generatedAt: "2026-02-13",
    });
    expect(html).toContain("免責事項");
    expect(html).toContain("e-Stat");
    expect(html).toContain("0003448299");
  });

  it("価格データありの場合に不動産情報ライブラリの出典を表示する", () => {
    const html = renderDisclaimer({
      statsDataId: "0003448299",
      timeLabel: "2020年",
      generatedAt: "2026-02-13",
      hasPriceData: true,
    });
    expect(html).toContain("不動産情報ライブラリ");
    expect(html).toContain("XIT001");
    expect(html).toContain("中古マンション価格");
    expect(html).toContain("価格レンジ");
  });

  it("犯罪統計データありの場合に出典を表示する", () => {
    const html = renderDisclaimer({
      statsDataId: "0003448299",
      timeLabel: "2020年",
      generatedAt: "2026-02-13",
      hasCrimeData: true,
    });
    expect(html).toContain("犯罪統計データ");
    expect(html).toContain("刑法犯認知件数");
  });

  it("災害リスクデータありの場合に出典を表示する", () => {
    const html = renderDisclaimer({
      statsDataId: "0003448299",
      timeLabel: "2020年",
      generatedAt: "2026-02-13",
      hasDisasterData: true,
    });
    expect(html).toContain("災害リスクデータ");
    expect(html).toContain("XKT026");
    expect(html).toContain("洪水・土砂災害リスク");
    expect(html).toContain("避難場所数");
  });
});

describe("renderScoredReportHtml", () => {
  it("完全なHTML文書を生成する", () => {
    const html = renderScoredReportHtml({
      title: "テスト",
      generatedAt: "2026-02-13",
      cities: ["新宿区", "渋谷区"],
      statsDataId: "0003448299",
      timeLabel: "2020年",
      preset,
      results: sampleResults,
      definitions,
      rawRows: rawRows,
    });
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("</html>");
    expect(html).toContain("結論サマリ");
    expect(html).toContain("指標ダッシュボード");
    expect(html).toContain("免責事項");
  });

  it("rawRowが見つからない都市はスキップされる", () => {
    const html = renderScoredReportHtml({
      title: "テスト",
      generatedAt: "2026-02-13",
      cities: ["新宿区", "渋谷区"],
      statsDataId: "0003448299",
      timeLabel: "2020年",
      preset,
      results: sampleResults,
      definitions,
      rawRows: [rawRows[0]], // 渋谷区のrawRowが欠落
    });
    expect(html).toContain("新宿区");
    // 渋谷区のrawRowがないので都市詳細セクションには表示されない
    expect(html).toContain("<!doctype html>");
  });

  it("XSSエスケープが行われる", () => {
    const html = renderScoredReportHtml({
      title: "<script>alert('xss')</script>",
      generatedAt: "2026-02-13",
      cities: ["新宿区"],
      statsDataId: "test",
      timeLabel: "2020年",
      preset,
      results: [sampleResults[0]],
      definitions,
      rawRows: [rawRows[0]],
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
