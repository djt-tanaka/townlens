import { describe, it, expect } from "vitest";
import { DATASETS } from "../../src/config/datasets";

describe("DATASETS", () => {
  it("population の statsDataId は10桁の数字文字列", () => {
    expect(DATASETS.population.statsDataId).toMatch(/^\d{10}$/);
  });

  it("population のセレクタが定義されている", () => {
    expect(DATASETS.population.selectors).toBeDefined();
    expect(DATASETS.population.selectors.classId).toBe("cat01");
    // totalCode/kidsCode は自動検出に委ねるため未定義
    expect(DATASETS.population.selectors.totalCode).toBeUndefined();
    expect(DATASETS.population.selectors.kidsCode).toBeUndefined();
  });

  it("crime の statsDataId は10桁の数字文字列", () => {
    expect(DATASETS.crime.statsDataId).toMatch(/^\d{10}$/);
  });

  it("全プリセットにラベルが定義されている", () => {
    for (const preset of Object.values(DATASETS)) {
      expect(preset.label).toBeTruthy();
    }
  });
});
