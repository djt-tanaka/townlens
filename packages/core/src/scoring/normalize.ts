import { ChoiceScore, IndicatorDefinition } from "./types";
import { LOG_TRANSFORM_INDICATORS, logTransform } from "./national-baseline";

interface CityValue {
  readonly cityName: string;
  readonly value: number | null;
}

export type ChoiceScoreWithCity = ChoiceScore & { readonly cityName: string };

/**
 * 候補セット内で min-max 正規化 (0-100) を行う
 * null 値の都市は結果から除外される
 */
export function normalizeWithinCandidates(
  values: ReadonlyArray<CityValue>,
  definition: IndicatorDefinition
): ReadonlyArray<ChoiceScoreWithCity> {
  const valid = values.filter(
    (v): v is { readonly cityName: string; readonly value: number } =>
      v.value !== null
  );

  if (valid.length === 0) {
    return [];
  }

  if (valid.length === 1) {
    return [
      {
        indicatorId: definition.id,
        cityName: valid[0].cityName,
        score: 100,
      },
    ];
  }

  // per capita 指標は log(1+x) 変換を適用して外れ値を緩和
  const useLog = LOG_TRANSFORM_INDICATORS.has(definition.id);
  const transformed = valid.map((v) => ({
    ...v,
    tValue: useLog ? logTransform(v.value) : v.value,
  }));

  const tValues = transformed.map((v) => v.tValue);
  const min = Math.min(...tValues);
  const max = Math.max(...tValues);
  const range = max - min;

  return transformed.map((v) => {
    const rawScore = range === 0 ? 50 : ((v.tValue - min) / range) * 100;
    const score =
      definition.direction === "lower_better" ? 100 - rawScore : rawScore;

    return {
      indicatorId: definition.id,
      cityName: v.cityName,
      score,
    };
  });
}
