import { describe, it, expect } from "vitest";
import {
  getNationalBaseline,
  computeNationalPercentile,
  NATIONAL_BASELINES,
} from "../../src/scoring/national-baseline";

describe("getNationalBaseline", () => {
  it("存在する指標IDのベースラインを返す", () => {
    const baseline = getNationalBaseline("population_total");
    expect(baseline).toBeDefined();
    expect(baseline!.indicatorId).toBe("population_total");
    expect(baseline!.breakpoints).toHaveLength(4);
  });

  it("存在しない指標IDではundefinedを返す", () => {
    expect(getNationalBaseline("unknown")).toBeUndefined();
  });

  it("全指標のベースラインが定義されている", () => {
    const expectedIds = [
      "population_total",
      "kids_ratio",
      "condo_price_median",
      "crime_rate",
      "flood_risk",
      "evacuation_sites",
      "elementary_schools_per_capita",
      "junior_high_schools_per_capita",
    ];
    for (const id of expectedIds) {
      expect(getNationalBaseline(id)).toBeDefined();
    }
  });
});

describe("computeNationalPercentile", () => {
  describe("higher_better 指標（population_total）", () => {
    // breakpoints: [15000, 50000, 120000, 300000]

    it("p20以下は低いパーセンタイル", () => {
      const pct = computeNationalPercentile(10000, "population_total", "higher_better");
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThan(20);
    });

    it("p40付近は20-40のパーセンタイル", () => {
      const pct = computeNationalPercentile(50000, "population_total", "higher_better");
      expect(pct).toBe(40);
    });

    it("p60付近は40-60のパーセンタイル", () => {
      const pct = computeNationalPercentile(120000, "population_total", "higher_better");
      expect(pct).toBe(60);
    });

    it("p80付近は60-80のパーセンタイル", () => {
      const pct = computeNationalPercentile(300000, "population_total", "higher_better");
      expect(pct).toBe(80);
    });

    it("p80以上は高いパーセンタイル", () => {
      const pct = computeNationalPercentile(500000, "population_total", "higher_better");
      expect(pct).toBeGreaterThan(80);
      expect(pct).toBeLessThanOrEqual(100);
    });
  });

  describe("lower_better 指標（crime_rate）", () => {
    // breakpoints: [2, 4, 6, 9]

    it("低い犯罪率は高いパーセンタイル（反転）", () => {
      const pct = computeNationalPercentile(1.0, "crime_rate", "lower_better");
      expect(pct).toBeGreaterThan(80);
    });

    it("高い犯罪率は低いパーセンタイル（反転）", () => {
      const pct = computeNationalPercentile(10.0, "crime_rate", "lower_better");
      expect(pct).toBeLessThan(20);
    });
  });

  describe("lower_better 指標（condo_price_median）", () => {
    // breakpoints: [800, 1500, 2500, 4000]

    it("安い物件価格は高いパーセンタイル（反転）", () => {
      const pct = computeNationalPercentile(500, "condo_price_median", "lower_better");
      expect(pct).toBeGreaterThan(80);
    });

    it("高い物件価格は低いパーセンタイル（反転）", () => {
      const pct = computeNationalPercentile(5000, "condo_price_median", "lower_better");
      expect(pct).toBeLessThan(20);
    });
  });

  it("ベースラインが存在しない指標はパーセンタイル50を返す", () => {
    const pct = computeNationalPercentile(100, "unknown_indicator", "higher_better");
    expect(pct).toBe(50);
  });

  it("パーセンタイルは0-100の範囲内", () => {
    for (const baseline of NATIONAL_BASELINES) {
      const values = [0, baseline.breakpoints[0], baseline.breakpoints[2], baseline.breakpoints[3] * 2];
      for (const v of values) {
        const pct = computeNationalPercentile(v, baseline.indicatorId, "higher_better");
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      }
    }
  });
});
