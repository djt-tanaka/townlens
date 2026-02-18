/**
 * e-Statからメッシュレベルの人口データを取得するモジュール。
 * cdAreaパラメータにメッシュコードを渡して統計値を取得する。
 *
 * バッチ分割: e-Stat APIの cdArea は1リクエスト最大100コードまで。
 * 100コード超の場合はバッチに分割して順次取得する。
 */

import type {
  EstatApiClient,
  SelectorConfig,
  AgeSelection,
  CityIndicators,
  IndicatorValue,
  ReportRow,
} from "@townlens/core";
import {
  extractClassObjects,
  extractDataValues,
  resolveAgeSelection,
  resolveLatestTime,
  valuesByArea,
} from "@townlens/core";
import type { MeshDataPoint } from "./types";

/** cdAreaパラメータの最大コード数（e-Stat API制限） */
const MAX_CD_AREA_CODES = 100;

export interface BuildMeshDataInput {
  readonly client: EstatApiClient;
  readonly statsDataId: string;
  readonly meshCodes: ReadonlyArray<string>;
  readonly metaInfo: any;
  readonly selectors?: SelectorConfig;
  readonly timeCode?: string;
}

export interface BuildMeshDataResult {
  readonly data: ReadonlyMap<string, MeshDataPoint>;
  readonly timeLabel: string;
  readonly totalLabel: string;
  readonly kidsLabel: string;
  readonly ageSelection: AgeSelection;
}

/** メッシュコード配列をバッチサイズで分割する */
function batchCodes(
  codes: ReadonlyArray<string>,
  batchSize: number,
): ReadonlyArray<ReadonlyArray<string>> {
  const batches: ReadonlyArray<string>[] = [];
  for (let i = 0; i < codes.length; i += batchSize) {
    batches.push(codes.slice(i, i + batchSize));
  }
  return batches;
}

/** e-Statからメッシュ人口データを取得する */
export async function buildMeshData(
  input: BuildMeshDataInput,
): Promise<BuildMeshDataResult> {
  const classObjs = extractClassObjects(input.metaInfo);
  const ageSelection = resolveAgeSelection(classObjs, input.selectors);
  const timeSelection = resolveLatestTime(classObjs, input.timeCode);

  const batches = batchCodes(input.meshCodes, MAX_CD_AREA_CODES);

  const totalMap = new Map<string, number>();
  const kidsMap = new Map<string, number>();

  for (const batch of batches) {
    const [totalResponse, kidsResponse] = await Promise.all([
      input.client.getStatsData({
        statsDataId: input.statsDataId,
        cdArea: batch.join(","),
        cdTime: timeSelection.code,
        [ageSelection.paramName]: ageSelection.total.code,
      }),
      input.client.getStatsData({
        statsDataId: input.statsDataId,
        cdArea: batch.join(","),
        cdTime: timeSelection.code,
        [ageSelection.paramName]: ageSelection.kids.code,
      }),
    ]);

    const totalValues = valuesByArea(
      extractDataValues(totalResponse),
      timeSelection.code,
    );
    const kidsValues = valuesByArea(
      extractDataValues(kidsResponse),
      timeSelection.code,
    );

    for (const [code, value] of totalValues) {
      totalMap.set(code, value);
    }
    for (const [code, value] of kidsValues) {
      kidsMap.set(code, value);
    }
  }

  const result = new Map<string, MeshDataPoint>();

  for (const meshCode of input.meshCodes) {
    const population = totalMap.get(meshCode);
    if (population === undefined) {
      continue;
    }

    const kidsPopulation = kidsMap.get(meshCode);
    result.set(meshCode, {
      meshCode,
      population,
      kidsPopulation,
      kidsRatio:
        population > 0 && kidsPopulation !== undefined
          ? (kidsPopulation / population) * 100
          : undefined,
    });
  }

  return {
    data: result,
    timeLabel: `${timeSelection.code} (${timeSelection.label})`,
    totalLabel: ageSelection.total.name,
    kidsLabel: ageSelection.kids.name,
    ageSelection,
  };
}

/** BuildMeshDataResult を ReportRow[] に変換する（既存レンダリングパイプラインとの互換用） */
export function meshDataToReportRows(
  meshCodes: ReadonlyArray<string>,
  meshResult: BuildMeshDataResult,
): ReadonlyArray<ReportRow> {
  const baseRows = meshCodes
    .filter((code) => meshResult.data.has(code))
    .map((code) => {
      const data = meshResult.data.get(code)!;
      return {
        cityInput: code,
        cityResolved: `メッシュ${code}`,
        areaCode: code,
        total: data.population ?? 0,
        kids: data.kidsPopulation ?? 0,
        ratio: data.kidsRatio ?? 0,
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

/** ReportRow配列からスコアリング入力を構築する */
export function meshRowsToScoringInput(
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
