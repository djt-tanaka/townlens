import { EstatApiClient, GetStatsDataParams } from "./client";
import {
  extractClassObjects,
  resolveDefaultFilters,
  resolveTimeCandidates,
  resolveLatestTime,
  extractDataValues,
  valuesByArea,
} from "./meta";
import {
  expandAreaCodes,
  aggregateRawValues,
} from "./meta/ward-reorganization";
import { toCdParamName } from "../utils";
import { normalizeLabel } from "../normalize/label";

/** 教育統計の設定 */
export interface EducationDataConfig {
  /** e-Stat の statsDataId（社会・人口統計体系 E教育） */
  readonly statsDataId: string;
  /** 時間コード（省略時は最新年を自動選択） */
  readonly timeCode?: string;
}

/** 都市ごとの教育統計結果 */
export interface EducationStats {
  /** 小学校数（人口1万人あたり） */
  readonly elementarySchoolsPerCapita: number | null;
  /** 中学校数（人口1万人あたり） */
  readonly juniorHighSchoolsPerCapita: number | null;
  /** データの年 */
  readonly dataYear: string;
}

/** 教育関連の指標を自動検出するスコアリング */
function educationIndicatorScore(name: string): { type: "elementary" | "junior_high"; score: number } | null {
  const normalized = normalizeLabel(name);
  if (normalized.includes("小学校") && normalized.includes("数")) {
    return { type: "elementary", score: normalized === "小学校数" ? 100 : 80 };
  }
  if (normalized.includes("中学校") && normalized.includes("数")) {
    return { type: "junior_high", score: normalized === "中学校数" ? 100 : 80 };
  }
  return null;
}

interface IndicatorSelection {
  readonly classId: string;
  readonly paramName: string;
  readonly elementaryCode: string | null;
  readonly juniorHighCode: string | null;
}

/** 指標分類（catXX / tab）から小学校数・中学校数のコードを検出する */
function resolveEducationIndicators(
  classObjs: ReadonlyArray<{ id: string; name: string; items: ReadonlyArray<{ code: string; name: string }> }>,
): IndicatorSelection | null {
  const indicatorClasses = classObjs.filter(
    (c) => c.id.startsWith("cat") || c.id === "tab",
  );

  for (const cls of indicatorClasses) {
    let elementaryCode: string | null = null;
    let juniorHighCode: string | null = null;
    let bestElementaryScore = 0;
    let bestJuniorHighScore = 0;

    for (const item of cls.items) {
      const result = educationIndicatorScore(item.name);
      if (!result) continue;

      if (result.type === "elementary" && result.score > bestElementaryScore) {
        elementaryCode = item.code;
        bestElementaryScore = result.score;
      }
      if (result.type === "junior_high" && result.score > bestJuniorHighScore) {
        juniorHighCode = item.code;
        bestJuniorHighScore = result.score;
      }
    }

    if (elementaryCode || juniorHighCode) {
      return {
        classId: cls.id,
        paramName: toCdParamName(cls.id),
        elementaryCode,
        juniorHighCode,
      };
    }
  }

  return null;
}

/** メタ情報のtimeコード最新年にデータがない場合、最大何年まで遡るか */
const MAX_TIME_FALLBACK = 5;

/** 人口1万人あたりに変換する */
function perCapita(value: number | null, population: number | undefined): number | null {
  if (value === null || !population || population <= 0) return null;
  return (value / population) * 10000;
}

/**
 * 複数都市の教育統計データを構築する。
 * e-Stat「社会・人口統計体系」から小学校数・中学校数を取得し、
 * 人口1万人あたりに変換する。
 *
 * メタ情報上の最新年にデータが存在しないケースに対応するため、
 * データが0件の場合は前年へ自動フォールバックする。
 */
