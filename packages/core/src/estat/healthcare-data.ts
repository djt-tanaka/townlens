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

/** 医療統計の設定 */
export interface HealthcareDataConfig {
  /** e-Stat の statsDataId（社会・人口統計体系 I健康・医療） */
  readonly statsDataId: string;
  /** 時間コード（省略時は最新年を自動選択） */
  readonly timeCode?: string;
}

/** 都市ごとの医療統計結果 */
export interface HealthcareStats {
  /** 一般病院数（人口10万人あたり） */
  readonly hospitalsPerCapita: number | null;
  /** 一般診療所数（人口10万人あたり） */
  readonly clinicsPerCapita: number | null;
  /** 小児科標榜施設数（人口10万人あたり） */
  readonly pediatricsPerCapita: number | null;
  /** データの年 */
  readonly dataYear: string;
}

/** 医療関連の指標を自動検出するスコアリング */
function healthcareIndicatorScore(
  name: string,
): { type: "hospital" | "clinic" | "pediatrics"; score: number } | null {
  const normalized = normalizeLabel(name);
  if (normalized.includes("一般病院") && normalized.includes("数")) {
    return { type: "hospital", score: normalized === "一般病院数" ? 100 : 80 };
  }
  if (normalized.includes("一般診療所") && normalized.includes("数")) {
    return { type: "clinic", score: normalized === "一般診療所数" ? 100 : 80 };
  }
  if (normalized.includes("小児科") && normalized.includes("標榜")) {
    return { type: "pediatrics", score: 100 };
  }
  if (normalized.includes("小児科") && normalized.includes("施設")) {
    return { type: "pediatrics", score: 80 };
  }
  return null;
}

interface IndicatorSelection {
  readonly classId: string;
  readonly paramName: string;
  readonly hospitalCode: string | null;
  readonly clinicCode: string | null;
  readonly pediatricsCode: string | null;
}

/** 指標分類（catXX / tab）から病院数・診療所数・小児科のコードを検出する */
function resolveHealthcareIndicators(
  classObjs: ReadonlyArray<{
    id: string;
    name: string;
    items: ReadonlyArray<{ code: string; name: string }>;
  }>,
): IndicatorSelection | null {
  const indicatorClasses = classObjs.filter(
    (c) => c.id.startsWith("cat") || c.id === "tab",
  );

  for (const cls of indicatorClasses) {
    let hospitalCode: string | null = null;
    let clinicCode: string | null = null;
    let pediatricsCode: string | null = null;
    let bestHospitalScore = 0;
    let bestClinicScore = 0;
    let bestPediatricsScore = 0;

    for (const item of cls.items) {
      const result = healthcareIndicatorScore(item.name);
      if (!result) continue;

      if (result.type === "hospital" && result.score > bestHospitalScore) {
        hospitalCode = item.code;
        bestHospitalScore = result.score;
      }
      if (result.type === "clinic" && result.score > bestClinicScore) {
        clinicCode = item.code;
        bestClinicScore = result.score;
      }
      if (result.type === "pediatrics" && result.score > bestPediatricsScore) {
        pediatricsCode = item.code;
        bestPediatricsScore = result.score;
      }
    }

    if (hospitalCode || clinicCode || pediatricsCode) {
      return {
        classId: cls.id,
        paramName: toCdParamName(cls.id),
        hospitalCode,
        clinicCode,
        pediatricsCode,
      };
    }
  }

  return null;
}

/** メタ情報のtimeコード最新年にデータがない場合、最大何年まで遡るか */
const MAX_TIME_FALLBACK = 5;

/** 人口10万人あたりに変換する */
function perCapita(
  value: number | null,
  population: number | undefined,
): number | null {
  if (value === null || !population || population <= 0) return null;
  return (value / population) * 100_000;
}

/**
 * 複数都市の医療統計データを構築する。
 * e-Stat「社会・人口統計体系」から一般病院数・一般診療所数・小児科標榜施設数を取得し、
 * 人口10万人あたりに変換する。
 *
 * メタ情報上の最新年にデータが存在しないケースに対応するため、
 * データが0件の場合は前年へ自動フォールバックする。
 */
export async function buildHealthcareData(
  client: EstatApiClient,
  areaCodes: ReadonlyArray<string>,
  config: HealthcareDataConfig,
  populationMap?: ReadonlyMap<string, number>,
): Promise<ReadonlyMap<string, HealthcareStats>> {
  const result = new Map<string, HealthcareStats>();

  if (areaCodes.length === 0) {
    return result;
  }

  // 区再編対応: 新コード → 旧コードへの展開
  const { expandedCodes, newToOldMapping } = expandAreaCodes(areaCodes);

  const metaInfo = await client.getMetaInfo(config.statsDataId);
  const classObjs = extractClassObjects(metaInfo);

  const indicators = resolveHealthcareIndicators(classObjs);

  if (!indicators) {
    console.warn("[warn] 医療指標の分類を自動検出できませんでした。");
    return result;
  }

  const timeCandidates = config.timeCode
    ? [resolveLatestTime(classObjs, config.timeCode)]
    : resolveTimeCandidates(classObjs).slice(0, MAX_TIME_FALLBACK);

  if (timeCandidates.length === 0) {
    console.warn("[warn] 医療統計: 時間軸を特定できませんでした。");
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

    const hospitalMap = indicators.hospitalCode
      ? await fetchIndicator(
          client,
          config.statsDataId,
          expandedCodes,
          timeSelection.code,
          indicators,
          indicators.hospitalCode,
          extraParams,
        )
      : new Map<string, number | null>();

    const clinicMap = indicators.clinicCode
      ? await fetchIndicator(
          client,
          config.statsDataId,
          expandedCodes,
          timeSelection.code,
          indicators,
          indicators.clinicCode,
          extraParams,
        )
      : new Map<string, number | null>();

    const pediatricsMap = indicators.pediatricsCode
      ? await fetchIndicator(
          client,
          config.statsDataId,
          expandedCodes,
          timeSelection.code,
          indicators,
          indicators.pediatricsCode,
          extraParams,
        )
      : new Map<string, number | null>();

    // 区再編: 旧コードの実数を新コードに合算
    if (newToOldMapping.size > 0) {
      aggregateRawValues(hospitalMap, newToOldMapping);
      aggregateRawValues(clinicMap, newToOldMapping);
      aggregateRawValues(pediatricsMap, newToOldMapping);
    }

    if (
      hospitalMap.size === 0 &&
      clinicMap.size === 0 &&
      pediatricsMap.size === 0
    ) {
      continue;
    }

    for (const areaCode of areaCodes) {
      const hospital = hospitalMap.get(areaCode) ?? null;
      const clinic = clinicMap.get(areaCode) ?? null;
      const pediatrics = pediatricsMap.get(areaCode) ?? null;

      if (hospital === null && clinic === null && pediatrics === null) continue;

      const population = populationMap?.get(areaCode);

      result.set(areaCode, {
        hospitalsPerCapita: perCapita(hospital, population),
        clinicsPerCapita: perCapita(clinic, population),
        pediatricsPerCapita: perCapita(pediatrics, population),
        dataYear,
      });
    }

    if (result.size > 0) {
      if (timeSelection !== timeCandidates[0]) {
        console.warn(
          `[info] 医療統計: 最新年(${timeCandidates[0].label})にデータがないため、${timeSelection.label}のデータを使用します。`,
        );
      }
      return result;
    }
  }

  const triedYears = timeCandidates.map((t) => t.label).join(", ");
  console.warn(
    `[warn] 医療統計: ${triedYears} を試しましたがデータが見つかりませんでした。`,
  );

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
