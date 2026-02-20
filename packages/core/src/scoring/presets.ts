import { IndicatorDefinition, WeightPreset } from "./types";

export const CHILDCARE_FOCUSED: WeightPreset = {
  name: "childcare",
  label: "子育て重視",
  weights: {
    childcare: 0.35,
    price: 0.2,
    safety: 0.15,
    disaster: 0.05,
    transport: 0.05,
    education: 0.2,
  },
};

export const PRICE_FOCUSED: WeightPreset = {
  name: "price",
  label: "価格重視",
  weights: {
    childcare: 0.1,
    price: 0.5,
    safety: 0.1,
    disaster: 0.1,
    transport: 0.1,
    education: 0.1,
  },
};

export const SAFETY_FOCUSED: WeightPreset = {
  name: "safety",
  label: "安全重視",
  weights: {
    childcare: 0.15,
    price: 0.1,
    safety: 0.35,
    disaster: 0.2,
    transport: 0.1,
    education: 0.1,
  },
};

export const ALL_PRESETS: ReadonlyArray<WeightPreset> = [
  CHILDCARE_FOCUSED,
  PRICE_FOCUSED,
  SAFETY_FOCUSED,
];

export function findPreset(name: string): WeightPreset | undefined {
  return ALL_PRESETS.find((p) => p.name === name);
}

/** Phase 0: 人口統計の指標定義 */
export const POPULATION_INDICATORS: ReadonlyArray<IndicatorDefinition> = [
  {
    id: "population_total",
    label: "総人口",
    unit: "人",
    direction: "higher_better",
    category: "childcare",
    precision: 0,
  },
  {
    id: "kids_ratio",
    label: "0-14歳比率",
    unit: "%",
    direction: "higher_better",
    category: "childcare",
    precision: 1,
  },
];

/** Phase 1: 不動産価格の指標定義 */
export const PRICE_INDICATORS: ReadonlyArray<IndicatorDefinition> = [
  {
    id: "condo_price_median",
    label: "中古マンション価格（中央値）",
    unit: "万円",
    direction: "lower_better",
    category: "price",
    precision: 0,
  },
];

/** Phase 2a: 犯罪統計の指標定義 */
export const SAFETY_INDICATORS: ReadonlyArray<IndicatorDefinition> = [
  {
    id: "crime_rate",
    label: "刑法犯認知件数（人口千人当たり）",
    unit: "件/千人",
    direction: "lower_better",
    category: "safety",
    precision: 2,
  },
];

/** Phase 2b: 災害リスクの指標定義 */
export const DISASTER_INDICATORS: ReadonlyArray<IndicatorDefinition> = [
  {
    id: "flood_risk",
    label: "洪水・土砂災害リスク",
    unit: "リスクスコア",
    direction: "lower_better",
    category: "disaster",
    precision: 0,
  },
  {
    id: "evacuation_sites",
    label: "避難場所数",
    unit: "箇所",
    direction: "higher_better",
    category: "disaster",
    precision: 0,
  },
];

/** Phase 3: 教育統計の指標定義 */
export const EDUCATION_INDICATORS: ReadonlyArray<IndicatorDefinition> = [
  {
    id: "elementary_schools_per_capita",
    label: "小学校数（人口1万人あたり）",
    unit: "校/万人",
    direction: "higher_better",
    category: "education",
    precision: 2,
  },
  {
    id: "junior_high_schools_per_capita",
    label: "中学校数（人口1万人あたり）",
    unit: "校/万人",
    direction: "higher_better",
    category: "education",
    precision: 2,
  },
];

/** 全指標定義（Phase 0 + Phase 1 + Phase 2a + Phase 2b + Phase 3） */
export const ALL_INDICATORS: ReadonlyArray<IndicatorDefinition> = [
  ...POPULATION_INDICATORS,
  ...PRICE_INDICATORS,
  ...SAFETY_INDICATORS,
  ...DISASTER_INDICATORS,
  ...EDUCATION_INDICATORS,
];
