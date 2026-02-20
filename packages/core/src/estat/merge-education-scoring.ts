import type { CityIndicators, IndicatorValue } from "../scoring/types";
import type { EducationStats } from "./education-data";
import { mergeIndicators } from "../scoring/merge-indicators";

/**
 * 既存の CityIndicators に教育統計指標を不変的に追加する。
 * educationData に含まれない都市は rawValue: null で追加される。
 */
export function mergeEducationIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  educationData: ReadonlyMap<string, EducationStats>,
): ReadonlyArray<CityIndicators> {
  return mergeIndicators(cities, educationData, (stats) => {
    const indicators: ReadonlyArray<IndicatorValue> = [
      {
        indicatorId: "elementary_schools_per_capita",
        rawValue: stats?.elementarySchoolsPerCapita ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
      {
        indicatorId: "junior_high_schools_per_capita",
        rawValue: stats?.juniorHighSchoolsPerCapita ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
    ];
    return indicators;
  });
}
