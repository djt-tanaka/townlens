import { describe, it, expect } from "vitest";
import { normalizeWithinCandidates } from "../../src/scoring/normalize";
import { IndicatorDefinition } from "../../src/scoring/types";

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

describe("normalizeWithinCandidates", () => {
  it("min-max 正規化で 0-100 のスコアを返す", () => {
    const values = [
      { cityName: "A市", value: 10 },
      { cityName: "B市", value: 20 },
      { cityName: "C市", value: 30 },
    ];
    const result = normalizeWithinCandidates(values, higherBetterDef);
    expect(result).toHaveLength(3);

    const a = result.find((r) => r.cityName === "A市")!;
    const b = result.find((r) => r.cityName === "B市")!;
    const c = result.find((r) => r.cityName === "C市")!;

    expect(a.score).toBe(0);
    expect(b.score).toBe(50);
    expect(c.score).toBe(100);
  });

  it("lower_better の場合はスコアを反転する", () => {
    const values = [
      { cityName: "A市", value: 10 },
      { cityName: "B市", value: 20 },
      { cityName: "C市", value: 30 },
    ];
    const result = normalizeWithinCandidates(values, lowerBetterDef);

    const a = result.find((r) => r.cityName === "A市")!;
    const c = result.find((r) => r.cityName === "C市")!;

    // lower_better: 値が小さいほどスコアが高い
    expect(a.score).toBe(100);
    expect(c.score).toBe(0);
  });

  it("全都市同値の場合は 50 を返す", () => {
    const values = [
      { cityName: "A市", value: 42 },
      { cityName: "B市", value: 42 },
    ];
    const result = normalizeWithinCandidates(values, higherBetterDef);
    expect(result[0].score).toBe(50);
    expect(result[1].score).toBe(50);
  });

  it("null 値の都市はスコアなしで除外される", () => {
    const values = [
      { cityName: "A市", value: 10 as number | null },
      { cityName: "B市", value: null },
      { cityName: "C市", value: 30 as number | null },
    ];
    const result = normalizeWithinCandidates(values, higherBetterDef);
    // null の都市はスキップされる
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.cityName === "B市")).toBeUndefined();
  });

  it("都市が1つしかない場合は 100 を返す", () => {
    const values = [{ cityName: "A市", value: 42 }];
    const result = normalizeWithinCandidates(values, higherBetterDef);
    expect(result[0].score).toBe(100);
  });

  it("indicatorId が正しく設定される", () => {
    const values = [
      { cityName: "A市", value: 10 },
      { cityName: "B市", value: 20 },
    ];
    const result = normalizeWithinCandidates(values, higherBetterDef);
    expect(result[0].indicatorId).toBe("kids_ratio");
  });
});
