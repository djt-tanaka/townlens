import { EstatApiClient, GetStatsDataParams } from "./client";
import {
  extractClassObjects,
  resolveDefaultFilters,
  resolveLatestTime,
  resolveTimeCandidates,
  extractDataValues,
  valuesByArea,
} from "./meta";
import {
  expandAreaCodes,
  expandPopulationMap,
  aggregateRawValues,
  aggregatePerCapitaValues,
} from "./meta/ward-reorganization";
import { arrify, textFrom, toCdParamName } from "../utils";
import { normalizeLabel } from "../normalize/label";

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

/** 「千人当たり」「千人当り」など人口比率ラベルの検出 */
function isPerCapitaLabel(normalized: string): boolean {
  return (
    normalized.includes("千人当たり") ||
    normalized.includes("千人当り") ||
    normalized.includes("1000人当")
  );
}

/**
 * 犯罪関連の指標を自動検出するスコアリング。
 * 「千人当たり」（人口比率）を含む指標にはボーナスを加算し、
 * 実数（総件数）より優先して選択されるようにする。
 */
function crimeIndicatorScore(name: string): number {
  const normalized = normalizeLabel(name);
  const perCapitaBonus = isPerCapitaLabel(normalized) ? 10 : 0;
  if (normalized.includes("刑法犯") && normalized.includes("認知件数")) {
    return 100 + perCapitaBonus;
  }
  if (normalized.includes("刑法犯")) {
    return 80 + perCapitaBonus;
  }
  if (normalized.includes("犯罪") && normalized.includes("件数")) {
    return 70 + perCapitaBonus;
  }
  if (normalized.includes("犯罪")) {
    return 50 + perCapitaBonus;
  }
  return 0;
}

/** 指標分類（catXX / tab）を検出する */
function resolveIndicatorClass(
  classObjs: ReadonlyArray<{ id: string; name: string; items: ReadonlyArray<{ code: string; name: string }> }>,
  explicitCode?: string,
): { classId: string; paramName: string; code: string; indicatorName: string } | null {
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
        return { classId: cls.id, paramName: toCdParamName(cls.id), code: matched.code, indicatorName: matched.name };
      }
    }

    const scored = cls.items
      .map((item) => ({ ...item, score: crimeIndicatorScore(item.name) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return { classId: cls.id, paramName: toCdParamName(cls.id), code: scored[0].code, indicatorName: scored[0].name };
    }
  }

  return null;
}

/**
 * 「千人当たり」（人口比率）の分類項目を優先検出する。
 *
 * e-Stat「社会・人口統計体系」の K安全データでは、指標が tab クラスに格納され、
 * cat01 クラスに "実数" / "人口千人当たり" の区分がある。
 * resolveDefaultFilters は "実数" を選択してしまうため、犯罪統計では
 * "千人当たり" を明示的に優先する必要がある。
 */
function resolvePerCapitaOverrides(
  classObjs: ReadonlyArray<{ id: string; name: string; items: ReadonlyArray<{ code: string; name: string }> }>,
  excludeClassIds: ReadonlySet<string>,
): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const cls of classObjs) {
    if (excludeClassIds.has(cls.id)) continue;
    if (!cls.id.startsWith("cat") && cls.id !== "tab") continue;

    const perCapitaItem = cls.items.find(
      (item) => isPerCapitaLabel(normalizeLabel(item.name)),
    );
    if (perCapitaItem) {
      overrides[toCdParamName(cls.id)] = perCapitaItem.code;
    }
  }
  return overrides;
}

/** メタ情報のtimeコード最新年にデータがない場合、最大何年まで遡るか */
const MAX_TIME_FALLBACK = 5;

/**
 * 選択された指標・分類の組み合わせから、値が「千人当たり」として
 * 既に正規化されているかどうかを判定する。
 *
 * 以下のいずれかが真の場合は千人当たり:
 * - 指標名（tab/cat の項目名）に「千人当たり」系の文字列が含まれる
 * - resolvePerCapitaOverrides で千人当たり分類が選択されている
 */
