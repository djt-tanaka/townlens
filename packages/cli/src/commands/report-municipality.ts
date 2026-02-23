/**
 * 市区町村モードのレポート生成ハンドラ。
 * 人口統計・不動産価格・犯罪統計・災害リスク・教育・交通・医療データを統合してPDFレポートを出力する。
 */

import {
  AppError,
  buildReportData,
  toScoringInput,
  scoreCities,
  POPULATION_INDICATORS,
  PRICE_INDICATORS,
  SAFETY_INDICATORS,
  DISASTER_INDICATORS,
  EDUCATION_INDICATORS,
  TRANSPORT_INDICATORS,
  HEALTHCARE_INDICATORS,
  findPreset,
  CHILDCARE_FOCUSED,
  ReinfoApiClient,
  buildPriceData,
  mergePriceIntoScoringInput,
  PROPERTY_TYPE_LABELS,
  buildCrimeData,
  mergeCrimeIntoScoringInput,
  buildDisasterData,
  mergeDisasterIntoScoringInput,
  buildEducationData,
  mergeEducationIntoScoringInput,
  buildTransportData,
  mergeTransportIntoScoringInput,
  buildHealthcareData,
  mergeHealthcareIntoScoringInput,
  DATASETS,
} from "@townlens/core";
import type {
  CacheAdapter,
  EstatApiClient,
  PropertyType,
  CondoPriceStats,
  CrimeStats,
  CityDisasterData,
  EducationStats,
  TransportStats,
  HealthcareStats,
} from "@townlens/core";
import { loadConfig, resolveStatsDataId } from "../config/config";
import { renderReportHtml } from "../report/html";
import { renderScoredReportHtml } from "../report/templates/compose";
import { renderPdfFromHtml } from "../report/pdf";
import { resolveOutPath } from "../utils";
import type { ReportOptions } from "./types";
import { executePhase, type DataPhaseConfig, type PhaseState } from "./data-phase";

/** 市区町村モードのレポート生成 */
export async function handleMunicipalityReport(
  client: EstatApiClient,
  options: ReportOptions,
  cache: CacheAdapter,
): Promise<void> {
  const config = await loadConfig();
  const resolved = resolveStatsDataId({
    explicitStatsDataId: options.statsDataId,
    profileName: options.profile,
    config,
  });

  const cityNames = options.cities!
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (cityNames.length === 0) {
    throw new AppError("--cities が空です", ["例: --cities \"新宿区,横浜市,大阪市\""]);
  }

  const metaInfo = await client.getMetaInfo(resolved.statsDataId);
  const outPath = resolveOutPath(options.out);

  const reportData = await buildReportData({
    client,
    statsDataId: resolved.statsDataId,
    cityNames,
    selectors: {
      ...resolved.selectors,
      classId: options.classId ?? resolved.selectors?.classId,
      totalCode: options.totalCode ?? resolved.selectors?.totalCode,
      kidsCode: options.kidsCode ?? resolved.selectors?.kidsCode,
    },
    timeCode: options.timeCode,
    metaInfo,
  });

  let html: string;

  if (options.scored) {
    html = await buildScoredReport(client, options, reportData, resolved, config, cityNames, cache);
    console.log(`スコア付きPDFを出力しました: ${outPath}`);
  } else {
    html = renderReportHtml({
      title: "市区町村比較レポート（子育て世帯向け・MVP）",
      generatedAt: new Date().toLocaleString("ja-JP"),
      statsDataId: `${resolved.statsDataId} (${resolved.source})`,
      timeLabel: reportData.timeLabel,
      totalLabel: reportData.totalLabel,
      kidsLabel: reportData.kidsLabel,
      classInfo: `${reportData.ageSelection.classId}: ${reportData.ageSelection.total.code}(${reportData.totalLabel}) / ${reportData.ageSelection.kids.code}(${reportData.kidsLabel})`,
      rows: reportData.rows,
    });
    console.log(`PDFを出力しました: ${outPath}`);
  }

  await renderPdfFromHtml(html, outPath);

  console.log(`時点: ${reportData.timeLabel}`);
  console.log(`年齢分類: ${reportData.ageSelection.classId}`);
  console.log(`総数: ${reportData.totalLabel}(${reportData.ageSelection.total.code})`);
  console.log(`0〜14: ${reportData.kidsLabel}(${reportData.ageSelection.kids.code})`);
}

