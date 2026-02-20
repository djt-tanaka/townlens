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

  // スター評価ゲージのテスト
  describe("スター評価ゲージ", () => {
    it("starRatingがある場合はスター表示に切り替わる", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 4.2 });
      expect(svg).toContain("<svg");
      expect(svg).toContain("★");
      expect(svg).toContain("4.2 / 5.0");
    });

    it("スター数に応じた★☆が表示される", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 3.0 });
      expect(svg).toContain("★★★☆☆");
    });

    it("5段階スター（高評価）は緑色", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 4.8 });
      expect(svg).toContain("#10b981");
    });

    it("3.5以上はライトグリーン", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 3.7 });
      expect(svg).toContain("#22c55e");
    });

    it("2.5以上はアンバー色", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 2.8 });
      expect(svg).toContain("#f59e0b");
    });

    it("1.5以上はオレンジ色", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 1.8 });
      expect(svg).toContain("#f97316");
    });

    it("1.5未満はローズ色", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 1.2 });
      expect(svg).toContain("#f43f5e");
    });

    it("順位情報が含まれる", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 4.0, rank: 1, totalCities: 5 });
      expect(svg).toContain("1位");
      expect(svg).toContain("5市区町村");
    });

    it("順位なしでも正常に表示される", () => {
      const svg = renderScoreGauge({ score: 50, starRating: 3.5 });
      expect(svg).not.toContain("位");
    });
  });
});
