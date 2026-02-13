import { CityIndicators, IndicatorValue } from "../scoring/types";
import { CityDisasterData } from "./disaster-data";

/**
 * 既存の CityIndicators に災害リスク指標を不変的に追加する。
 * disasterData に含まれない都市は rawValue: null で追加される。
 */
export function mergeDisasterIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  disasterData: ReadonlyMap<string, CityDisasterData>,
): ReadonlyArray<CityIndicators> {
  return cities.map((city) => {
    const data = disasterData.get(city.areaCode);
    const riskIndicator: IndicatorValue = {
      indicatorId: "flood_risk",
      rawValue: data?.riskScore ?? null,
      dataYear: "",
      sourceId: "reinfolib",
    };
    const evacuationIndicator: IndicatorValue = {
      indicatorId: "evacuation_sites",
      rawValue: data?.evacuationSiteCount ?? null,
      dataYear: "",
      sourceId: "reinfolib",
    };
    return {
      ...city,
      indicators: [...city.indicators, riskIndicator, evacuationIndicator],
    };
  });
}
