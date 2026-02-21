import type { CityIndicators, IndicatorValue } from "../scoring/types";
import type { HealthcareStats } from "./healthcare-data";
import { mergeIndicators } from "../scoring/merge-indicators";

/**
 * 既存の CityIndicators に医療統計指標を不変的に追加する。
 * healthcareData に含まれない都市は rawValue: null で追加される。
 */
export function mergeHealthcareIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  healthcareData: ReadonlyMap<string, HealthcareStats>,
): ReadonlyArray<CityIndicators> {
  return mergeIndicators(cities, healthcareData, (stats) => {
    const indicators: ReadonlyArray<IndicatorValue> = [
      {
        indicatorId: "hospitals_per_capita",
        rawValue: stats?.hospitalsPerCapita ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
      {
        indicatorId: "clinics_per_capita",
        rawValue: stats?.clinicsPerCapita ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
      {
        indicatorId: "pediatrics_per_capita",
        rawValue: stats?.pediatricsPerCapita ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
    ];
    return indicators;
  });
}
