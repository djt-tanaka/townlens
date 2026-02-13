import { describe, it, expect } from "vitest";
import { DATASETS } from "../../src/config/datasets";

describe("DATASETS", () => {
  it("population の statsDataId は10桁の数字文字列", () => {
    expect(DATASETS.population.statsDataId).toMatch(/^\d{10}$/);
  });

  it("population のセレクタが定義されている", () => {
    expect(DATASETS.population.selectors).toBeDefined();
    expect(DATASETS.population.selectors.classId).toBe("cat01");
    expect(DATASETS.population.selectors.totalCode).toBe("000");
    expect(DATASETS.population.selectors.kidsCode).toBe("001");
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
