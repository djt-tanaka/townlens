import type { CityIndicators, IndicatorValue } from "../scoring/types";
import type { TransportStats } from "./transport-data";
import { mergeIndicators } from "../scoring/merge-indicators";

/**
 * 既存の CityIndicators に交通利便性指標を不変的に追加する。
 * transportData に含まれない都市は rawValue: null で追加される。
 */
export function mergeTransportIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  transportData: ReadonlyMap<string, TransportStats>,
): ReadonlyArray<CityIndicators> {
  return mergeIndicators(cities, transportData, (stats) => {
    const indicators: ReadonlyArray<IndicatorValue> = [
      {
        indicatorId: "station_count_per_capita",
        rawValue: stats?.stationCountPerCapita ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "estat",
      },
      {
        indicatorId: "terminal_access_km",
        rawValue: stats?.terminalAccessKm ?? null,
        dataYear: stats?.dataYear ?? "",
        sourceId: "static",
      },
    ];
    return indicators;
  });
}
