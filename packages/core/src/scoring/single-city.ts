/**
 * 単一都市の全国ベースライン基準スコアリング。
 *
 * scoreCities() は2都市以上の候補セット比較（min-max正規化）が前提のため、
 * 1都市のランディングページでは使用できない。
 * この関数は全国パーセンタイル + スター評価のみを軽量に算出する。
 */

import type {
  CityIndicators,
  IndicatorDefinition,
  IndicatorStarRating,
  WeightPreset,
} from "./types";
import { computeNationalPercentile } from "./national-baseline";
import { percentileToStars, computeCompositeStars, applyDataCoveragePenalty } from "./star-rating";

/** 単一都市のスター評価結果 */
export interface SingleCityScore {
  readonly cityName: string;
  readonly areaCode: string;
  /** 総合スター評価（1.0-5.0、プリセット重み付き加重平均） */
  readonly starRating: number;
  /** 指標別スター評価 */
  readonly indicatorStars: ReadonlyArray<IndicatorStarRating>;
}

/**
 * 単一都市の全国ベースライン基準スコアリング。
 * Choice Score（候補内比較）は算出せず、全国パーセンタイル + スター評価のみ返す。
 */
export function scoreSingleCity(
  city: CityIndicators,
  definitions: ReadonlyArray<IndicatorDefinition>,
  preset: WeightPreset,
): SingleCityScore {
  const indicatorStars: IndicatorStarRating[] = [];

  for (const def of definitions) {
    const indicator = city.indicators.find((i) => i.indicatorId === def.id);
    if (!indicator || indicator.rawValue === null) continue;

    const nationalPercentile = computeNationalPercentile(
      indicator.rawValue,
      def.id,
      def.direction,
    );

    indicatorStars.push({
      indicatorId: def.id,
      stars: percentileToStars(nationalPercentile),
      nationalPercentile,
    });
  }

  // カテゴリ重みを指標に割り当て
  const defMap = new Map(definitions.map((d) => [d.id, d]));
  const starWeights = indicatorStars.map((is) => {
    const def = defMap.get(is.indicatorId);
    const weight = def ? (preset.weights[def.category] ?? 0) : 0;
    return { indicatorId: is.indicatorId, weight };
  });

  const rawStarRating =
    indicatorStars.length > 0
      ? computeCompositeStars(indicatorStars, starWeights)
      : 3;

  // データ充足率に基づくスコア補正（指標不足の都市を中立方向に引き寄せ）
  const starRating = applyDataCoveragePenalty(
    rawStarRating,
    indicatorStars.length,
    definitions.length,
  );

  return {
    cityName: city.cityName,
    areaCode: city.areaCode,
    starRating,
    indicatorStars,
  };
}
