import { normalizeWithinCandidates } from "./normalize";
import { calculatePercentile } from "./percentile";
import { calculateCompositeScore } from "./composite";
import { evaluateConfidence } from "./confidence";
import { computeNationalPercentile } from "./national-baseline";
import { percentileToStars, computeCompositeStars } from "./star-rating";
import type { StarRating } from "./star-rating";
import {
  CityIndicators,
  CityScoreResult,
  IndicatorDefinition,
  IndicatorStarRating,
  WeightPreset,
} from "./types";

/**
 * 全都市のスコアを一括計算する
 * 候補セット内でのChoice Scoreとパーセンタイルに加え、
 * 全国ベースライン基準の5段階スター評価を算出する。
 */
export function scoreCities(
  cities: ReadonlyArray<CityIndicators>,
  definitions: ReadonlyArray<IndicatorDefinition>,
  preset: WeightPreset
): ReadonlyArray<CityScoreResult> {
  // 指標ごとにChoice Score（候補内正規化）を計算
  const choiceByCity = new Map<string, Map<string, number>>();
  for (const city of cities) {
    choiceByCity.set(city.cityName, new Map());
  }

  for (const def of definitions) {
    const values = cities.map((city) => {
      const indicator = city.indicators.find((i) => i.indicatorId === def.id);
      return {
        cityName: city.cityName,
        value: indicator?.rawValue ?? null,
      };
    });

    const normalized = normalizeWithinCandidates(values, def);
    for (const n of normalized) {
      choiceByCity.get(n.cityName)?.set(n.indicatorId, n.score);
    }
  }

  // 指標ごとに Baseline Score（候補セット内パーセンタイル）を計算
  const baselineByCity = new Map<string, Map<string, number>>();
  for (const city of cities) {
    baselineByCity.set(city.cityName, new Map());
  }

  for (const def of definitions) {
    const allValues = cities
      .map((city) => city.indicators.find((i) => i.indicatorId === def.id)?.rawValue)
      .filter((v): v is number => v !== null);

    for (const city of cities) {
      const indicator = city.indicators.find((i) => i.indicatorId === def.id);
      if (!indicator) {
        continue;
      }
      const baseline = calculatePercentile(indicator, allValues, def, "候補内");
      baselineByCity.get(city.cityName)?.set(def.id, baseline.percentile);
    }
  }

  // 都市ごとの結果を組み立て
  const results: CityScoreResult[] = cities.map((city) => {
    const cityChoice = choiceByCity.get(city.cityName) ?? new Map();
    const cityBaseline = baselineByCity.get(city.cityName) ?? new Map();

    const choiceScores = Array.from(cityChoice.entries()).map(
      ([indicatorId, score]) => ({ indicatorId, score })
    );

    const baselineScores = Array.from(cityBaseline.entries()).map(
      ([indicatorId, percentile]) => ({
        indicatorId,
        percentile,
        populationSize: cities.length,
        baselineName: "候補内" as const,
      })
    );

    const composite = calculateCompositeScore(choiceScores, definitions, preset);

    // 全国ベースライン基準のスター評価を計算
    const indicatorStars: IndicatorStarRating[] = [];
    for (const def of definitions) {
      const indicator = city.indicators.find((i) => i.indicatorId === def.id);
      if (!indicator || indicator.rawValue === null) {
        continue;
      }
      const nationalPct = computeNationalPercentile(
        indicator.rawValue,
        def.id,
        def.direction,
      );
      indicatorStars.push({
        indicatorId: def.id,
        stars: percentileToStars(nationalPct),
        nationalPercentile: nationalPct,
      });
    }

    // 加重平均のコンポジットスター値を計算
    const defMap = new Map(definitions.map((d) => [d.id, d]));
    const starWeights = indicatorStars.map((is) => {
      const def = defMap.get(is.indicatorId);
      const weight = def ? (preset.weights[def.category] ?? 0) : 0;
      return { indicatorId: is.indicatorId, weight };
    });
    const starRating =
      indicatorStars.length > 0
        ? computeCompositeStars(indicatorStars, starWeights)
        : undefined;

    // 信頼度: 全指標の情報を集約
    const dataYears = city.indicators
      .map((i) => i.dataYear)
      .filter(Boolean);
    const latestYear = dataYears.sort().reverse()[0] ?? "不明";
    const totalIndicators = definitions.length;
    const availableIndicators = city.indicators.filter(
      (i) => i.rawValue !== null
    ).length;
    const missingRate =
      totalIndicators > 0
        ? (totalIndicators - availableIndicators) / totalIndicators
        : 1;

    const confidence = evaluateConfidence({
      dataYear: latestYear,
      sampleCount: null,
      missingRate,
    });

    const notes: string[] = [];
    if (missingRate > 0) {
      notes.push(
        `${totalIndicators}指標中${totalIndicators - availableIndicators}件のデータが欠損`
      );
    }

    return {
      cityName: city.cityName,
      areaCode: city.areaCode,
      baseline: baselineScores,
      choice: choiceScores,
      compositeScore: composite.score,
      confidence,
      rank: 0,
      notes,
      starRating,
      indicatorStars,
    };
  });

  // ランク付け（compositeScore降順）
  const sorted = [...results].sort(
    (a, b) => b.compositeScore - a.compositeScore
  );

  return results.map((r) => ({
    ...r,
    rank: sorted.findIndex((s) => s.cityName === r.cityName) + 1,
  }));
}
