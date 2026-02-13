import { ReinfoApiClient } from "./client";
import { CondoPriceStats, PropertyType, PROPERTY_TYPE_LABELS } from "./types";
import { fetchTradesWithCache } from "./cache";
import {
  filterTradesByType,
  filterByBudgetLimit,
  parseTradePrices,
  calculatePriceStats,
  calculateAffordabilityRate,
} from "./stats";

const INTER_CITY_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 複数都市の取引価格統計を構築する。
 * 都市間に200msのディレイを入れてレート制限を回避する。
 */
export async function buildPriceData(
  client: ReinfoApiClient,
  areaCodes: ReadonlyArray<string>,
  year: string,
  quarter?: string,
  propertyType: PropertyType = "condo",
  budgetLimit?: number,
): Promise<ReadonlyMap<string, CondoPriceStats>> {
  const result = new Map<string, CondoPriceStats>();
  const typeLabel = PROPERTY_TYPE_LABELS[propertyType];

  for (let i = 0; i < areaCodes.length; i++) {
    if (i > 0) {
      await sleep(INTER_CITY_DELAY_MS);
    }

    const code = areaCodes[i];
    const trades = await fetchTradesWithCache(client, {
      year,
      city: code,
      quarter,
    });

    let filtered = filterTradesByType(trades, propertyType);
    if (budgetLimit !== undefined) {
      filtered = filterByBudgetLimit(filtered, budgetLimit);
    }

    const prices = parseTradePrices(filtered);
    const allPricesForAffordability = parseTradePrices(
      filterTradesByType(trades, propertyType),
    );
    const stats = calculatePriceStats(prices, year);

    if (stats !== null) {
      const affordabilityRate =
        budgetLimit !== undefined
          ? calculateAffordabilityRate(allPricesForAffordability, budgetLimit)
          : undefined;

      result.set(code, {
        ...stats,
        affordabilityRate,
        propertyTypeLabel: typeLabel,
      });
    }
  }

  return result;
}
