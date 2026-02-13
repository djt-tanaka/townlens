import { IndicatorDefinition, WeightPreset } from "./types";

export const CHILDCARE_FOCUSED: WeightPreset = {
  name: "childcare",
  label: "子育て重視",
  weights: {
    childcare: 0.5,
    price: 0.25,
    safety: 0.15,
    disaster: 0.05,
    transport: 0.05,
  },
};

export const PRICE_FOCUSED: WeightPreset = {
  name: "price",
  label: "価格重視",
  weights: {
    childcare: 0.15,
    price: 0.5,
    safety: 0.15,
    disaster: 0.1,
    transport: 0.1,
  },
};

export const SAFETY_FOCUSED: WeightPreset = {
  name: "safety",
  label: "安全重視",
  weights: {
    childcare: 0.2,
    price: 0.15,
    safety: 0.35,
    disaster: 0.2,
    transport: 0.1,
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
