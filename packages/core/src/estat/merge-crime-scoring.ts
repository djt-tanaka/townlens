import { CityIndicators, IndicatorValue } from "../scoring/types";
import { CrimeStats } from "./crime-data";

/**
 * 既存の CityIndicators に犯罪統計指標を不変的に追加する。
 * crimeData に含まれない都市は rawValue: null で追加される。
 */
export function mergeCrimeIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  crimeData: ReadonlyMap<string, CrimeStats>,
): ReadonlyArray<CityIndicators> {
  return cities.map((city) => {
    const stats = crimeData.get(city.areaCode);
    const crimeIndicator: IndicatorValue = {
      indicatorId: "crime_rate",
      rawValue: stats?.crimeRate ?? null,
      dataYear: stats?.dataYear ?? "",
      sourceId: "estat",
    };
    return {
      ...city,
      indicators: [...city.indicators, crimeIndicator],
    };
  });
}
