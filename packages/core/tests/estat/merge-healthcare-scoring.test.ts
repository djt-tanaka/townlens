import { describe, it, expect } from "vitest";
import { mergeHealthcareIntoScoringInput } from "../../src/estat/merge-healthcare-scoring";
import { CityIndicators } from "../../src/scoring/types";
import { HealthcareStats } from "../../src/estat/healthcare-data";

const baseCities: ReadonlyArray<CityIndicators> = [
  {
    cityName: "世田谷区",
    areaCode: "13112",
    indicators: [
      { indicatorId: "population_total", rawValue: 900000, dataYear: "2020", sourceId: "estat" },
      { indicatorId: "kids_ratio", rawValue: 11.5, dataYear: "2020", sourceId: "estat" },
    ],
  },
  {
    cityName: "渋谷区",
    areaCode: "13113",
    indicators: [
      { indicatorId: "population_total", rawValue: 230000, dataYear: "2020", sourceId: "estat" },
      { indicatorId: "kids_ratio", rawValue: 9.7, dataYear: "2020", sourceId: "estat" },
    ],
  },
];

describe("mergeHealthcareIntoScoringInput", () => {
  it("医療統計データを都市の指標に追加する", () => {
    const healthcareData = new Map<string, HealthcareStats>([
      ["13112", { hospitalsPerCapita: 5.0, clinicsPerCapita: 80.0, pediatricsPerCapita: 10.0, dataYear: "2022" }],
      ["13113", { hospitalsPerCapita: 5.22, clinicsPerCapita: 78.26, pediatricsPerCapita: 10.87, dataYear: "2022" }],
    ]);

    const result = mergeHealthcareIntoScoringInput(baseCities, healthcareData);

    expect(result).toHaveLength(2);
    const setagaya = result.find((c) => c.areaCode === "13112")!;
    expect(setagaya.indicators).toHaveLength(5);

    const hospitals = setagaya.indicators.find((i) => i.indicatorId === "hospitals_per_capita")!;
    expect(hospitals.rawValue).toBe(5.0);
    expect(hospitals.sourceId).toBe("estat");
    expect(hospitals.dataYear).toBe("2022");

    const clinics = setagaya.indicators.find((i) => i.indicatorId === "clinics_per_capita")!;
    expect(clinics.rawValue).toBe(80.0);

    const pediatrics = setagaya.indicators.find((i) => i.indicatorId === "pediatrics_per_capita")!;
    expect(pediatrics.rawValue).toBe(10.0);
  });

  it("医療データがない都市はnull値で追加する", () => {
    const healthcareData = new Map<string, HealthcareStats>([
      ["13112", { hospitalsPerCapita: 5.0, clinicsPerCapita: 80.0, pediatricsPerCapita: 10.0, dataYear: "2022" }],
    ]);

    const result = mergeHealthcareIntoScoringInput(baseCities, healthcareData);

    const shibuya = result.find((c) => c.areaCode === "13113")!;
    const hospitals = shibuya.indicators.find((i) => i.indicatorId === "hospitals_per_capita")!;
    expect(hospitals.rawValue).toBeNull();
    expect(hospitals.dataYear).toBe("");

    const clinics = shibuya.indicators.find((i) => i.indicatorId === "clinics_per_capita")!;
    expect(clinics.rawValue).toBeNull();

    const pediatrics = shibuya.indicators.find((i) => i.indicatorId === "pediatrics_per_capita")!;
    expect(pediatrics.rawValue).toBeNull();
  });

  it("元のCityIndicatorsを変更しない（不変性）", () => {
    const healthcareData = new Map<string, HealthcareStats>([
      ["13112", { hospitalsPerCapita: 5.0, clinicsPerCapita: 80.0, pediatricsPerCapita: 10.0, dataYear: "2022" }],
    ]);

    const result = mergeHealthcareIntoScoringInput(baseCities, healthcareData);

    expect(baseCities[0].indicators).toHaveLength(2);
    expect(result[0].indicators).toHaveLength(5);
    expect(result[0]).not.toBe(baseCities[0]);
  });

  it("空のhealthcareDataでも全都市にnull指標を追加する", () => {
    const healthcareData = new Map<string, HealthcareStats>();

    const result = mergeHealthcareIntoScoringInput(baseCities, healthcareData);

    for (const city of result) {
      expect(city.indicators).toHaveLength(5);
      const hospitals = city.indicators.find((i) => i.indicatorId === "hospitals_per_capita")!;
      expect(hospitals.rawValue).toBeNull();
      const clinics = city.indicators.find((i) => i.indicatorId === "clinics_per_capita")!;
      expect(clinics.rawValue).toBeNull();
      const pediatrics = city.indicators.find((i) => i.indicatorId === "pediatrics_per_capita")!;
      expect(pediatrics.rawValue).toBeNull();
    }
  });

  it("空の都市配列で空配列を返す", () => {
    const result = mergeHealthcareIntoScoringInput([], new Map());
    expect(result).toEqual([]);
  });
});
