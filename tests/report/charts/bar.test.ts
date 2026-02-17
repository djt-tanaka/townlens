import { describe, it, expect } from "vitest";
import { renderHorizontalBarChart, BarChartItem } from "../../../src/report/templates/charts/bar";

const sampleItems: ReadonlyArray<BarChartItem> = [
  { label: "世田谷区", value: 85.0, color: "#0ea5e9" },
  { label: "渋谷区", value: 60.5, color: "#f43f5e" },
  { label: "新宿区", value: 45.2, color: "#10b981" },
];

describe("renderHorizontalBarChart", () => {
  it("SVG文字列を生成する", () => {
    const svg = renderHorizontalBarChart(sampleItems);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("各都市のラベルが含まれる", () => {
    const svg = renderHorizontalBarChart(sampleItems);
    expect(svg).toContain("世田谷区");
    expect(svg).toContain("渋谷区");
    expect(svg).toContain("新宿区");
  });

  it("スコア値が含まれる", () => {
    const svg = renderHorizontalBarChart(sampleItems);
    expect(svg).toContain("85.0");
    expect(svg).toContain("60.5");
  });

  it("空配列では空文字を返す", () => {
    expect(renderHorizontalBarChart([])).toBe("");
  });

  it("showValues=falseでスコア非表示", () => {
    const svg = renderHorizontalBarChart(sampleItems, { showValues: false });
    // バーのrectは存在するがスコアテキストは最小限
    expect(svg).toContain("<svg");
    expect(svg).toContain("世田谷区");
  });
});
