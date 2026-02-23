/**
 * ReportRow の指標値マッピングユーティリティ。
 * narrative（ナラティブ生成）と CLI テンプレートの両方で使用される。
 */

import type { ReportRow } from "./types";

/** 指標IDからReportRowの実値を取得する */
export function getRawValueFromRow(
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
    elementary_schools_per_capita: () => rawRow.elementarySchoolsPerCapita,
    junior_high_schools_per_capita: () => rawRow.juniorHighSchoolsPerCapita,
    station_count_per_capita: () => rawRow.stationCountPerCapita,
    terminal_access_km: () => rawRow.terminalAccessKm,
    hospitals_per_capita: () => rawRow.hospitalsPerCapita,
    clinics_per_capita: () => rawRow.clinicsPerCapita,
    pediatrics_per_capita: () => rawRow.pediatricsPerCapita,
  };
  return mapping[indicatorId]?.() ?? undefined;
}

/** cityName/areaCode で ReportRow を検索する */
export function findRawRow(
  cityName: string,
  areaCode: string,
  rawRows: ReadonlyArray<ReportRow>,
): ReportRow | undefined {
  return rawRows.find(
    (r) => r.areaCode === areaCode || r.cityResolved === cityName,
  );
}
