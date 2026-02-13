import { describe, it, expect } from "vitest";
import {
  CHILDCARE_FOCUSED,
  PRICE_FOCUSED,
  SAFETY_FOCUSED,
  ALL_PRESETS,
  findPreset,
  POPULATION_INDICATORS,
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
