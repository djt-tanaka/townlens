import type {
  CityScoreResult,
  IndicatorDefinition,
  IndicatorCategory,
} from "@townlens/core";

/** カテゴリごとのスコアと指標定義を集計する */
export function getCategoryScores(
  result: CityScoreResult,
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  readonly category: IndicatorCategory;
  readonly avgScore: number;
  readonly count: number;
  readonly categoryDefs: ReadonlyArray<IndicatorDefinition>;
}> {
  const categoryMap = new Map<
    IndicatorCategory,
    { total: number; count: number; defs: IndicatorDefinition[] }
  >();
  for (const choiceScore of result.choice) {
    const def = definitions.find((d) => d.id === choiceScore.indicatorId);
    if (!def) continue;
    const existing = categoryMap.get(def.category);
    if (existing) {
      existing.total += choiceScore.score;
      existing.count += 1;
      if (!existing.defs.some((d) => d.id === def.id)) {
        existing.defs.push(def);
      }
    } else {
      categoryMap.set(def.category, {
        total: choiceScore.score,
        count: 1,
        defs: [def],
      });
    }
  }
  return [...categoryMap.entries()].map(
    ([category, { total, count, defs }]) => ({
      category,
      avgScore: total / count,
      count,
      categoryDefs: defs,
    }),
  );
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
