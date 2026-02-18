import { describe, it, expect } from "vitest";
import {
  getScoreColor,
  calculateArc,
} from "@/components/report/score-gauge";

describe("getScoreColor", () => {
  it("70以上は緑を返す", () => {
    expect(getScoreColor(70)).toBe("#10b981");
    expect(getScoreColor(100)).toBe("#10b981");
    expect(getScoreColor(85)).toBe("#10b981");
  });

  it("40〜69は黄色を返す", () => {
    expect(getScoreColor(40)).toBe("#f59e0b");
    expect(getScoreColor(69)).toBe("#f59e0b");
    expect(getScoreColor(55)).toBe("#f59e0b");
  });

  it("40未満は赤を返す", () => {
    expect(getScoreColor(0)).toBe("#f43f5e");
    expect(getScoreColor(39)).toBe("#f43f5e");
    expect(getScoreColor(20)).toBe("#f43f5e");
  });
});

describe("calculateArc", () => {
  const radius = 55;
  const halfCircumference = Math.PI * radius;

  it("スコア0の場合、offset は半周分", () => {
    const { dashOffset } = calculateArc(0, radius);
    expect(dashOffset).toBeCloseTo(halfCircumference);
  });

  it("スコア100の場合、offset は0", () => {
    const { dashOffset } = calculateArc(100, radius);
    expect(dashOffset).toBeCloseTo(0);
  });

  it("スコア50の場合、offset は半周の半分", () => {
    const { dashOffset } = calculateArc(50, radius);
    expect(dashOffset).toBeCloseTo(halfCircumference * 0.5);
  });

  it("スコア100超でも100として扱う", () => {
    const { dashOffset } = calculateArc(150, radius);
    expect(dashOffset).toBeCloseTo(0);
  });

  it("dashArray は半周×2の形式", () => {
    const { dashArray } = calculateArc(50, radius);
    expect(dashArray).toBe(`${halfCircumference} ${halfCircumference}`);
  });
});
