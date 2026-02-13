import { describe, it, expect } from "vitest";
import {
  filterCondoTrades,
  filterTradesByType,
  filterByBudgetLimit,
  calculateAffordabilityRate,
  parseTradePrices,
  calculatePriceStats,
} from "../../src/reinfo/stats";
import { ReinfoTradeRecord } from "../../src/reinfo/types";

function makeTrade(overrides: Partial<ReinfoTradeRecord> = {}): ReinfoTradeRecord {
  return {
    Type: "中古マンション等",
    TradePrice: "35000000",
    Area: "70",
    BuildingYear: "2010",
    FloorPlan: "3LDK",
    Prefecture: "東京都",
    Municipality: "新宿区",
    DistrictName: "西新宿",
    ...overrides,
  };
}

describe("filterCondoTrades", () => {
  it("Type が '中古マンション等' のレコードのみ抽出する", () => {
    const trades = [
      makeTrade(),
      makeTrade({ Type: "宅地(土地と建物)" }),
      makeTrade({ Type: "中古マンション等" }),
    ];
    const result = filterCondoTrades(trades);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.Type === "中古マンション等")).toBe(true);
  });

  it("空配列を渡すと空配列を返す", () => {
    expect(filterCondoTrades([])).toEqual([]);
  });

  it("該当レコードがない場合は空配列を返す", () => {
    const trades = [makeTrade({ Type: "宅地(土地)" })];
    expect(filterCondoTrades(trades)).toEqual([]);
  });
});

describe("parseTradePrices", () => {
  it("TradePrice を数値配列に変換する", () => {
    const trades = [
      makeTrade({ TradePrice: "35000000" }),
      makeTrade({ TradePrice: "28000000" }),
    ];
    expect(parseTradePrices(trades)).toEqual([35000000, 28000000]);
  });

  it("無効な価格（空文字、非数値）は除外する", () => {
    const trades = [
      makeTrade({ TradePrice: "35000000" }),
      makeTrade({ TradePrice: "" }),
      makeTrade({ TradePrice: "非公開" }),
    ];
    expect(parseTradePrices(trades)).toEqual([35000000]);
  });

  it("0円の取引は除外する", () => {
    const trades = [
      makeTrade({ TradePrice: "35000000" }),
      makeTrade({ TradePrice: "0" }),
    ];
    expect(parseTradePrices(trades)).toEqual([35000000]);
  });
});

describe("calculatePriceStats", () => {
  it("奇数個の価格から中央値・Q25・Q75を計算する", () => {
    const prices = [20000000, 30000000, 35000000, 40000000, 50000000];
    const stats = calculatePriceStats(prices, "2024");
    expect(stats).not.toBeNull();
    expect(stats!.median).toBe(35000000);
    expect(stats!.count).toBe(5);
    expect(stats!.year).toBe("2024");
    expect(stats!.q25).toBeLessThan(stats!.median);
    expect(stats!.q75).toBeGreaterThan(stats!.median);
  });

  it("偶数個の価格から中央値を計算する", () => {
    const prices = [20000000, 30000000, 40000000, 50000000];
    const stats = calculatePriceStats(prices, "2024");
    expect(stats).not.toBeNull();
    expect(stats!.median).toBe(35000000);
    expect(stats!.count).toBe(4);
  });

  it("1件のみの場合は全て同じ値を返す", () => {
    const stats = calculatePriceStats([35000000], "2024");
    expect(stats).not.toBeNull();
    expect(stats!.median).toBe(35000000);
    expect(stats!.q25).toBe(35000000);
    expect(stats!.q75).toBe(35000000);
    expect(stats!.count).toBe(1);
  });

  it("空配列の場合は null を返す", () => {
    expect(calculatePriceStats([], "2024")).toBeNull();
  });

  it("ソートされていない入力でも正しく計算する", () => {
    const prices = [50000000, 20000000, 40000000, 30000000, 35000000];
    const stats = calculatePriceStats(prices, "2024");
    expect(stats!.median).toBe(35000000);
  });
});

describe("filterTradesByType", () => {
  it("condo を指定すると中古マンション等のみ抽出する", () => {
    const trades = [
      makeTrade({ Type: "中古マンション等" }),
      makeTrade({ Type: "中古戸建住宅" }),
    ];
    const result = filterTradesByType(trades, "condo");
    expect(result).toHaveLength(1);
    expect(result[0].Type).toBe("中古マンション等");
  });

  it("house を指定すると中古戸建住宅のみ抽出する", () => {
    const trades = [
      makeTrade({ Type: "中古マンション等" }),
      makeTrade({ Type: "中古戸建住宅" }),
    ];
    const result = filterTradesByType(trades, "house");
    expect(result).toHaveLength(1);
    expect(result[0].Type).toBe("中古戸建住宅");
  });

  it("land を指定すると宅地(土地)のみ抽出する", () => {
    const trades = [
      makeTrade({ Type: "宅地(土地)" }),
      makeTrade({ Type: "中古マンション等" }),
    ];
    const result = filterTradesByType(trades, "land");
    expect(result).toHaveLength(1);
    expect(result[0].Type).toBe("宅地(土地)");
  });

  it("all を指定するとType非空の全件を返す", () => {
    const trades = [
      makeTrade({ Type: "中古マンション等" }),
      makeTrade({ Type: "中古戸建住宅" }),
      makeTrade({ Type: "" }),
    ];
    const result = filterTradesByType(trades, "all");
    expect(result).toHaveLength(2);
  });

  it("空配列を渡すと空配列を返す", () => {
    expect(filterTradesByType([], "condo")).toEqual([]);
  });
});

describe("filterByBudgetLimit", () => {
  it("予算上限以下の取引のみ抽出する", () => {
    const trades = [
      makeTrade({ TradePrice: "30000000" }),
      makeTrade({ TradePrice: "60000000" }),
      makeTrade({ TradePrice: "50000000" }),
    ];
    const result = filterByBudgetLimit(trades, 5000);
    expect(result).toHaveLength(2);
  });

  it("予算上限と同額の取引は含む", () => {
    const trades = [makeTrade({ TradePrice: "50000000" })];
    const result = filterByBudgetLimit(trades, 5000);
    expect(result).toHaveLength(1);
  });

  it("無効な価格のレコードは除外する", () => {
    const trades = [
      makeTrade({ TradePrice: "30000000" }),
      makeTrade({ TradePrice: "非公開" }),
      makeTrade({ TradePrice: "0" }),
    ];
    const result = filterByBudgetLimit(trades, 5000);
    expect(result).toHaveLength(1);
  });

  it("空配列を渡すと空配列を返す", () => {
    expect(filterByBudgetLimit([], 5000)).toEqual([]);
  });
});

describe("calculateAffordabilityRate", () => {
  it("予算内取引の割合を計算する", () => {
    const prices = [20000000, 30000000, 50000000, 70000000];
    const rate = calculateAffordabilityRate(prices, 5000);
    expect(rate).toBe(75);
  });

  it("全取引が予算内なら100を返す", () => {
    const prices = [20000000, 30000000];
    const rate = calculateAffordabilityRate(prices, 5000);
    expect(rate).toBe(100);
  });

  it("全取引が予算超なら0を返す", () => {
    const prices = [60000000, 70000000];
    const rate = calculateAffordabilityRate(prices, 5000);
    expect(rate).toBe(0);
  });

  it("空配列なら0を返す", () => {
    expect(calculateAffordabilityRate([], 5000)).toBe(0);
  });
});
