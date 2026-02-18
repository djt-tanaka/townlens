import { describe, it, expect } from "vitest";
import { calculateCompositeScore } from "../../src/scoring/composite";
import { ChoiceScore, IndicatorDefinition, WeightPreset } from "../../src/scoring/types";

const definitions: ReadonlyArray<IndicatorDefinition> = [
  {
    id: "kids_ratio",
    label: "0-14歳比率",
    unit: "%",
    direction: "higher_better",
    category: "childcare",
    precision: 1,
  },
  {
    id: "price_median",
    label: "取引価格中央値",
    unit: "万円",
    direction: "lower_better",
    category: "price",
    precision: 0,
  },
];

const preset: WeightPreset = {
  name: "childcare",
  label: "子育て重視",
  weights: {
    childcare: 0.6,
    price: 0.2,
    safety: 0.1,
    disaster: 0.05,
    transport: 0.05,
  },
};

describe("calculateCompositeScore", () => {
  it("重み付き加重平均でスコアを計算する", () => {
    const scores: ReadonlyArray<ChoiceScore> = [
      { indicatorId: "kids_ratio", score: 80 },
      { indicatorId: "price_median", score: 60 },
    ];

    const result = calculateCompositeScore(scores, definitions, preset);
    // childcare(0.6) * 80 + price(0.2) * 60 = 48 + 12 = 60
    // 有効重み合計 = 0.6 + 0.2 = 0.8
    // 再正規化: 60 / 0.8 = 75
    expect(result.score).toBeCloseTo(75, 0);
    expect(result.usedIndicatorCount).toBe(2);
    expect(result.totalIndicatorCount).toBe(2);
  });

  it("スコアが1つしかない場合もそのまま計算する", () => {
    const scores: ReadonlyArray<ChoiceScore> = [
      { indicatorId: "kids_ratio", score: 90 },
    ];

    const result = calculateCompositeScore(scores, definitions, preset);
    // childcare(0.6) * 90 = 54, 有効重み = 0.6, 再正規化: 54 / 0.6 = 90
    expect(result.score).toBeCloseTo(90, 0);
    expect(result.usedIndicatorCount).toBe(1);
  });

  it("空のスコアでは 0 を返す", () => {
    const result = calculateCompositeScore([], definitions, preset);
    expect(result.score).toBe(0);
    expect(result.usedIndicatorCount).toBe(0);
  });

  it("definitions に存在しない indicatorId のスコアは無視する", () => {
    const scores: ReadonlyArray<ChoiceScore> = [
      { indicatorId: "kids_ratio", score: 80 },
      { indicatorId: "unknown_indicator", score: 100 },
    ];

    const result = calculateCompositeScore(scores, definitions, preset);
    expect(result.usedIndicatorCount).toBe(1);
    expect(result.score).toBeCloseTo(80, 0);
  });
});
