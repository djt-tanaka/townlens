import { CondoPriceStats, PropertyType, PROPERTY_TYPE_LABELS, ReinfoTradeRecord } from "./types";

/** 指定された物件タイプのレコードのみ抽出 */
export function filterTradesByType(
  trades: ReadonlyArray<ReinfoTradeRecord>,
  propertyType: PropertyType,
): ReadonlyArray<ReinfoTradeRecord> {
  if (propertyType === "all") {
    return trades.filter((t) => t.Type !== "");
  }
  const label = PROPERTY_TYPE_LABELS[propertyType];
  return trades.filter((t) => t.Type === label);
}

/** "中古マンション等" のレコードのみ抽出（後方互換ラッパー） */
export function filterCondoTrades(
  trades: ReadonlyArray<ReinfoTradeRecord>,
): ReadonlyArray<ReinfoTradeRecord> {
  return filterTradesByType(trades, "condo");
}

/** 予算上限でフィルタ（万円単位で指定） */
export function filterByBudgetLimit(
  trades: ReadonlyArray<ReinfoTradeRecord>,
  budgetLimitManYen: number,
): ReadonlyArray<ReinfoTradeRecord> {
  const limitYen = budgetLimitManYen * 10000;
  return trades.filter((t) => {
    const price = Number(t.TradePrice);
    return Number.isFinite(price) && price > 0 && price <= limitYen;
  });
}

/** 予算上限内の取引割合を算出（0-100%） */
export function calculateAffordabilityRate(
  prices: ReadonlyArray<number>,
  budgetLimitManYen: number,
): number {
  if (prices.length === 0) return 0;
  const limitYen = budgetLimitManYen * 10000;
  const affordable = prices.filter((p) => p <= limitYen).length;
  return (affordable / prices.length) * 100;
}

/** 取引価格を数値配列に変換（無効値・0円を除外） */
export function parseTradePrices(
  trades: ReadonlyArray<ReinfoTradeRecord>
): ReadonlyArray<number> {
  return trades
    .map((t) => Number(t.TradePrice))
    .filter((p) => Number.isFinite(p) && p > 0);
}

/** 分位数計算（線形補間） */
function quantile(sorted: ReadonlyArray<number>, p: number): number {
  if (sorted.length === 1) {
    return sorted[0];
  }
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

/** 統計値を計算（中央値、Q25、Q75）。空配列の場合は null */
export function calculatePriceStats(
  prices: ReadonlyArray<number>,
  year: string
): CondoPriceStats | null {
  if (prices.length === 0) {
    return null;
  }

  const sorted = [...prices].sort((a, b) => a - b);

  return {
    median: quantile(sorted, 0.5),
    q25: quantile(sorted, 0.25),
    q75: quantile(sorted, 0.75),
    count: sorted.length,
    year,
  };
}
