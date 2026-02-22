import type { EstatApiClient, GetStatsDataParams } from "./client";
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
import { getCityLocation } from "../reinfo/city-locations";
import { nearestTerminalDistanceKm } from "../station/terminal-stations";
import { countStationsByAreaCode } from "../station/stations";

/** 交通統計の設定 */
export interface TransportDataConfig {
  /** e-Stat の statsDataId（社会・人口統計体系 C経済基盤） */
  readonly statsDataId: string;
  /** 時間コード（省略時は最新年を自動選択） */
  readonly timeCode?: string;
}

/** 都市ごとの交通統計結果 */
export interface TransportStats {
  /** 鉄道駅数（人口1万人あたり） */
  readonly stationCountPerCapita: number | null;
  /** 最寄りターミナル駅距離(km) */
  readonly terminalAccessKm: number | null;
  /** データの年 */
  readonly dataYear: string;
}

/** 交通関連の指標を自動検出するスコアリング */
function transportIndicatorScore(name: string): { type: "station_count"; score: number } | null {
  const normalized = normalizeLabel(name);
  if (normalized.includes("鉄道") && normalized.includes("駅") && normalized.includes("数")) {
    return { type: "station_count", score: normalized === "鉄道駅数" ? 100 : 80 };
  }
  if (normalized.includes("JR") && normalized.includes("駅") && normalized.includes("数")) {
    return { type: "station_count", score: 60 };
  }
  if (normalized.includes("私鉄") && normalized.includes("駅") && normalized.includes("数")) {
    return { type: "station_count", score: 60 };
  }
  if (normalized === "駅数") {
    return { type: "station_count", score: 70 };
  }
  return null;
}

interface IndicatorSelection {
  readonly classId: string;
  readonly paramName: string;
  readonly stationCountCode: string | null;
}

/** 指標分類から鉄道駅数のコードを検出する */
function resolveTransportIndicators(
  classObjs: ReadonlyArray<{ id: string; name: string; items: ReadonlyArray<{ code: string; name: string }> }>,
): IndicatorSelection | null {
  const indicatorClasses = classObjs.filter(
    (c) => c.id.startsWith("cat") || c.id === "tab",
  );

  for (const cls of indicatorClasses) {
    let stationCountCode: string | null = null;
    let bestScore = 0;

    for (const item of cls.items) {
      const result = transportIndicatorScore(item.name);
      if (!result) continue;

      if (result.score > bestScore) {
        stationCountCode = item.code;
        bestScore = result.score;
      }
    }

    if (stationCountCode) {
      return {
        classId: cls.id,
        paramName: toCdParamName(cls.id),
        stationCountCode,
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
 * 複数都市の交通統計データを構築する。
 *
 * 1. e-Stat「社会・人口統計体系」から鉄道駅数を取得し、人口1万人あたりに変換
 * 2. 市区町村の代表地点から最寄りターミナル駅までのHaversine距離を算出
 *
 * e-Statから駅数が取得できない場合は、静的駅DBのareaCode集計でフォールバックする。
 */
export async function buildTransportData(
  client: EstatApiClient,
  areaCodes: ReadonlyArray<string>,
  config: TransportDataConfig,
  populationMap?: ReadonlyMap<string, number>,
): Promise<ReadonlyMap<string, TransportStats>> {
  const result = new Map<string, TransportStats>();

  if (areaCodes.length === 0) {
    return result;
  }

  // 区再編対応: 新コード → 旧コードへの展開
  const { expandedCodes, newToOldMapping } = expandAreaCodes(areaCodes);

  // ターミナル距離は常に算出可能
  const terminalDistances = new Map<string, number>();
  for (const areaCode of areaCodes) {
    const location = getCityLocation(areaCode);
    if (location) {
      const distKm = nearestTerminalDistanceKm(location.lat, location.lng);
      terminalDistances.set(areaCode, Math.round(distKm * 10) / 10);
    }
  }

  // e-Statから鉄道駅数を取得
  let estatStationCounts = new Map<string, number | null>();
  let dataYear = "static";

  try {
    const metaInfo = await client.getMetaInfo(config.statsDataId);
    const classObjs = extractClassObjects(metaInfo);
    const indicators = resolveTransportIndicators(classObjs);

    if (indicators) {
      const timeCandidates = config.timeCode
        ? [resolveLatestTime(classObjs, config.timeCode)]
        : resolveTimeCandidates(classObjs).slice(0, MAX_TIME_FALLBACK);

      if (timeCandidates.length > 0) {
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
          dataYear = timeSelection.code.replace(/\D/g, "").slice(0, 4);

          const queryParams: GetStatsDataParams = {
            statsDataId: config.statsDataId,
            cdArea: expandedCodes.join(","),
            cdTime: timeSelection.code,
            [indicators.paramName]: indicators.stationCountCode!,
            ...extraParams,
          };

          const response = await client.getStatsData(queryParams);
          const values = extractDataValues(response);
          estatStationCounts = valuesByArea(values, timeSelection.code);

          // 区再編: 旧コードの駅数を新コードに合算
          if (newToOldMapping.size > 0) {
            aggregateRawValues(estatStationCounts, newToOldMapping);
          }

          if (estatStationCounts.size > 0) {
            if (timeSelection !== timeCandidates[0]) {
              console.warn(
                `[info] 交通統計: 最新年(${timeCandidates[0].label})にデータがないため、${timeSelection.label}のデータを使用します。`,
              );
            }
            break;
          }
        }

        if (estatStationCounts.size === 0) {
          const triedYears = timeCandidates.map((t) => t.label).join(", ");
          console.warn(`[warn] 交通統計: e-Statから駅数データが取得できませんでした（${triedYears}を試行）。静的駅DBで代替します。`);
        }
      }
    } else {
      console.warn("[warn] 交通指標の分類を自動検出できませんでした。静的駅DBで代替します。");
    }
  } catch (err) {
    console.warn(
      `[warn] e-Stat交通統計の取得に失敗しました: ${err instanceof Error ? err.message : String(err)}。静的駅DBで代替します。`,
    );
  }

  // e-Statデータが取得できなかった場合、静的駅DBでフォールバック
  if (estatStationCounts.size === 0) {
    const staticCounts = countStationsByAreaCode();
    // 静的DBにも旧コードで集約を試みる
    const staticMap = new Map<string, number | null>();
    for (const areaCode of expandedCodes) {
      const count = staticCounts.get(areaCode);
      if (count !== undefined) {
        staticMap.set(areaCode, count);
      }
    }
    if (newToOldMapping.size > 0) {
      aggregateRawValues(staticMap, newToOldMapping);
    }
    for (const areaCode of areaCodes) {
      const count = staticMap.get(areaCode);
      if (count !== undefined && count !== null) {
        estatStationCounts.set(areaCode, count);
      }
    }
    dataYear = "static";
  }

  // 結果を構築
  for (const areaCode of areaCodes) {
    const rawStationCount = estatStationCounts.get(areaCode) ?? null;
    const population = populationMap?.get(areaCode);
    const stationCountPerCapita = perCapita(rawStationCount, population);
    const terminalAccessKm = terminalDistances.get(areaCode) ?? null;

    if (stationCountPerCapita === null && terminalAccessKm === null) continue;

    result.set(areaCode, {
      stationCountPerCapita,
      terminalAccessKm,
      dataYear,
    });
  }

  return result;
}
