import { describe, it, expect } from "vitest";
import { renderScoredReportHtml, ScoredReportModel } from "../../src/report/templates/compose";
import { renderCover } from "../../src/report/templates/cover";
import { renderSummary } from "../../src/report/templates/summary";
import { renderDashboard } from "../../src/report/templates/dashboard";
import { renderCityDetail } from "../../src/report/templates/city-detail";
import { renderDisclaimer } from "../../src/report/templates/disclaimer";
import { baseStyles } from "../../src/report/templates/styles";
import { CityScoreResult, IndicatorDefinition, WeightPreset } from "../../src/scoring/types";

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
});

describe("renderSummary", () => {
  it("サマリHTMLを生成する", () => {
    const html = renderSummary({ results: sampleResults, presetLabel: "子育て重視" });
    expect(html).toContain("結論サマリ");
    expect(html).toContain("新宿区");
    expect(html).toContain("渋谷区");
    expect(html).toContain("50.0");
  });
});

describe("renderDashboard", () => {
  it("ダッシュボードHTMLを生成する", () => {
    const html = renderDashboard({ results: sampleResults, definitions });
    expect(html).toContain("指標ダッシュボード");
    expect(html).toContain("総人口");
    expect(html).toContain("0-14歳比率");
  });
});

describe("renderCityDetail", () => {
  it("都市詳細HTMLを生成する", () => {
    const html = renderCityDetail({
      result: sampleResults[0],
      definition: definitions,
      rawRow: rawRows[0],
    });
    expect(html).toContain("新宿区");
    expect(html).toContain("13104");
    expect(html).toContain("50.0");
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
