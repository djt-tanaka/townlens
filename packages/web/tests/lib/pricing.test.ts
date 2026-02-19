import { describe, it, expect } from "vitest";
import { PLAN_DEFINITIONS } from "@/lib/pricing";

describe("PLAN_DEFINITIONS", () => {
  it("3つのプランが定義されている", () => {
    expect(PLAN_DEFINITIONS).toHaveLength(3);
  });

  it("プラン ID が一意である", () => {
    const ids = PLAN_DEFINITIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("free, standard, premium の順で定義されている", () => {
    expect(PLAN_DEFINITIONS[0].id).toBe("free");
    expect(PLAN_DEFINITIONS[1].id).toBe("standard");
    expect(PLAN_DEFINITIONS[2].id).toBe("premium");
  });

  it("standard がハイライトされている", () => {
    const standard = PLAN_DEFINITIONS.find((p) => p.id === "standard");
    expect(standard?.highlighted).toBe(true);
  });

  it("free と premium はハイライトされていない", () => {
    const free = PLAN_DEFINITIONS.find((p) => p.id === "free");
    const premium = PLAN_DEFINITIONS.find((p) => p.id === "premium");
    expect(free?.highlighted).toBe(false);
    expect(premium?.highlighted).toBe(false);
  });

  it("全プランに機能が定義されている", () => {
    for (const plan of PLAN_DEFINITIONS) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it("全プランに必須フィールドがある", () => {
    for (const plan of PLAN_DEFINITIONS) {
      expect(plan.name).toBeTruthy();
      expect(plan.price).toBeTruthy();
      expect(plan.description).toBeTruthy();
      expect(plan.ctaLabel).toBeTruthy();
    }
  });
});
