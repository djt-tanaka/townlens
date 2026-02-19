import type { ReportRow, IndicatorDefinition } from "@townlens/core";

const jaNumberFormat = new Intl.NumberFormat("ja-JP");

/** 指標IDからReportRowの実値を取得する */
export function getRawValue(
  indicatorId: string,
  rawRow: ReportRow,
): number | null | undefined {
  const mapping: Record<string, () => number | null | undefined> = {
    population_total: () => rawRow.total,
    kids_ratio: () => rawRow.ratio,
    condo_price_median: () => rawRow.condoPriceMedian,
    crime_rate: () => rawRow.crimeRate,
    flood_risk: () => {
      if (rawRow.floodRisk == null && rawRow.landslideRisk == null)
        return undefined;
      return (rawRow.floodRisk ? 1 : 0) + (rawRow.landslideRisk ? 1 : 0);
    },
    evacuation_sites: () => rawRow.evacuationSiteCount,
  };
  return mapping[indicatorId]?.() ?? undefined;
}

/** 実値をフォーマットして文字列化する */
export function formatRawValue(
  raw: number | null | undefined,
  def: IndicatorDefinition,
): string {
  if (raw === null || raw === undefined) return "-";
  return def.precision === 0 ? jaNumberFormat.format(raw) : raw.toFixed(def.precision);
}

/** スコアに応じた色を返す */
export function getScoreColorHex(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#f43f5e";
}

/** 信頼度レベルに応じたバッジスタイルを返す */
export function getConfidenceStyle(level: string): {
  backgroundColor: string;
  color: string;
} {
  if (level === "high") return { backgroundColor: "#dcfce7", color: "#166534" };
  if (level === "medium")
    return { backgroundColor: "#fef3c7", color: "#92400e" };
  return { backgroundColor: "#fee2e2", color: "#991b1b" };
}

/** 信頼度の日本語ラベル */
export function getConfidenceLabel(level: string): string {
  if (level === "high") return "信頼度: 高";
  if (level === "medium") return "信頼度: 中";
  return "信頼度: 低";
}