function isAlreadyPerCapita(
  indicatorName: string | undefined,
  perCapitaOverrides: Record<string, string>,
): boolean {
  if (indicatorName && isPerCapitaLabel(normalizeLabel(indicatorName))) {
    return true;
  }
  return Object.keys(perCapitaOverrides).length > 0;
}

/**
 * 複数都市の犯罪統計データを構築する。
 * e-Stat「社会・人口統計体系」等から刑法犯認知件数（千人当たり）を取得する。
 *
 * API のメタ情報に「千人当たり」指標・分類が存在する場合はそれを優先選択する。
 * 存在しない場合（実数のみ）は、populationMap を使って千人当たりに変換する。
 *
 * メタ情報上の最新年にデータが存在しないケースがあるため（例: time分類に2009年度が
 * あるが K4201 のデータは2008年度まで）、データが0件の場合は前年へ自動フォールバックする。
 */
export async function buildCrimeData(
  client: EstatApiClient,
  areaCodes: ReadonlyArray<string>,
  config: CrimeDataConfig,
  populationMap?: ReadonlyMap<string, number>,
): Promise<ReadonlyMap<string, CrimeStats>> {
  const result = new Map<string, CrimeStats>();

  if (areaCodes.length === 0) {
    return result;
  }

  // 区再編対応: 新コード → 旧コードへの展開
  const { expandedCodes, newToOldMapping } = expandAreaCodes(areaCodes);
  const expandedPopMap = populationMap
    ? expandPopulationMap(populationMap, newToOldMapping)
    : undefined;

  // キャッシュはクライアントに内蔵されているため、直接getMetaInfoを呼ぶ
  const metaInfo = await client.getMetaInfo(config.statsDataId);
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

  // 「千人当たり」を優先: resolveDefaultFilters は「実数」を選ぶが、
  // 犯罪統計では人口比率が必要
  const perCapitaOverrides = resolvePerCapitaOverrides(classObjs, excludeIds);
  Object.assign(extraParams, perCapitaOverrides);

  // API から得られる値が既に千人当たりか、それとも実数（総件数）かを判定
  const alreadyPerCapita = isAlreadyPerCapita(
    indicatorClass?.indicatorName,
    perCapitaOverrides,
  );

  for (const timeSelection of timeCandidates) {
    const dataYear = timeSelection.code.replace(/\D/g, "").slice(0, 4);

    const queryParams: GetStatsDataParams = {
      statsDataId: config.statsDataId,
      cdArea: expandedCodes.join(","),
      cdTime: timeSelection.code,
      ...(indicatorClass
        ? { [indicatorClass.paramName]: indicatorClass.code }
        : {}),
      ...extraParams,
    };

    const response = await client.getStatsData(queryParams);
    const values = extractDataValues(response);
    const areaMap = valuesByArea(values, timeSelection.code);

    // 区再編: 旧コードデータを新コードに集約
    if (newToOldMapping.size > 0) {
      if (alreadyPerCapita) {
        aggregatePerCapitaValues(areaMap, newToOldMapping);
      } else {
        aggregateRawValues(areaMap, newToOldMapping);
      }
    }

    if (areaMap.size === 0) {
      // この年度にはデータがない → 前の年度を試す
      continue;
    }

    for (const [areaCode, value] of areaMap) {
      if (areaCodes.includes(areaCode) && value !== null) {
        let crimeRate = value;
        if (!alreadyPerCapita) {
          // 実数（総件数）→ 人口千人当たりに変換
          const pop = populationMap?.get(areaCode) ?? expandedPopMap?.get(areaCode);
          if (pop && pop > 0) {
            crimeRate = (value / pop) * 1000;
          } else {
            // 人口データなしでは千人当たりを算出できないためスキップ
            continue;
          }
        }
        result.set(areaCode, {
          crimeRate,
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
      if (!alreadyPerCapita) {
        console.warn(
          "[info] 犯罪統計: 千人当たり指標が見つからなかったため、人口データで千人当たりに変換しました。",
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
