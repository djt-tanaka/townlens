import { describe, it, expect } from "vitest";
import { calculatePercentile } from "../../src/scoring/percentile";
import { IndicatorDefinition, IndicatorValue } from "../../src/scoring/types";

const higherBetterDef: IndicatorDefinition = {
  id: "kids_ratio",
  label: "0-14歳比率",
  unit: "%",
  direction: "higher_better",
  category: "childcare",
  precision: 1,
};

const lowerBetterDef: IndicatorDefinition = {
  id: "crime_rate",
  label: "犯罪率",
  unit: "件/千人",
  direction: "lower_better",
  category: "safety",
  precision: 2,
};

function makeValue(rawValue: number | null): IndicatorValue {
  return {
    indicatorId: "kids_ratio",
    rawValue,
    dataYear: "2020",
    sourceId: "estat",
  };
}

describe("calculatePercentile", () => {
  it("母集団の中央値はパーセンタイル45を返す", () => {
    // パーセンタイルランク = (below + 0.5 * equal) / total * 100
    // 50: below=4, equal=1 → (4 + 0.5) / 10 * 100 = 45
    const population = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = calculatePercentile(
      makeValue(50),
      population,
      higherBetterDef,
      "全国"
    );
    expect(result.percentile).toBe(45);
    expect(result.populationSize).toBe(10);
    expect(result.baselineName).toBe("全国");
  });

  it("母集団の最大値はパーセンタイル90を返す", () => {
    // 50: below=4, equal=1 → (4 + 0.5) / 5 * 100 = 90
    const population = [10, 20, 30, 40, 50];
    const result = calculatePercentile(
      makeValue(50),
      population,
      higherBetterDef,
      "全国"
    );
    expect(result.percentile).toBe(90);
  });

  it("母集団の最小値はパーセンタイル0付近を返す", () => {
    const population = [10, 20, 30, 40, 50];
    const result = calculatePercentile(
      makeValue(10),
      population,
      higherBetterDef,
      "全国"
    );
    // 最小値：自分以下は1個、自分未満は0個 → percentile 低め
    expect(result.percentile).toBeLessThanOrEqual(20);
  });

  it("lower_better の場合はパーセンタイルを反転する", () => {
    const population = [10, 20, 30, 40, 50];
    const highValue = calculatePercentile(
      makeValue(50),
      population,
      lowerBetterDef,
      "全国"
    );
    const lowValue = calculatePercentile(
      makeValue(10),
      population,
      lowerBetterDef,
      "全国"
    );
    // lower_better: 小さい値ほどパーセンタイルが高い
    expect(lowValue.percentile).toBeGreaterThan(highValue.percentile);
  });

  it("null 値はパーセンタイル 0 を返す", () => {
    const population = [10, 20, 30];
    const result = calculatePercentile(
      makeValue(null),
      population,
      higherBetterDef,
      "全国"
    );
    expect(result.percentile).toBe(0);
  });

  it("indicatorId が正しく設定される", () => {
    const result = calculatePercentile(
      makeValue(50),
      [10, 50, 100],
      higherBetterDef,
      "全国"
    );
    expect(result.indicatorId).toBe("kids_ratio");
  });
});
