import { describe, it, expect } from "vitest";
import { getRawValueFromRow, findRawRow } from "../src/report-row-utils";
import type { ReportRow } from "../src/types";

/** テスト用の最小限 ReportRow */
function makeRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    cityInput: "テスト市",
    cityResolved: "テスト市",
    areaCode: "13101",
    total: 100000,
    kids: 12000,
    ratio: 12.0,
    totalRank: 1,
    ratioRank: 1,
    ...overrides,
  };
}

describe("getRawValueFromRow", () => {
  it("population_total を取得する", () => {
    const row = makeRow({ total: 50000 });
    expect(getRawValueFromRow("population_total", row)).toBe(50000);
  });

  it("kids_ratio を取得する", () => {
    const row = makeRow({ ratio: 15.3 });
    expect(getRawValueFromRow("kids_ratio", row)).toBe(15.3);
  });

  it("condo_price_median を取得する", () => {
    const row = makeRow({ condoPriceMedian: 4800 });
    expect(getRawValueFromRow("condo_price_median", row)).toBe(4800);
  });

  it("crime_rate を取得する", () => {
    const row = makeRow({ crimeRate: 3.2 });
    expect(getRawValueFromRow("crime_rate", row)).toBe(3.2);
  });

  it("flood_risk: 両方 null なら undefined", () => {
    const row = makeRow({ floodRisk: null, landslideRisk: null });
    expect(getRawValueFromRow("flood_risk", row)).toBeUndefined();
  });

  it("flood_risk: 両方未設定なら undefined", () => {
    const row = makeRow();
    expect(getRawValueFromRow("flood_risk", row)).toBeUndefined();
  });

  it("flood_risk: floodRisk=true, landslideRisk=false なら 1", () => {
    const row = makeRow({ floodRisk: true, landslideRisk: false });
    expect(getRawValueFromRow("flood_risk", row)).toBe(1);
  });

  it("flood_risk: 両方 true なら 2", () => {
    const row = makeRow({ floodRisk: true, landslideRisk: true });
    expect(getRawValueFromRow("flood_risk", row)).toBe(2);
  });

  it("flood_risk: 両方 false なら 0", () => {
    const row = makeRow({ floodRisk: false, landslideRisk: false });
    expect(getRawValueFromRow("flood_risk", row)).toBe(0);
  });

  it("evacuation_sites を取得する", () => {
    const row = makeRow({ evacuationSiteCount: 15 });
    expect(getRawValueFromRow("evacuation_sites", row)).toBe(15);
  });

  it("教育指標を取得する", () => {
    const row = makeRow({
      elementarySchoolsPerCapita: 2.5,
      juniorHighSchoolsPerCapita: 1.2,
    });
    expect(getRawValueFromRow("elementary_schools_per_capita", row)).toBe(2.5);
    expect(getRawValueFromRow("junior_high_schools_per_capita", row)).toBe(1.2);
  });

  it("交通指標を取得する", () => {
    const row = makeRow({
      stationCountPerCapita: 0.8,
      terminalAccessKm: 5.5,
    });
    expect(getRawValueFromRow("station_count_per_capita", row)).toBe(0.8);
    expect(getRawValueFromRow("terminal_access_km", row)).toBe(5.5);
  });

  it("医療指標を取得する", () => {
    const row = makeRow({
      hospitalsPerCapita: 3.1,
      clinicsPerCapita: 25.0,
      pediatricsPerCapita: 4.2,
    });
    expect(getRawValueFromRow("hospitals_per_capita", row)).toBe(3.1);
    expect(getRawValueFromRow("clinics_per_capita", row)).toBe(25.0);
    expect(getRawValueFromRow("pediatrics_per_capita", row)).toBe(4.2);
  });

  it("未知の指標IDは undefined を返す", () => {
    const row = makeRow();
    expect(getRawValueFromRow("unknown_indicator", row)).toBeUndefined();
  });

  it("null 値は undefined に変換される（?? undefined による）", () => {
    const row = makeRow({ crimeRate: null });
    expect(getRawValueFromRow("crime_rate", row)).toBeUndefined();
  });
});

describe("findRawRow", () => {
  const rows: ReadonlyArray<ReportRow> = [
    makeRow({ cityResolved: "世田谷区", areaCode: "13112" }),
    makeRow({ cityResolved: "渋谷区", areaCode: "13113" }),
    makeRow({ cityResolved: "新宿区", areaCode: "13104" }),
  ];

  it("areaCode で検索できる", () => {
    const found = findRawRow("不明", "13113", rows);
    expect(found?.cityResolved).toBe("渋谷区");
  });

  it("cityName で検索できる", () => {
    const found = findRawRow("新宿区", "99999", rows);
    expect(found?.cityResolved).toBe("新宿区");
  });

  it("areaCode が優先される", () => {
    const found = findRawRow("渋谷区", "13112", rows);
    expect(found?.cityResolved).toBe("世田谷区");
  });

  it("見つからない場合は undefined", () => {
    const found = findRawRow("不明", "99999", rows);
    expect(found).toBeUndefined();
  });
});
