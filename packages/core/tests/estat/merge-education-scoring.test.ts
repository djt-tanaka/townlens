import { describe, it, expect } from "vitest";
import { mergeEducationIntoScoringInput } from "../../src/estat/merge-education-scoring";
import { CityIndicators } from "../../src/scoring/types";
import { EducationStats } from "../../src/estat/education-data";

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

describe("mergeEducationIntoScoringInput", () => {
  it("教育統計データを都市の指標に追加する", () => {
    const educationData = new Map<string, EducationStats>([
      ["13112", { elementarySchoolsPerCapita: 0.7, juniorHighSchoolsPerCapita: 0.33, dataYear: "2022" }],
      ["13113", { elementarySchoolsPerCapita: 0.78, juniorHighSchoolsPerCapita: 0.48, dataYear: "2022" }],
    ]);

    const result = mergeEducationIntoScoringInput(baseCities, educationData);

    expect(result).toHaveLength(2);
    const setagaya = result.find((c) => c.areaCode === "13112")!;
    expect(setagaya.indicators).toHaveLength(4);

    const elementary = setagaya.indicators.find((i) => i.indicatorId === "elementary_schools_per_capita")!;
    expect(elementary.rawValue).toBe(0.7);
    expect(elementary.sourceId).toBe("estat");
    expect(elementary.dataYear).toBe("2022");

    const juniorHigh = setagaya.indicators.find((i) => i.indicatorId === "junior_high_schools_per_capita")!;
    expect(juniorHigh.rawValue).toBe(0.33);
  });

  it("教育データがない都市はnull値で追加する", () => {
    const educationData = new Map<string, EducationStats>([
      ["13112", { elementarySchoolsPerCapita: 0.7, juniorHighSchoolsPerCapita: 0.33, dataYear: "2022" }],
    ]);

    const result = mergeEducationIntoScoringInput(baseCities, educationData);

    const shibuya = result.find((c) => c.areaCode === "13113")!;
    const elementary = shibuya.indicators.find((i) => i.indicatorId === "elementary_schools_per_capita")!;
    expect(elementary.rawValue).toBeNull();
    expect(elementary.dataYear).toBe("");

    const juniorHigh = shibuya.indicators.find((i) => i.indicatorId === "junior_high_schools_per_capita")!;
    expect(juniorHigh.rawValue).toBeNull();
  });

  it("元のCityIndicatorsを変更しない（不変性）", () => {
    const educationData = new Map<string, EducationStats>([
      ["13112", { elementarySchoolsPerCapita: 0.7, juniorHighSchoolsPerCapita: 0.33, dataYear: "2022" }],
    ]);

    const result = mergeEducationIntoScoringInput(baseCities, educationData);

    expect(baseCities[0].indicators).toHaveLength(2);
    expect(result[0].indicators).toHaveLength(4);
    expect(result[0]).not.toBe(baseCities[0]);
  });

  it("空のeducationDataでも全都市にnull指標を追加する", () => {
    const educationData = new Map<string, EducationStats>();

    const result = mergeEducationIntoScoringInput(baseCities, educationData);

    for (const city of result) {
      expect(city.indicators).toHaveLength(4);
      const elementary = city.indicators.find((i) => i.indicatorId === "elementary_schools_per_capita")!;
      expect(elementary.rawValue).toBeNull();
      const juniorHigh = city.indicators.find((i) => i.indicatorId === "junior_high_schools_per_capita")!;
      expect(juniorHigh.rawValue).toBeNull();
    }
  });

  it("空の都市配列で空配列を返す", () => {
    const result = mergeEducationIntoScoringInput([], new Map());
    expect(result).toEqual([]);
  });
});
