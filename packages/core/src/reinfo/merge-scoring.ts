import type { CityIndicators, IndicatorValue } from "../scoring/types";
import type { CondoPriceStats } from "./types";
import { mergeIndicators } from "../scoring/merge-indicators";

const MAN_YEN = 10000;

/**
 * 既存の CityIndicators に価格指標を不変的に追加する。
 * priceData に含まれない都市は rawValue: null で追加される。
 */
export function mergePriceIntoScoringInput(
  cities: ReadonlyArray<CityIndicators>,
  priceData: ReadonlyMap<string, CondoPriceStats>,
): ReadonlyArray<CityIndicators> {
  return mergeIndicators(cities, priceData, (stats) => {
    const indicator: IndicatorValue = {
      indicatorId: "condo_price_median",
      rawValue: stats ? Math.round(stats.median / MAN_YEN) : null,
      dataYear: stats?.year ?? "",
      sourceId: "reinfolib",
    };
    return [indicator];
  });
}
