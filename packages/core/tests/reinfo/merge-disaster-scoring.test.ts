import { describe, it, expect } from "vitest";
import { mergeDisasterIntoScoringInput } from "../../src/reinfo/merge-disaster-scoring";
import { CityIndicators } from "../../src/scoring/types";
import { CityDisasterData } from "../../src/reinfo/disaster-data";

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

describe("mergeDisasterIntoScoringInput", () => {
  it("災害データを都市の指標に追加する（2指標: flood_risk + evacuation_sites）", () => {
    const disasterData = new Map<string, CityDisasterData>([
      ["13104", { floodRisk: true, landslideRisk: false, riskScore: 1, evacuationSiteCount: 5 }],
      ["13113", { floodRisk: false, landslideRisk: false, riskScore: 0, evacuationSiteCount: 8 }],
    ]);

    const result = mergeDisasterIntoScoringInput(baseCities, disasterData);

    expect(result).toHaveLength(2);
    const shinjuku = result.find((c) => c.areaCode === "13104")!;
    expect(shinjuku.indicators).toHaveLength(3);

    const floodIndicator = shinjuku.indicators.find((i) => i.indicatorId === "flood_risk")!;
    expect(floodIndicator.rawValue).toBe(1);
    expect(floodIndicator.sourceId).toBe("reinfolib");

    const evacuationIndicator = shinjuku.indicators.find((i) => i.indicatorId === "evacuation_sites")!;
    expect(evacuationIndicator.rawValue).toBe(5);
  });

  it("災害データがない都市はnull値で追加する", () => {
    const disasterData = new Map<string, CityDisasterData>([
      ["13104", { floodRisk: true, landslideRisk: true, riskScore: 2, evacuationSiteCount: 3 }],
    ]);

    const result = mergeDisasterIntoScoringInput(baseCities, disasterData);

    const shibuya = result.find((c) => c.areaCode === "13113")!;
    const floodIndicator = shibuya.indicators.find((i) => i.indicatorId === "flood_risk")!;
    expect(floodIndicator.rawValue).toBeNull();
    const evacuationIndicator = shibuya.indicators.find((i) => i.indicatorId === "evacuation_sites")!;
    expect(evacuationIndicator.rawValue).toBeNull();
  });

  it("元のCityIndicatorsを変更しない（不変性）", () => {
    const disasterData = new Map<string, CityDisasterData>([
      ["13104", { floodRisk: false, landslideRisk: false, riskScore: 0, evacuationSiteCount: 5 }],
    ]);

    const result = mergeDisasterIntoScoringInput(baseCities, disasterData);

    expect(baseCities[0].indicators).toHaveLength(1);
    expect(result[0].indicators).toHaveLength(3);
    expect(result[0]).not.toBe(baseCities[0]);
  });

  it("空の都市配列で空配列を返す", () => {
    const result = mergeDisasterIntoScoringInput([], new Map());
    expect(result).toEqual([]);
  });
});
