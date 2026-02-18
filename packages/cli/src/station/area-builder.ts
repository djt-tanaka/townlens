/**
 * 駅圏ビルダーモジュール。
 * 駅の位置情報 + メッシュ人口データ → 駅圏集約データ → ReportRow 変換。
 */

import type { CityIndicators, IndicatorValue, ReportRow } from "@townlens/core";
import type { MeshDataPoint } from "../mesh/types";

/** 駅圏の入力パラメータ */
export interface StationAreaInput {
  readonly stationName: string;
  readonly meshCodes: ReadonlyArray<string>;
  readonly lat: number;
  readonly lng: number;
  readonly areaCode?: string;
}

/** 駅圏のメッシュデータを集約して ReportRow 配列を構築する */
export function buildStationAreaRows(
  stationAreas: ReadonlyArray<StationAreaInput>,
  meshData: ReadonlyMap<string, MeshDataPoint>,
  radiusM: number,
): ReadonlyArray<ReportRow> {
  const baseRows = stationAreas.map((area) => {
    let totalPopulation = 0;
    let totalKids = 0;

    for (const meshCode of area.meshCodes) {
      const point = meshData.get(meshCode);
      if (point?.population !== undefined) {
        totalPopulation += point.population;
      }
      if (point?.kidsPopulation !== undefined) {
        totalKids += point.kidsPopulation;
      }
    }

    const ratio = totalPopulation > 0
      ? (totalKids / totalPopulation) * 100
      : 0;

    return {
      cityInput: area.stationName,
      cityResolved: `${area.stationName}駅 ${radiusM}m圏`,
      areaCode: area.areaCode ?? `station_${area.stationName}`,
      total: totalPopulation,
      kids: totalKids,
      ratio: Math.round(ratio * 100) / 100,
      totalRank: 0,
      ratioRank: 0,
    };
  });

  const totalSorted = [...baseRows].sort((a, b) => b.total - a.total);
  const ratioSorted = [...baseRows].sort((a, b) => b.ratio - a.ratio);

  return baseRows.map((row) => ({
    ...row,
    totalRank: totalSorted.findIndex((r) => r.areaCode === row.areaCode) + 1,
    ratioRank: ratioSorted.findIndex((r) => r.areaCode === row.areaCode) + 1,
  }));
}

/** ReportRow 配列からスコアリング入力を構築する */
export function stationRowsToScoringInput(
  rows: ReadonlyArray<ReportRow>,
  dataYear: string,
  statsDataId: string,
): ReadonlyArray<CityIndicators> {
  return rows.map((row) => {
    const indicators: IndicatorValue[] = [
      {
        indicatorId: "population_total",
        rawValue: row.total,
        dataYear,
        sourceId: statsDataId,
      },
      {
        indicatorId: "kids_ratio",
        rawValue: row.ratio,
        dataYear,
        sourceId: statsDataId,
      },
    ];
    return {
      cityName: row.cityResolved,
      areaCode: row.areaCode,
      indicators,
    };
  });
}
