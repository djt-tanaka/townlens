import { describe, it, expect } from "vitest";
import { mergeCrimeIntoScoringInput } from "../../src/estat/merge-crime-scoring";
import { CityIndicators } from "../../src/scoring/types";
import { CrimeStats } from "../../src/estat/crime-data";

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

describe("mergeCrimeIntoScoringInput", () => {
  it("犯罪統計データを都市の指標に追加する", () => {
    const crimeData = new Map<string, CrimeStats>([
      ["13104", { crimeRate: 12.5, dataYear: "2022" }],
      ["13113", { crimeRate: 8.3, dataYear: "2022" }],
    ]);

    const result = mergeCrimeIntoScoringInput(baseCities, crimeData);

    expect(result).toHaveLength(2);
    const shinjuku = result.find((c) => c.areaCode === "13104")!;
    expect(shinjuku.indicators).toHaveLength(3);
    const crimeIndicator = shinjuku.indicators.find((i) => i.indicatorId === "crime_rate")!;
    expect(crimeIndicator.rawValue).toBe(12.5);
    expect(crimeIndicator.sourceId).toBe("estat");
    expect(crimeIndicator.dataYear).toBe("2022");
  });

  it("犯罪データがない都市はnull値で追加する", () => {
    const crimeData = new Map<string, CrimeStats>([
      ["13104", { crimeRate: 12.5, dataYear: "2022" }],
    ]);

    const result = mergeCrimeIntoScoringInput(baseCities, crimeData);

    const shibuya = result.find((c) => c.areaCode === "13113")!;
    const crimeIndicator = shibuya.indicators.find((i) => i.indicatorId === "crime_rate")!;
    expect(crimeIndicator.rawValue).toBeNull();
    expect(crimeIndicator.dataYear).toBe("");
  });

  it("元のCityIndicatorsを変更しない（不変性）", () => {
    const crimeData = new Map<string, CrimeStats>([
      ["13104", { crimeRate: 12.5, dataYear: "2022" }],
    ]);

    const result = mergeCrimeIntoScoringInput(baseCities, crimeData);

    expect(baseCities[0].indicators).toHaveLength(2);
    expect(result[0].indicators).toHaveLength(3);
    expect(result[0]).not.toBe(baseCities[0]);
  });

  it("空のcrimeDataでも全都市にnull指標を追加する", () => {
    const crimeData = new Map<string, CrimeStats>();

    const result = mergeCrimeIntoScoringInput(baseCities, crimeData);

    for (const city of result) {
      expect(city.indicators).toHaveLength(3);
      const crimeIndicator = city.indicators.find((i) => i.indicatorId === "crime_rate")!;
      expect(crimeIndicator.rawValue).toBeNull();
    }
  });

  it("空の都市配列で空配列を返す", () => {
    const result = mergeCrimeIntoScoringInput([], new Map());
    expect(result).toEqual([]);
  });
});
