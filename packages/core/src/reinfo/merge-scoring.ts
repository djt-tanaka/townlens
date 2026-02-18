import { CityIndicators, IndicatorValue } from "../scoring/types";
import { CondoPriceStats } from "./types";

const MAN_YEN = 10000;

/**
 * 既存の CityIndicators に価格指標を不変的に追加する。
 * priceData に含まれない都市は rawValue: null で追加される。
 */
export function mergePriceIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  priceData: ReadonlyMap<string, CondoPriceStats>,
): ReadonlyArray<CityIndicators> {
  return cities.map((city) => {
    const stats = priceData.get(city.areaCode);
    const priceIndicator: IndicatorValue = {
      indicatorId: "condo_price_median",
      rawValue: stats ? Math.round(stats.median / MAN_YEN) : null,
      dataYear: stats?.year ?? "",
      sourceId: "reinfolib",
    };
    return {
      ...city,
      indicators: [...city.indicators, priceIndicator],
    };
  });
}
