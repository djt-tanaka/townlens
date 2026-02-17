import { describe, it, expect } from "vitest";
import { renderRadarChart, RadarChartData } from "../../../src/report/templates/charts/radar";

const sampleData: RadarChartData = {
  labels: ["子育て", "住宅価格", "安全", "災害", "交通"],
  datasets: [
    { name: "世田谷区", values: [85, 60, 70, 45, 50], color: "#0ea5e9" },
    { name: "渋谷区", values: [60, 40, 80, 55, 70], color: "#f43f5e" },
  ],
  categoryColors: ["#10b981", "#0ea5e9", "#f43f5e", "#8b5cf6", "#f59e0b"],
};

describe("renderRadarChart", () => {
  it("SVG文字列を生成する", () => {
    const svg = renderRadarChart(sampleData);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("データセット数分のpolygonを含む", () => {
    const svg = renderRadarChart(sampleData);
    const polygonMatches = svg.match(/<polygon/g);
    // グリッド(5) + データ(2) = 7
    expect(polygonMatches).toBeTruthy();
    expect(polygonMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("ラベルがSVG内に含まれる", () => {
    const svg = renderRadarChart(sampleData);
    expect(svg).toContain("子育て");
    expect(svg).toContain("住宅価格");
  });

  it("凡例に都市名が含まれる", () => {
    const svg = renderRadarChart(sampleData);
    expect(svg).toContain("世田谷区");
    expect(svg).toContain("渋谷区");
  });

  it("3カテゴリ未満では空文字を返す", () => {
    const data: RadarChartData = {
      labels: ["A", "B"],
      datasets: [{ name: "test", values: [50, 50], color: "#000" }],
    };
    expect(renderRadarChart(data)).toBe("");
  });

  it("3カテゴリでSVGを生成できる", () => {
    const data: RadarChartData = {
      labels: ["A", "B", "C"],
      datasets: [{ name: "test", values: [50, 70, 30], color: "#000" }],
    };
    const svg = renderRadarChart(data);
    expect(svg).toContain("<svg");
  });
});
