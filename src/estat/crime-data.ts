import { EstatApiClient, GetStatsDataParams } from "./client";
import { loadMetaInfoWithCache } from "./cache";
import {
  extractClassObjects,
  resolveAreaClass,
  resolveLatestTime,
  extractDataValues,
  valuesByArea,
} from "./meta";
import { arrify, textFrom, normalizeLabel, toCdParamName } from "../utils";

/** 犯罪統計の設定 */
export interface CrimeDataConfig {
  /** e-Stat の statsDataId（社会・人口統計体系など） */
  readonly statsDataId: string;
  /** 指標の分類コード（省略時は自動検出） */
  readonly indicatorCode?: string;
  /** 時間コード（省略時は最新年を自動選択） */
  readonly timeCode?: string;
}

/** 都市ごとの犯罪統計結果 */
export interface CrimeStats {
  /** 刑法犯認知件数（人口千人当たり） */
  readonly crimeRate: number;
  /** データの年 */
  readonly dataYear: string;
}

/** 犯罪関連の指標を自動検出するスコアリング */
function crimeIndicatorScore(name: string): number {
  const normalized = normalizeLabel(name);
  if (normalized.includes("刑法犯") && normalized.includes("認知件数")) {
    return 100;
  }
  if (normalized.includes("刑法犯")) {
    return 80;
  }
  if (normalized.includes("犯罪") && normalized.includes("件数")) {
    return 70;
  }
  if (normalized.includes("犯罪")) {
    return 50;
  }
  return 0;
}

/** 指標分類（catXX）を検出する */
function resolveIndicatorClass(
  classObjs: ReadonlyArray<{ id: string; name: string; items: ReadonlyArray<{ code: string; name: string }> }>,
  explicitCode?: string,
): { classId: string; paramName: string; code: string } | null {
  const catClasses = classObjs.filter((c) => c.id.startsWith("cat"));
  if (catClasses.length === 0) {
    return null;
  }

  for (const cls of catClasses) {
    if (explicitCode) {
      const matched = cls.items.find((item) => item.code === explicitCode);
      if (matched) {
        return { classId: cls.id, paramName: toCdParamName(cls.id), code: matched.code };
      }
    }

    const scored = cls.items
      .map((item) => ({ ...item, score: crimeIndicatorScore(item.name) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return { classId: cls.id, paramName: toCdParamName(cls.id), code: scored[0].code };
    }
  }

  return null;
}

/**
 * 複数都市の犯罪統計データを構築する。
 * e-Stat「社会・人口統計体系」等から刑法犯認知件数（千人当たり）を取得する。
 */
export async function buildCrimeData(
  client: EstatApiClient,
  areaCodes: ReadonlyArray<string>,
  config: CrimeDataConfig,
): Promise<ReadonlyMap<string, CrimeStats>> {
  const result = new Map<string, CrimeStats>();

  if (areaCodes.length === 0) {
    return result;
  }

  const metaInfo = await loadMetaInfoWithCache(client, config.statsDataId);
  const classObjs = extractClassObjects(metaInfo);

  const indicatorClass = resolveIndicatorClass(classObjs, config.indicatorCode);
  const timeSelection = resolveLatestTime(classObjs, config.timeCode);
  const dataYear = timeSelection.code.replace(/\D/g, "").slice(0, 4);

  if (!indicatorClass) {
    console.warn("[warn] 犯罪指標の分類を自動検出できませんでした。全カテゴリから取得を試みます。");
  }

  const queryParams: GetStatsDataParams = {
    statsDataId: config.statsDataId,
    cdArea: areaCodes.join(","),
    cdTime: timeSelection.code,
  };

  if (indicatorClass) {
    queryParams[indicatorClass.paramName] = indicatorClass.code;
  }

  const response = await client.getStatsData(queryParams);
  const values = extractDataValues(response);
  const areaMap = valuesByArea(values, timeSelection.code);

  if (areaMap.size === 0 && values.length > 0) {
    const sampleTimes = [...new Set(values.slice(0, 20).map((v) => v.time))].join(", ");
    console.warn(
      `[warn] 犯罪統計: ${values.length}件の値が返りましたが、timeCode="${timeSelection.code}" でフィルタ後0件です。`
      + ` サンプルtime値: [${sampleTimes}]`,
    );
  }

  for (const [areaCode, value] of areaMap) {
    if (areaCodes.includes(areaCode) && value !== null) {
      result.set(areaCode, {
        crimeRate: value,
        dataYear,
      });
    }
  }

  if (result.size === 0 && areaMap.size > 0) {
    const sampleAreas = [...areaMap.keys()].slice(0, 5).join(", ");
    console.warn(
      `[warn] 犯罪統計: areaMapに${areaMap.size}件ありますが、対象都市コード(${areaCodes.join(",")})と一致しません。`
      + ` areaMap内のコード例: [${sampleAreas}]`,
    );
  }

  return result;
}
