import type {
  CityScoreResult,
  IndicatorDefinition,
  IndicatorCategory,
} from "@townlens/core";

/** カテゴリごとのスコアを集計する */
export function getCategoryScores(
  result: CityScoreResult,
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  readonly category: IndicatorCategory;
  readonly avgScore: number;
  readonly count: number;
}> {
  const categoryMap = new Map<
    IndicatorCategory,
    { total: number; count: number }
  >();
  for (const choiceScore of result.choice) {
    const def = definitions.find((d) => d.id === choiceScore.indicatorId);
    if (!def) continue;
    const existing = categoryMap.get(def.category);
    if (existing) {
      existing.total += choiceScore.score;
      existing.count += 1;
    } else {
      categoryMap.set(def.category, {
        total: choiceScore.score,
        count: 1,
      });
    }
  }
  return [...categoryMap.entries()].map(([category, { total, count }]) => ({
    category,
    avgScore: total / count,
    count,
  }));
}

/** 指標をカテゴリ別にグループ化する */
export function groupByCategory(
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  readonly category: IndicatorCategory;
  readonly indicators: ReadonlyArray<IndicatorDefinition>;
}> {
  const groups = new Map<IndicatorCategory, IndicatorDefinition[]>();
  for (const def of definitions) {
    const existing = groups.get(def.category);
    if (existing) {
      existing.push(def);
    } else {
      groups.set(def.category, [def]);
    }
  }
  return [...groups.entries()].map(([category, indicators]) => ({
    category,
    indicators,
  }));
}
