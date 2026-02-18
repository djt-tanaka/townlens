import { ChoiceScore, IndicatorDefinition } from "./types";

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

  const rawValues = valid.map((v) => v.value);
  const min = Math.min(...rawValues);
  const max = Math.max(...rawValues);
  const range = max - min;

  return valid.map((v) => {
    const rawScore = range === 0 ? 50 : ((v.value - min) / range) * 100;
    const score =
      definition.direction === "lower_better" ? 100 - rawScore : rawScore;

    return {
      indicatorId: definition.id,
      cityName: v.cityName,
      score,
    };
  });
}
