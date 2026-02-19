import type { CityIndicators, IndicatorValue } from "../scoring/types";
import type { CityDisasterData } from "./disaster-data";
import { mergeIndicators } from "../scoring/merge-indicators";

/**
 * 既存の CityIndicators に災害リスク指標を不変的に追加する。
 * disasterData に含まれない都市は rawValue: null で追加される。
 */
export function mergeDisasterIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  disasterData: ReadonlyMap<string, CityDisasterData>,
): ReadonlyArray<CityIndicators> {
  return mergeIndicators(cities, disasterData, (data) => {
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
    return [riskIndicator, evacuationIndicator];
  });
}
