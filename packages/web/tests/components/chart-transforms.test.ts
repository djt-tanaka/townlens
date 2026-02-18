import { describe, it, expect } from "vitest";
import { transformToRadarData } from "@/components/report/radar-chart";
import { transformToBarData } from "@/components/report/bar-chart";
import type { CityScoreResult, IndicatorDefinition } from "@townlens/core";

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
    label: "年少人口割合",
    unit: "%",
    direction: "higher_better",
    category: "childcare",
    precision: 1,
  },
  {
    id: "land_price",
    label: "地価",
    unit: "円/㎡",
    direction: "lower_better",
    category: "price",
    precision: 0,
  },
];

/** テスト用のスコア結果 */
const results: ReadonlyArray<CityScoreResult> = [
  {
    cityName: "世田谷区",
    areaCode: "13112",
    baseline: [],
    choice: [
      { indicatorId: "population_total", score: 85 },
      { indicatorId: "kids_ratio", score: 60 },
      { indicatorId: "land_price", score: 30 },
    ],
    compositeScore: 72.5,
    confidence: { level: "high", reason: "" },
    rank: 1,
    notes: [],
  },
  {
    cityName: "渋谷区",
    areaCode: "13113",
    baseline: [],
    choice: [
      { indicatorId: "population_total", score: 45 },
      { indicatorId: "kids_ratio", score: 40 },
      { indicatorId: "land_price", score: 70 },
    ],
    compositeScore: 55.0,
    confidence: { level: "medium", reason: "" },
    rank: 2,
    notes: [],
  },
];

describe("transformToRadarData", () => {
  it("指標ごとに都市のスコアをマッピングする", () => {
    const data = transformToRadarData(results, definitions);

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({
      indicator: "総人口",
      世田谷区: 85,
      渋谷区: 45,
    });
    expect(data[1]).toEqual({
      indicator: "年少人口割合",
      世田谷区: 60,
      渋谷区: 40,
    });
  });

  it("空の結果配列でも指標名のみのデータを返す", () => {
    const data = transformToRadarData([], definitions);

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({ indicator: "総人口" });
  });

  it("スコアが見つからない場合は 0 を設定する", () => {
    const partialResult: ReadonlyArray<CityScoreResult> = [
      {
        cityName: "テスト区",
        areaCode: "99999",
        baseline: [],
        choice: [{ indicatorId: "population_total", score: 50 }],
        compositeScore: 50,
        confidence: { level: "low", reason: "" },
        rank: 1,
        notes: [],
      },
    ];
    const data = transformToRadarData(partialResult, definitions);

    expect(data[0]).toEqual({ indicator: "総人口", テスト区: 50 });
    expect(data[1]).toEqual({ indicator: "年少人口割合", テスト区: 0 });
  });

  it("空の定義配列では空配列を返す", () => {
    const data = transformToRadarData(results, []);
    expect(data).toHaveLength(0);
  });
});

describe("transformToBarData", () => {
  it("指標ごとに都市のスコアをマッピングする", () => {
    const data = transformToBarData(results, definitions);

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({
      indicator: "総人口",
      世田谷区: 85,
      渋谷区: 45,
    });
  });

  it("空の結果配列でも指標名のみのデータを返す", () => {
    const data = transformToBarData([], definitions);

    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({ indicator: "総人口" });
  });

  it("RadarData と同じ変換結果を返す", () => {
    const radarData = transformToRadarData(results, definitions);
    const barData = transformToBarData(results, definitions);

    expect(radarData).toEqual(barData);
  });
});
