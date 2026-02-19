import type { CityIndicators, IndicatorValue } from "./types";

/**
 * 都市の指標配列にデータソースから新しい指標を不変的に追加する汎用関数。
 * dataMap に含まれない都市には extractor(undefined) の結果が追加される。
 */
export function mergeIndicators<T>(
  cities: ReadonlyArray<CityIndicators>,
  dataMap: ReadonlyMap<string, T>,
  extractor: (data: T | undefined) => ReadonlyArray<IndicatorValue>,
): ReadonlyArray<CityIndicators> {
  return cities.map((city) => {
    const data = dataMap.get(city.areaCode);
    const newIndicators = extractor(data);
    return {
      ...city,
      indicators: [...city.indicators, ...newIndicators],
    };
  });
}
