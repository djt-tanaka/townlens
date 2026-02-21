import { describe, it, expect } from "vitest";
import {
  CHILDCARE_FOCUSED,
  PRICE_FOCUSED,
  SAFETY_FOCUSED,
  ALL_PRESETS,
  findPreset,
  POPULATION_INDICATORS,
  PRICE_INDICATORS,
  SAFETY_INDICATORS,
  DISASTER_INDICATORS,
  EDUCATION_INDICATORS,
  TRANSPORT_INDICATORS,
  ALL_INDICATORS,
} from "../../src/scoring/presets";

describe("プリセット定義", () => {
  it("子育て重視プリセットの重みが合計1.0", () => {
    const sum = Object.values(CHILDCARE_FOCUSED.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
    expect(CHILDCARE_FOCUSED.name).toBe("childcare");
  });

  it("価格重視プリセットの重みが合計1.0", () => {
    const sum = Object.values(PRICE_FOCUSED.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
    expect(PRICE_FOCUSED.name).toBe("price");
  });

  it("安全重視プリセットの重みが合計1.0", () => {
    const sum = Object.values(SAFETY_FOCUSED.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
    expect(SAFETY_FOCUSED.name).toBe("safety");
  });

  it("ALL_PRESETSに3つのプリセットが含まれる", () => {
    expect(ALL_PRESETS).toHaveLength(3);
  });
});

describe("findPreset", () => {
  it("名前でプリセットを検索できる", () => {
    expect(findPreset("childcare")).toBe(CHILDCARE_FOCUSED);
    expect(findPreset("price")).toBe(PRICE_FOCUSED);
    expect(findPreset("safety")).toBe(SAFETY_FOCUSED);
  });

  it("存在しない名前はundefinedを返す", () => {
    expect(findPreset("nonexistent")).toBeUndefined();
  });
});

describe("POPULATION_INDICATORS", () => {
  it("Phase 0用の2指標が定義されている", () => {
    expect(POPULATION_INDICATORS).toHaveLength(2);
    const ids = POPULATION_INDICATORS.map((d) => d.id);
    expect(ids).toContain("population_total");
    expect(ids).toContain("kids_ratio");
  });

  it("全指標がchildcareカテゴリ", () => {
    for (const def of POPULATION_INDICATORS) {
      expect(def.category).toBe("childcare");
    }
  });
});

describe("PRICE_INDICATORS", () => {
  it("Phase 1用の価格指標が定義されている", () => {
    expect(PRICE_INDICATORS.length).toBeGreaterThanOrEqual(1);
    const ids = PRICE_INDICATORS.map((d) => d.id);
    expect(ids).toContain("condo_price_median");
  });

  it("価格指標はlower_betterかつpriceカテゴリ", () => {
    const condo = PRICE_INDICATORS.find((d) => d.id === "condo_price_median")!;
    expect(condo.direction).toBe("lower_better");
    expect(condo.category).toBe("price");
    expect(condo.unit).toBe("万円");
  });
});

describe("SAFETY_INDICATORS", () => {
  it("Phase 2a用の犯罪指標が定義されている", () => {
    expect(SAFETY_INDICATORS.length).toBeGreaterThanOrEqual(1);
    const ids = SAFETY_INDICATORS.map((d) => d.id);
    expect(ids).toContain("crime_rate");
  });

  it("犯罪指標はlower_betterかつsafetyカテゴリ", () => {
    const crime = SAFETY_INDICATORS.find((d) => d.id === "crime_rate")!;
    expect(crime.direction).toBe("lower_better");
    expect(crime.category).toBe("safety");
    expect(crime.unit).toBe("件/千人");
  });
});

describe("DISASTER_INDICATORS", () => {
  it("Phase 2b用の災害指標が定義されている", () => {
    expect(DISASTER_INDICATORS.length).toBeGreaterThanOrEqual(2);
    const ids = DISASTER_INDICATORS.map((d) => d.id);
    expect(ids).toContain("flood_risk");
    expect(ids).toContain("evacuation_sites");
  });

  it("災害指標はdisasterカテゴリ", () => {
    for (const def of DISASTER_INDICATORS) {
      expect(def.category).toBe("disaster");
    }
  });

  it("flood_riskはlower_better、evacuation_sitesはhigher_better", () => {
    const flood = DISASTER_INDICATORS.find((d) => d.id === "flood_risk")!;
    expect(flood.direction).toBe("lower_better");
    const evac = DISASTER_INDICATORS.find((d) => d.id === "evacuation_sites")!;
    expect(evac.direction).toBe("higher_better");
  });
});

describe("EDUCATION_INDICATORS", () => {
  it("Phase 3用の教育指標が定義されている", () => {
    expect(EDUCATION_INDICATORS).toHaveLength(2);
    const ids = EDUCATION_INDICATORS.map((d) => d.id);
    expect(ids).toContain("elementary_schools_per_capita");
    expect(ids).toContain("junior_high_schools_per_capita");
  });

  it("教育指標はhigher_betterかつeducationカテゴリ", () => {
    for (const def of EDUCATION_INDICATORS) {
      expect(def.direction).toBe("higher_better");
      expect(def.category).toBe("education");
    }
  });

  it("単位が校/万人", () => {
    for (const def of EDUCATION_INDICATORS) {
      expect(def.unit).toBe("校/万人");
    }
  });
});

describe("TRANSPORT_INDICATORS", () => {
  it("Phase 4用の交通指標が定義されている", () => {
    expect(TRANSPORT_INDICATORS).toHaveLength(2);
    const ids = TRANSPORT_INDICATORS.map((d) => d.id);
    expect(ids).toContain("station_count_per_capita");
    expect(ids).toContain("terminal_access_km");
  });

  it("交通指標はtransportカテゴリ", () => {
    for (const def of TRANSPORT_INDICATORS) {
      expect(def.category).toBe("transport");
    }
  });

  it("station_count_per_capitaはhigher_better、terminal_access_kmはlower_better", () => {
    const station = TRANSPORT_INDICATORS.find((d) => d.id === "station_count_per_capita")!;
    expect(station.direction).toBe("higher_better");
    expect(station.unit).toBe("駅/万人");
    const terminal = TRANSPORT_INDICATORS.find((d) => d.id === "terminal_access_km")!;
    expect(terminal.direction).toBe("lower_better");
    expect(terminal.unit).toBe("km");
  });
});

describe("ALL_INDICATORS", () => {
  it("全フェーズの指標を統合している", () => {
    expect(ALL_INDICATORS.length).toBe(
      POPULATION_INDICATORS.length + PRICE_INDICATORS.length + SAFETY_INDICATORS.length + DISASTER_INDICATORS.length + EDUCATION_INDICATORS.length + TRANSPORT_INDICATORS.length,
    );
  });

  it("IDが一意", () => {
    const ids = ALL_INDICATORS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