export async function buildEducationData(
  client: EstatApiClient,
  areaCodes: ReadonlyArray<string>,
  config: EducationDataConfig,
  populationMap?: ReadonlyMap<string, number>,
): Promise<ReadonlyMap<string, EducationStats>> {
  const result = new Map<string, EducationStats>();

  if (areaCodes.length === 0) {
    return result;
  }

  // 区再編対応: 新コード → 旧コードへの展開
  const { expandedCodes, newToOldMapping } = expandAreaCodes(areaCodes);

  const metaInfo = await client.getMetaInfo(config.statsDataId);
  const classObjs = extractClassObjects(metaInfo);

  const indicators = resolveEducationIndicators(classObjs);

  if (!indicators) {
    console.warn("[warn] 教育指標の分類を自動検出できませんでした。");
    return result;
  }

  const timeCandidates = config.timeCode
    ? [resolveLatestTime(classObjs, config.timeCode)]
    : resolveTimeCandidates(classObjs).slice(0, MAX_TIME_FALLBACK);

  if (timeCandidates.length === 0) {
    console.warn("[warn] 教育統計: 時間軸を特定できませんでした。");
    return result;
  }

  const excludeIds = new Set([
    "area",
    "time",
    timeCandidates[0].classId,
    indicators.classId,
  ]);
  const extraFilters = resolveDefaultFilters(classObjs, excludeIds);
  const extraParams = Object.fromEntries(
    extraFilters.map((f) => [f.paramName, f.code]),
  );

  for (const timeSelection of timeCandidates) {
    const dataYear = timeSelection.code.replace(/\D/g, "").slice(0, 4);

    // 小学校数と中学校数のデータを取得（展開済みコードで問い合わせ）
    const elementaryMap = indicators.elementaryCode
      ? await fetchIndicator(client, config.statsDataId, expandedCodes, timeSelection.code, indicators, indicators.elementaryCode, extraParams)
      : new Map<string, number | null>();

    const juniorHighMap = indicators.juniorHighCode
      ? await fetchIndicator(client, config.statsDataId, expandedCodes, timeSelection.code, indicators, indicators.juniorHighCode, extraParams)
      : new Map<string, number | null>();

    // 区再編: 旧コードの実数を新コードに合算
    if (newToOldMapping.size > 0) {
      aggregateRawValues(elementaryMap, newToOldMapping);
      aggregateRawValues(juniorHighMap, newToOldMapping);
    }

    if (elementaryMap.size === 0 && juniorHighMap.size === 0) {
      continue;
    }

    for (const areaCode of areaCodes) {
      const elementary = elementaryMap.get(areaCode) ?? null;
      const juniorHigh = juniorHighMap.get(areaCode) ?? null;

      if (elementary === null && juniorHigh === null) continue;

      const population = populationMap?.get(areaCode);

      result.set(areaCode, {
        elementarySchoolsPerCapita: perCapita(elementary, population),
        juniorHighSchoolsPerCapita: perCapita(juniorHigh, population),
        dataYear,
      });
    }

    if (result.size > 0) {
      if (timeSelection !== timeCandidates[0]) {
        console.warn(
          `[info] 教育統計: 最新年(${timeCandidates[0].label})にデータがないため、${timeSelection.label}のデータを使用します。`,
        );
      }
      return result;
    }
  }

  const triedYears = timeCandidates.map((t) => t.label).join(", ");
  console.warn(`[warn] 教育統計: ${triedYears} を試しましたがデータが見つかりませんでした。`);

  return result;
}

/** 単一指標のデータを取得する */
async function fetchIndicator(
  client: EstatApiClient,
  statsDataId: string,
  areaCodes: ReadonlyArray<string>,
  timeCode: string,
  indicators: IndicatorSelection,
  indicatorCode: string,
  extraParams: Record<string, string>,
): Promise<Map<string, number | null>> {
  const queryParams: GetStatsDataParams = {
    statsDataId,
    cdArea: areaCodes.join(","),
    cdTime: timeCode,
    [indicators.paramName]: indicatorCode,
    ...extraParams,
  };

  const response = await client.getStatsData(queryParams);
  const values = extractDataValues(response);
  return valuesByArea(values, timeCode);
}
