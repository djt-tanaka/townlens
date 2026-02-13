import { BaselineScore, IndicatorDefinition, IndicatorValue } from "./types";

/**
 * 母集団内のパーセンタイル位置を計算する
 * null 値はパーセンタイル 0 を返す
 */
export function calculatePercentile(
  targetValue: IndicatorValue,
  population: ReadonlyArray<number>,
  definition: IndicatorDefinition,
  baselineName: string
): BaselineScore {
  if (targetValue.rawValue === null || population.length === 0) {
    return {
      indicatorId: targetValue.indicatorId,
      percentile: 0,
      populationSize: population.length,
      baselineName,
    };
  }

  const target = targetValue.rawValue;
  const belowCount = population.filter((v) => v < target).length;
  const equalCount = population.filter((v) => v === target).length;

  // パーセンタイルランク = (below + 0.5 * equal) / total * 100
  const rawPercentile =
    ((belowCount + 0.5 * equalCount) / population.length) * 100;

  const percentile =
    definition.direction === "lower_better"
      ? 100 - rawPercentile
      : rawPercentile;

  return {
    indicatorId: targetValue.indicatorId,
    percentile: Math.round(percentile * 10) / 10,
    populationSize: population.length,
    baselineName,
  };
}
