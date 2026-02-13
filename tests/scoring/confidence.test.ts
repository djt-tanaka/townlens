import { describe, it, expect } from "vitest";
import { evaluateConfidence } from "../../src/scoring/confidence";

describe("evaluateConfidence", () => {
  const currentYear = new Date().getFullYear();

  it("最新データ・低欠損・十分なサンプルなら High", () => {
    const result = evaluateConfidence({
      dataYear: String(currentYear - 1),
      sampleCount: 50,
      missingRate: 0.05,
    });
    expect(result.level).toBe("high");
  });

  it("2年以内のデータ・低欠損なら High", () => {
    const result = evaluateConfidence({
      dataYear: String(currentYear - 2),
      sampleCount: 100,
      missingRate: 0.0,
    });
    expect(result.level).toBe("high");
  });

  it("4年以内のデータ・中程度の欠損なら Medium", () => {
    const result = evaluateConfidence({
      dataYear: String(currentYear - 3),
      sampleCount: 20,
      missingRate: 0.2,
    });
    expect(result.level).toBe("medium");
  });

  it("古いデータなら Low", () => {
    const result = evaluateConfidence({
      dataYear: String(currentYear - 6),
      sampleCount: 100,
      missingRate: 0.0,
    });
    expect(result.level).toBe("low");
  });

  it("欠損率が高ければ Low", () => {
    const result = evaluateConfidence({
      dataYear: String(currentYear),
      sampleCount: 100,
      missingRate: 0.5,
    });
    expect(result.level).toBe("low");
  });

  it("sampleCount が null でも判定できる", () => {
    const result = evaluateConfidence({
      dataYear: String(currentYear),
      sampleCount: null,
      missingRate: 0.05,
    });
    // sampleCount null は中程度のサンプルとみなす
    expect(result.level).toBe("medium");
  });

  it("理由が含まれる", () => {
    const result = evaluateConfidence({
      dataYear: String(currentYear - 1),
      sampleCount: 50,
      missingRate: 0.05,
    });
    expect(result.reason).toBeTruthy();
    expect(typeof result.reason).toBe("string");
  });
});
