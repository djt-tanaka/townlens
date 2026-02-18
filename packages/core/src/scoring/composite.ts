import { ChoiceScore, IndicatorDefinition, WeightPreset } from "./types";

interface CompositeResult {
  readonly score: number;
  readonly usedIndicatorCount: number;
  readonly totalIndicatorCount: number;
}

/**
 * 重み付き総合スコアを計算する
 * 欠損指標は除外して有効指標のみで再正規化する（仕様 4.4 準拠）
 */
export function calculateCompositeScore(
  choiceScores: ReadonlyArray<ChoiceScore>,
  definitions: ReadonlyArray<IndicatorDefinition>,
  preset: WeightPreset
): CompositeResult {
  if (choiceScores.length === 0) {
    return {
      score: 0,
      usedIndicatorCount: 0,
      totalIndicatorCount: definitions.length,
    };
  }

  const defMap = new Map(definitions.map((d) => [d.id, d]));

  let weightedSum = 0;
  let totalWeight = 0;
  let usedCount = 0;

  for (const cs of choiceScores) {
    const def = defMap.get(cs.indicatorId);
    if (!def) {
      continue;
    }

    const weight = preset.weights[def.category] ?? 0;
    weightedSum += cs.score * weight;
    totalWeight += weight;
    usedCount += 1;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    score: Math.round(score * 10) / 10,
    usedIndicatorCount: usedCount,
    totalIndicatorCount: definitions.length,
  };
}