/** スコア付きレポートの構築（各種データを統合） */
async function buildScoredReport(
  client: EstatApiClient,
  options: ReportOptions,
  reportData: Awaited<ReturnType<typeof buildReportData>>,
  resolved: ReturnType<typeof resolveStatsDataId>,
  config: Awaited<ReturnType<typeof loadConfig>>,
  cityNames: readonly string[],
  cache: CacheAdapter,
): Promise<string> {
  const preset = findPreset(options.preset) ?? CHILDCARE_FOCUSED;
  const timeYear = reportData.timeLabel.match(/\d{4}/)?.[0] ?? "不明";

  const propertyType = (["condo", "house", "land", "all"].includes(options.propertyType)
    ? options.propertyType
    : "condo") as PropertyType;
  const budgetLimit = options.budgetLimit ? Number(options.budgetLimit) : undefined;
  if (budgetLimit !== undefined && (!Number.isFinite(budgetLimit) || budgetLimit <= 0)) {
    throw new AppError("--budget-limit は正の数値を指定してください", ["例: --budget-limit 5000"]);
  }
  const propertyTypeLabel = PROPERTY_TYPE_LABELS[propertyType];

  const areaCodes = reportData.rows.map((r) => r.areaCode);
  const populationMap = new Map<string, number>(
    reportData.rows.map((r) => [r.areaCode, r.total]),
  );
  const reinfoKey = process.env.REINFOLIB_API_KEY;

  // フェーズ設定を構築
  const phases = buildPhaseConfigs(
    client, options, config, reportData, areaCodes, populationMap, reinfoKey, cache, propertyType, budgetLimit,
  );

  // 初期状態
  let state: PhaseState = {
    scoringInput: toScoringInput(reportData, timeYear, resolved.statsDataId),
    definitions: POPULATION_INDICATORS,
    enrichedRows: reportData.rows,
  };

  // 各フェーズを順次実行し、hasData フラグを収集
  const dataFlags: Record<string, boolean> = {};
  for (const phase of phases) {
    const result = await executePhase(phase.config, state);
    state = result.state;
    dataFlags[phase.key] = result.hasData;
  }

  const results = scoreCities(state.scoringInput, state.definitions, preset);

  // ログ出力
  console.log(`プリセット: ${preset.label}`);
  for (const phase of phases) {
    if (dataFlags[phase.key]) {
      console.log(`${phase.config.name}: 有効`);
    }
  }
  for (const r of [...results].sort((a, b) => a.rank - b.rank)) {
    if (r.starRating != null) {
      const filled = "\u2605";
      const empty = "\u2606";
      const rounded = Math.round(r.starRating);
      console.log(`  ${r.rank}位: ${r.cityName} (${filled.repeat(rounded)}${empty.repeat(5 - rounded)} ${r.starRating.toFixed(1)}/5.0, 信頼度: ${r.confidence.level})`);
    } else {
      console.log(`  ${r.rank}位: ${r.cityName} (スコア: ${r.compositeScore.toFixed(1)}, 信頼度: ${r.confidence.level})`);
    }
  }

  return renderScoredReportHtml({
    title: "引っ越し先スコア レポート（子育て世帯向け）",
    generatedAt: new Date().toLocaleString("ja-JP"),
    cities: [...cityNames],
    statsDataId: `${resolved.statsDataId} (${resolved.source})`,
    timeLabel: reportData.timeLabel,
    preset,
    results,
    definitions: state.definitions,
    rawRows: state.enrichedRows,
    hasPriceData: dataFlags.price ?? false,
    propertyTypeLabel: dataFlags.price ? propertyTypeLabel : undefined,
    budgetLimit: dataFlags.price ? budgetLimit : undefined,
    hasCrimeData: dataFlags.crime ?? false,
    hasDisasterData: dataFlags.disaster ?? false,
    hasEducationData: dataFlags.education ?? false,
    hasTransportData: dataFlags.transport ?? false,
    hasHealthcareData: dataFlags.healthcare ?? false,
  });
}

