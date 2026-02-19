import type { CityIndicators, IndicatorValue } from "../scoring/types";
import type { CrimeStats } from "./crime-data";
import { mergeIndicators } from "../scoring/merge-indicators";

/**
 * 既存の CityIndicators に犯罪統計指標を不変的に追加する。
 * crimeData に含まれない都市は rawValue: null で追加される。
 */
export function mergeCrimeIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  crimeData: ReadonlyMap<string, CrimeStats>,
): ReadonlyArray<CityIndicators> {
  return mergeIndicators(cities, crimeData, (stats) => {
    const indicator: IndicatorValue = {
      indicatorId: "crime_rate",
      rawValue: stats?.crimeRate ?? null,
      dataYear: stats?.dataYear ?? "",
      sourceId: "estat",
    };
    return [indicator];
  });
}
