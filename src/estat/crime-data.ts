import { EstatApiClient, GetStatsDataParams } from "./client";
import { loadMetaInfoWithCache } from "./cache";
import {
  extractClassObjects,
  resolveDefaultFilters,
  resolveLatestTime,
  resolveTimeCandidates,
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

/** 指標分類（catXX / tab）を検出する */
function resolveIndicatorClass(
  classObjs: ReadonlyArray<{ id: string; name: string; items: ReadonlyArray<{ code: string; name: string }> }>,
  explicitCode?: string,
): { classId: string; paramName: string; code: string } | null {
  // 社会・人口統計体系等では指標が tab（表章項目）に格納されるケースがある
  const indicatorClasses = classObjs.filter(
    (c) => c.id.startsWith("cat") || c.id === "tab",
  );
  if (indicatorClasses.length === 0) {
    return null;
  }

  for (const cls of indicatorClasses) {
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

/** メタ情報のtimeコード最新年にデータがない場合、最大何年まで遡るか */
const MAX_TIME_FALLBACK = 5;

/**
 * 複数都市の犯罪統計データを構築する。
 * e-Stat「社会・人口統計体系」等から刑法犯認知件数（千人当たり）を取得する。
 *
 * メタ情報上の最新年にデータが存在しないケースがあるため（例: time分類に2009年度が
 * あるが K4201 のデータは2008年度まで）、データが0件の場合は前年へ自動フォールバックする。
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

  if (!indicatorClass) {
    console.warn("[warn] 犯罪指標の分類を自動検出できませんでした。全カテゴリから取得を試みます。");
  }

  // timeCode が明示指定されている場合はフォールバックなしで1回だけ試行
  const timeCandidates = config.timeCode
    ? [resolveLatestTime(classObjs, config.timeCode)]
    : resolveTimeCandidates(classObjs).slice(0, MAX_TIME_FALLBACK);

  if (timeCandidates.length === 0) {
    console.warn("[warn] 犯罪統計: 時間軸を特定できませんでした。");
    return result;
  }

  // area/time/指標分類以外の cat/tab 分類にデフォルトフィルタ（総数・実数等）を適用
  const excludeIds = new Set([
    "area",
    "time",
    timeCandidates[0].classId,
    ...(indicatorClass ? [indicatorClass.classId] : []),
  ]);
  const extraFilters = resolveDefaultFilters(classObjs, excludeIds);
  const extraParams = Object.fromEntries(
    extraFilters.map((f) => [f.paramName, f.code]),
  );

  for (const timeSelection of timeCandidates) {
    const dataYear = timeSelection.code.replace(/\D/g, "").slice(0, 4);

    const queryParams: GetStatsDataParams = {
      statsDataId: config.statsDataId,
      cdArea: areaCodes.join(","),
      cdTime: timeSelection.code,
      ...(indicatorClass
        ? { [indicatorClass.paramName]: indicatorClass.code }
        : {}),
      ...extraParams,
    };

    const response = await client.getStatsData(queryParams);
    const values = extractDataValues(response);
    const areaMap = valuesByArea(values, timeSelection.code);

    if (areaMap.size === 0) {
      // この年度にはデータがない → 前の年度を試す
      continue;
    }

    for (const [areaCode, value] of areaMap) {
      if (areaCodes.includes(areaCode) && value !== null) {
        result.set(areaCode, {
          crimeRate: value,
          dataYear,
        });
      }
    }

    if (result.size > 0) {
      if (timeSelection !== timeCandidates[0]) {
        console.warn(
          `[info] 犯罪統計: 最新年(${timeCandidates[0].label})にデータがないため、${timeSelection.label}のデータを使用します。`,
        );
      }
      return result;
    }

    if (areaMap.size > 0) {
      const sampleAreas = [...areaMap.keys()].slice(0, 5).join(", ");
      console.warn(
        `[warn] 犯罪統計: areaMapに${areaMap.size}件ありますが、対象都市コード(${areaCodes.join(",")})と一致しません。`
        + ` areaMap内のコード例: [${sampleAreas}]`,
      );
    }
  }

  const triedYears = timeCandidates.map((t) => t.label).join(", ");
  console.warn(`[warn] 犯罪統計: ${triedYears} を試しましたがデータが見つかりませんでした。`);

  return result;
}
