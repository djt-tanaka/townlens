import { describe, it, expect } from "vitest";
import { renderScoreGauge } from "../../../src/report/templates/charts/gauge";

describe("renderScoreGauge", () => {
  it("SVG文字列を生成する", () => {
    const svg = renderScoreGauge({ score: 75.5 });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("スコア数値がテキストとして含まれる", () => {
    const svg = renderScoreGauge({ score: 78.5 });
    expect(svg).toContain("78.5");
  });

  it("ラベルが含まれる", () => {
    const svg = renderScoreGauge({ score: 60, label: "総合スコア" });
    expect(svg).toContain("総合スコア");
  });

  it("順位情報が含まれる", () => {
    const svg = renderScoreGauge({ score: 80, rank: 1, totalCities: 3 });
    expect(svg).toContain("1位");
    expect(svg).toContain("3市区町村");
  });

  it("スコア0-100の範囲にクランプされる", () => {
    const svgLow = renderScoreGauge({ score: -10 });
    expect(svgLow).toContain("0.0");
    const svgHigh = renderScoreGauge({ score: 150 });
    expect(svgHigh).toContain("100.0");
  });

  it("高スコアは緑色になる", () => {
    const svg = renderScoreGauge({ score: 80 });
    expect(svg).toContain("#10b981");
  });

  it("低スコアはローズ色になる", () => {
    const svg = renderScoreGauge({ score: 20 });
    expect(svg).toContain("#f43f5e");
  });
});
