import { describe, it, expect } from "vitest";
import {
  getNationalBaseline,
  computeNationalPercentile,
  NATIONAL_BASELINES,
  LOG_TRANSFORM_INDICATORS,
  logTransform,
  PER_CAPITA_PERCENTILE_CAP,
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

describe("logTransform", () => {
  it("log(1 + 0) = 0", () => {
    expect(logTransform(0)).toBe(0);
  });

  it("正の値に対して正の結果を返す", () => {
    expect(logTransform(1)).toBeCloseTo(Math.log(2));
    expect(logTransform(10)).toBeCloseTo(Math.log(11));
  });
});

describe("LOG_TRANSFORM_INDICATORS", () => {
  it("per capita 指標が含まれている", () => {
    expect(LOG_TRANSFORM_INDICATORS.has("elementary_schools_per_capita")).toBe(true);
    expect(LOG_TRANSFORM_INDICATORS.has("hospitals_per_capita")).toBe(true);
    expect(LOG_TRANSFORM_INDICATORS.has("station_count_per_capita")).toBe(true);
  });

  it("per capita でない指標は含まれていない", () => {
    expect(LOG_TRANSFORM_INDICATORS.has("population_total")).toBe(false);
    expect(LOG_TRANSFORM_INDICATORS.has("crime_rate")).toBe(false);
    expect(LOG_TRANSFORM_INDICATORS.has("condo_price_median")).toBe(false);
  });
});

describe("per capita 指標の対数変換効果", () => {
  it("中程度の外れ値が対数変換 + キャップで抑制される", () => {
    // schools_per_capita = 5.0（p80=2.5 の2倍）
    // 対数変換で ~97 になるが、PER_CAPITA_PERCENTILE_CAP=95 でキャップ
    const pct = computeNationalPercentile(
      5.0,
      "elementary_schools_per_capita",
      "higher_better",
    );
    expect(pct).toBeLessThanOrEqual(PER_CAPITA_PERCENTILE_CAP);
    expect(pct).toBeGreaterThan(80);
  });

  it("通常範囲の per capita 値は妥当なパーセンタイルを返す", () => {
    // breakpoints: [0.5, 1.0, 1.5, 2.5]
    const pct = computeNationalPercentile(
      1.5,
      "elementary_schools_per_capita",
      "higher_better",
    );
    expect(pct).toBeGreaterThanOrEqual(50);
    expect(pct).toBeLessThanOrEqual(70);
  });

  it("非 per capita 指標は影響を受けない", () => {
    // population_total は対数変換の対象外
    const pct = computeNationalPercentile(300000, "population_total", "higher_better");
    expect(pct).toBe(80);
  });
});

describe("PER_CAPITA_PERCENTILE_CAP", () => {
  it("per capita 指標のパーセンタイルがキャップ値を超えない", () => {
    // 極端に高い per capita 値でもキャップされる
    for (const indicatorId of LOG_TRANSFORM_INDICATORS) {
      const pct = computeNationalPercentile(
        1000, // 極端に高い値
        indicatorId,
        "higher_better",
      );
      expect(pct).toBeLessThanOrEqual(PER_CAPITA_PERCENTILE_CAP);
    }
  });

  it("非 per capita 指標はキャップされない", () => {
    // population_total は per capita ではないのでキャップなし
    const pct = computeNationalPercentile(
      1_000_000, // 非常に大きな人口
      "population_total",
      "higher_better",
    );
    expect(pct).toBeGreaterThan(PER_CAPITA_PERCENTILE_CAP);
  });
});
