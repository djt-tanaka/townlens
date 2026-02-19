import { describe, it, expect } from "vitest";
import {
  PLAN_LABELS,
  calculateUsagePercentage,
} from "@/components/dashboard/usage-card";

describe("calculateUsagePercentage", () => {
  it("通常の使用量でパーセンテージを返す", () => {
    expect(calculateUsagePercentage(3, 10)).toBe(30);
  });

  it("上限いっぱいの場合は100を返す", () => {
    expect(calculateUsagePercentage(10, 10)).toBe(100);
  });

  it("上限超過の場合でも100を上限とする", () => {
    expect(calculateUsagePercentage(15, 10)).toBe(100);
  });

  it("生成数0の場合は0を返す", () => {
    expect(calculateUsagePercentage(0, 10)).toBe(0);
  });

  it("上限が null（無制限）の場合は0を返す", () => {
    expect(calculateUsagePercentage(5, null)).toBe(0);
  });

  it("上限が0の場合は0を返す（ゼロ除算防止）", () => {
    expect(calculateUsagePercentage(5, 0)).toBe(0);
  });

  it("上限が負の場合は0を返す", () => {
    expect(calculateUsagePercentage(5, -1)).toBe(0);
  });
});

describe("PLAN_LABELS", () => {
  it("free プランのラベルが正しい", () => {
    expect(PLAN_LABELS.free).toBe("フリー");
  });

  it("standard プランのラベルが正しい", () => {
    expect(PLAN_LABELS.standard).toBe("スタンダード");
  });

  it("premium プランのラベルが正しい", () => {
    expect(PLAN_LABELS.premium).toBe("プレミアム");
  });
});
