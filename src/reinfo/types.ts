/** XIT001 レスポンスの取引レコード */
export interface ReinfoTradeRecord {
  readonly Type: string;
  readonly TradePrice: string;
  readonly Area: string;
  readonly BuildingYear: string;
  readonly FloorPlan: string;
  readonly Prefecture: string;
  readonly Municipality: string;
  readonly DistrictName: string;
  readonly PricePerUnit?: string;
  readonly NearestStation?: string;
  readonly TimeToNearestStation?: string;
  readonly TotalFloorArea?: string;
  readonly CityCode?: string;
  readonly PrefectureCode?: string;
}

/** XIT001 APIレスポンス */
export interface ReinfoTradeResponse {
  readonly status: string;
  readonly data: ReadonlyArray<ReinfoTradeRecord>;
}

/** XIT002 レスポンスの市区町村レコード */
export interface ReinfoCityRecord {
  readonly id: string;
  readonly name: string;
}

/** 物件タイプ */
export type PropertyType = "condo" | "house" | "land" | "all";

/** 物件タイプ → API Type値のマッピング */
export const PROPERTY_TYPE_LABELS: Readonly<Record<PropertyType, string>> = {
  condo: "中古マンション等",
  house: "中古戸建住宅",
  land: "宅地(土地)",
  all: "全種別",
} as const;

/** 取引価格の統計結果 */
export interface CondoPriceStats {
  readonly median: number;
  readonly q25: number;
  readonly q75: number;
  readonly count: number;
  readonly year: string;
  /** 予算上限内の取引割合(%) */
  readonly affordabilityRate?: number;
  /** 物件タイプラベル */
  readonly propertyTypeLabel?: string;
}
