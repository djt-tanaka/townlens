import type { IndicatorCategory } from "../scoring/types";

/** スコア分類の閾値 */
export const STRONG_THRESHOLD = 70;
export const WEAK_THRESHOLD = 30;
export const CLOSE_GAP = 5;
export const LARGE_GAP = 20;

/** カテゴリの日本語ラベル */
export const CATEGORY_LABELS: Readonly<Record<IndicatorCategory, string>> = {
  childcare: "子育て",
  price: "住宅価格",
  safety: "安全",
  disaster: "災害",
  transport: "交通",
  education: "教育",
  healthcare: "医療",
};
