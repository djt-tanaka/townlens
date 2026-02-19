import { describe, it, expect } from "vitest";
import {
  getRawValue,
  formatRawValue,
  getScoreColorHex,
  getConfidenceStyle,
  getConfidenceLabel,
} from "../../src/components/report/raw-value-utils";
import type { ReportRow, IndicatorDefinition } from "@townlens/core";

const mockRow: ReportRow = {
  cityInput: "世田谷区",
  cityResolved: "世田谷区",
  areaCode: "13112",
  total: 943664,
  kids: 109837,
  ratio: 11.6,
  totalRank: 1,
  ratioRank: 3,
  condoPriceMedian: 5980,
  condoPriceQ25: 4200,
  condoPriceQ75: 7800,
  condoPriceCount: 245,
  affordabilityRate: 32.5,
  propertyTypeLabel: "マンション",
  crimeRate: 4.21,
  floodRisk: true,
  landslideRisk: false,
  evacuationSiteCount: 42,
};

const makeDef = (overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition => ({
  id: "population_total",
  label: "総人口",
  unit: "人",
  direction: "higher_better",
  category: "childcare",
  precision: 0,
  ...overrides,
});

describe("getRawValue", () => {
  it("population_total を取得できる", () => {
    expect(getRawValue("population_total", mockRow)).toBe(943664);
  });

  it("kids_ratio を取得できる", () => {
    expect(getRawValue("kids_ratio", mockRow)).toBe(11.6);
  });

  it("condo_price_median を取得できる", () => {
    expect(getRawValue("condo_price_median", mockRow)).toBe(5980);
  });

  it("crime_rate を取得できる", () => {
    expect(getRawValue("crime_rate", mockRow)).toBe(4.21);
  });

  it("flood_risk を複合スコアとして取得できる（洪水あり + 土砂なし = 1）", () => {
    expect(getRawValue("flood_risk", mockRow)).toBe(1);
  });

  it("flood_risk: 両方nullの場合はundefined", () => {
    const row = { ...mockRow, floodRisk: null, landslideRisk: null };
    expect(getRawValue("flood_risk", row)).toBeUndefined();
  });

  it("evacuation_sites を取得できる", () => {
    expect(getRawValue("evacuation_sites", mockRow)).toBe(42);
  });

  it("未知の指標IDはundefinedを返す", () => {
    expect(getRawValue("unknown_indicator", mockRow)).toBeUndefined();
  });
});

describe("formatRawValue", () => {
  it("precision=0 の場合はカンマ区切りフォーマット", () => {
    const def = makeDef({ precision: 0 });
    expect(formatRawValue(943664, def)).toBe("943,664");
  });

  it("precision=1 の場合は小数1桁", () => {
    const def = makeDef({ precision: 1 });
    expect(formatRawValue(11.6, def)).toBe("11.6");
  });

  it("precision=2 の場合は小数2桁", () => {
    const def = makeDef({ precision: 2 });
    expect(formatRawValue(4.21, def)).toBe("4.21");
  });

  it("null は '-' を返す", () => {
    expect(formatRawValue(null, makeDef())).toBe("-");
  });

  it("undefined は '-' を返す", () => {
    expect(formatRawValue(undefined, makeDef())).toBe("-");
  });
});

describe("getScoreColorHex", () => {
  it("70以上はグリーン", () => {
    expect(getScoreColorHex(70)).toBe("#5a9e7a");
    expect(getScoreColorHex(100)).toBe("#5a9e7a");
  });

  it("40-69はアンバー", () => {
    expect(getScoreColorHex(40)).toBe("#c8883a");
    expect(getScoreColorHex(69)).toBe("#c8883a");
  });

  it("40未満はローズ", () => {
    expect(getScoreColorHex(39)).toBe("#c26050");
    expect(getScoreColorHex(0)).toBe("#c26050");
  });
});

describe("getConfidenceStyle", () => {
  it("high は緑背景", () => {
    expect(getConfidenceStyle("high")).toEqual({
      backgroundColor: "#e8f5ee",
      color: "#2d6b4a",
    });
  });

  it("medium は琥珀背景", () => {
    expect(getConfidenceStyle("medium")).toEqual({
      backgroundColor: "#fdf0e0",
      color: "#8a5a20",
    });
  });

  it("low は赤背景", () => {
    expect(getConfidenceStyle("low")).toEqual({
      backgroundColor: "#fce8e4",
      color: "#8b3325",
    });
  });
});

describe("getConfidenceLabel", () => {
  it("各レベルの日本語ラベル", () => {
    expect(getConfidenceLabel("high")).toBe("信頼度: 高");
    expect(getConfidenceLabel("medium")).toBe("信頼度: 中");
    expect(getConfidenceLabel("low")).toBe("信頼度: 低");
  });
});