/** フェーズキーと設定のペア（異なるTData型を1配列に収めるため any を使用） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PhaseEntry {
  readonly key: string;
  readonly config: DataPhaseConfig<any>;
}

/** 有効なフェーズの設定配列を構築する */
function buildPhaseConfigs(
  client: EstatApiClient,
  options: ReportOptions,
  config: Awaited<ReturnType<typeof loadConfig>>,
  reportData: Awaited<ReturnType<typeof buildReportData>>,
  areaCodes: readonly string[],
  populationMap: ReadonlyMap<string, number>,
  reinfoKey: string | undefined,
  cache: CacheAdapter,
  propertyType: PropertyType,
  budgetLimit: number | undefined,
): ReadonlyArray<PhaseEntry> {
  const phases: PhaseEntry[] = [];

  // 不動産価格データ
  if (options.price) {
    if (!reinfoKey) {
      console.log("REINFOLIB_API_KEY 未設定のため不動産価格データをスキップします。");
    } else {
      const key = reinfoKey;
      phases.push({
        key: "price",
        config: {
          name: "不動産価格データ",
          indicators: PRICE_INDICATORS,
          fetch: async () => {
            const reinfoClient = new ReinfoApiClient(key, { cache });
            const priceYear = options.year ?? String(new Date().getFullYear() - 1);
            return buildPriceData(reinfoClient, [...areaCodes], priceYear, options.quarter, propertyType, budgetLimit);
          },
          merge: mergePriceIntoScoringInput,
          enrich: (row, stats) => ({
            ...row,
            condoPriceMedian: Math.round(stats.median / 10000),
            condoPriceQ25: Math.round(stats.q25 / 10000),
            condoPriceQ75: Math.round(stats.q75 / 10000),
            condoPriceCount: stats.count,
            affordabilityRate: stats.affordabilityRate ?? null,
            propertyTypeLabel: stats.propertyTypeLabel ?? null,
          }),
        } as DataPhaseConfig<CondoPriceStats>,
      });
    }
  }

  // 犯罪統計データ
  if (options.crime) {
    const crimeStatsDataId = options.crimeStatsId ?? config.crimeStatsDataId ?? DATASETS.crime.statsDataId;
    if (!crimeStatsDataId) {
      console.log("犯罪統計の statsDataId が未設定のためスキップします。");
    } else {
      phases.push({
        key: "crime",
        config: {
          name: "犯罪統計データ",
          indicators: SAFETY_INDICATORS,
          fetch: () => buildCrimeData(client, [...areaCodes], { statsDataId: crimeStatsDataId }, new Map(populationMap)),
          merge: mergeCrimeIntoScoringInput,
          enrich: (row, stats) => ({ ...row, crimeRate: stats.crimeRate }),
        } as DataPhaseConfig<CrimeStats>,
      });
    }
  }

  // 災害リスクデータ
  if (options.disaster) {
    if (!reinfoKey) {
      console.log("REINFOLIB_API_KEY 未設定のため災害リスクデータをスキップします。");
    } else {
      const key = reinfoKey;
      const cityNameMap = new Map(reportData.rows.map((r) => [r.areaCode, r.cityResolved]));
      phases.push({
        key: "disaster",
        config: {
          name: "災害リスクデータ",
          indicators: DISASTER_INDICATORS,
          fetch: () => {
            const disasterClient = new ReinfoApiClient(key, { cache });
            return buildDisasterData(disasterClient, [...areaCodes], cityNameMap);
          },
          merge: mergeDisasterIntoScoringInput,
          enrich: (row, data) => ({
            ...row,
            floodRisk: data.floodRisk,
            landslideRisk: data.landslideRisk,
            evacuationSiteCount: data.evacuationSiteCount,
          }),
        } as DataPhaseConfig<CityDisasterData>,
      });
    }
  }

  // 教育統計データ
  if (options.education) {
    phases.push({
      key: "education",
      config: {
        name: "教育統計データ",
        indicators: EDUCATION_INDICATORS,
        fetch: () => buildEducationData(client, [...areaCodes], { statsDataId: DATASETS.education.statsDataId }, new Map(populationMap)),
        merge: mergeEducationIntoScoringInput,
        enrich: (row, stats) => ({
          ...row,
          elementarySchoolsPerCapita: stats.elementarySchoolsPerCapita,
          juniorHighSchoolsPerCapita: stats.juniorHighSchoolsPerCapita,
        }),
      } as DataPhaseConfig<EducationStats>,
    });
  }

  // 交通利便性データ
  if (options.transport) {
    phases.push({
      key: "transport",
      config: {
        name: "交通利便性データ",
        indicators: TRANSPORT_INDICATORS,
        fetch: () => buildTransportData(client, [...areaCodes], { statsDataId: DATASETS.transport.statsDataId }, new Map(populationMap)),
        merge: mergeTransportIntoScoringInput,
        enrich: (row, stats) => ({
          ...row,
          stationCountPerCapita: stats.stationCountPerCapita,
          terminalAccessKm: stats.terminalAccessKm,
        }),
      } as DataPhaseConfig<TransportStats>,
    });
  }

  // 医療統計データ
  if (options.healthcare) {
    phases.push({
      key: "healthcare",
      config: {
        name: "医療統計データ",
        indicators: HEALTHCARE_INDICATORS,
        fetch: () => buildHealthcareData(client, [...areaCodes], { statsDataId: DATASETS.healthcare.statsDataId }, new Map(populationMap)),
        merge: mergeHealthcareIntoScoringInput,
        enrich: (row, stats) => ({
          ...row,
          hospitalsPerCapita: stats.hospitalsPerCapita,
          clinicsPerCapita: stats.clinicsPerCapita,
          pediatricsPerCapita: stats.pediatricsPerCapita,
        }),
      } as DataPhaseConfig<HealthcareStats>,
    });
  }

  return phases;
}
