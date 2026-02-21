/**
 * 市区町村モードのレポート生成ハンドラ。
 * 人口統計・不動産価格・犯罪統計・災害リスクのデータを統合してPDFレポートを出力する。
 */

import {
  AppError,
  buildReportData,
  toScoringInput,
  scoreCities,
  POPULATION_INDICATORS,
  ALL_INDICATORS,
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
import type { CacheAdapter, EstatApiClient, PropertyType } from "@townlens/core";
import { loadConfig, resolveStatsDataId } from "../config/config";
import { renderReportHtml } from "../report/html";
import { renderScoredReportHtml } from "../report/templates/compose";
import { renderPdfFromHtml } from "../report/pdf";
import { resolveOutPath } from "../utils";
import type { ReportOptions } from "./types";

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

/** スコア付きレポートの構築（価格・犯罪・災害データを統合） */
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
  let scoringInput = toScoringInput(reportData, timeYear, resolved.statsDataId);
  let definitions = POPULATION_INDICATORS;
  let hasPriceData = false;
  let enrichedRows = reportData.rows;

  const propertyType = (["condo", "house", "land", "all"].includes(options.propertyType)
    ? options.propertyType
    : "condo") as PropertyType;
  const budgetLimit = options.budgetLimit ? Number(options.budgetLimit) : undefined;
  if (budgetLimit !== undefined && (!Number.isFinite(budgetLimit) || budgetLimit <= 0)) {
    throw new AppError("--budget-limit は正の数値を指定してください", ["例: --budget-limit 5000"]);
  }
  const propertyTypeLabel = PROPERTY_TYPE_LABELS[propertyType];

  // 不動産価格データ
  if (options.price) {
    const reinfoKey = process.env.REINFOLIB_API_KEY;
    if (!reinfoKey) {
      console.log("REINFOLIB_API_KEY 未設定のため不動産価格データをスキップします。");
    } else {
      try {
        const reinfoClient = new ReinfoApiClient(reinfoKey, { cache });
        const priceYear = options.year ?? String(new Date().getFullYear() - 1);
        const areaCodes = reportData.rows.map((r) => r.areaCode);
        const priceData = await buildPriceData(
          reinfoClient, areaCodes, priceYear, options.quarter, propertyType, budgetLimit,
        );

        if (priceData.size > 0) {
          scoringInput = mergePriceIntoScoringInput(scoringInput, priceData);
          definitions = ALL_INDICATORS;
          hasPriceData = true;
          enrichedRows = reportData.rows.map((row) => {
            const stats = priceData.get(row.areaCode);
            if (!stats) return row;
            return {
              ...row,
              condoPriceMedian: Math.round(stats.median / 10000),
              condoPriceQ25: Math.round(stats.q25 / 10000),
              condoPriceQ75: Math.round(stats.q75 / 10000),
              condoPriceCount: stats.count,
              affordabilityRate: stats.affordabilityRate ?? null,
              propertyTypeLabel: stats.propertyTypeLabel ?? null,
            };
          });
        }
      } catch (err) {
        console.warn(`[warn] 不動産価格データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 犯罪統計データ
  let hasCrimeData = false;

  if (options.crime) {
    const crimeStatsDataId = options.crimeStatsId ?? config.crimeStatsDataId ?? DATASETS.crime.statsDataId;
    if (!crimeStatsDataId) {
      console.log("犯罪統計の statsDataId が未設定のためスキップします。");
    } else {
      try {
        const populationMap = new Map<string, number>(
          reportData.rows.map((r) => [r.areaCode, r.total]),
        );
        const crimeData = await buildCrimeData(client, reportData.rows.map((r) => r.areaCode), {
          statsDataId: crimeStatsDataId,
        }, populationMap);

        if (crimeData.size > 0) {
          scoringInput = mergeCrimeIntoScoringInput(scoringInput, crimeData);
          definitions = ALL_INDICATORS;
          hasCrimeData = true;
          enrichedRows = enrichedRows.map((row) => {
            const stats = crimeData.get(row.areaCode);
            if (!stats) return row;
            return {
              ...row,
              crimeRate: stats.crimeRate,
            };
          });
        } else {
          console.warn("[warn] 犯罪統計データが0件でした（対象都市のデータが見つかりませんでした）");
        }
      } catch (err) {
        console.warn(`[warn] 犯罪統計データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 災害リスクデータ
  let hasDisasterData = false;

  if (options.disaster) {
    const reinfoKey = process.env.REINFOLIB_API_KEY;
    if (!reinfoKey) {
      console.log("REINFOLIB_API_KEY 未設定のため災害リスクデータをスキップします。");
    } else {
      try {
        const disasterClient = new ReinfoApiClient(reinfoKey, { cache });
        const areaCodes = reportData.rows.map((r) => r.areaCode);
        const cityNameMap = new Map(reportData.rows.map((r) => [r.areaCode, r.cityResolved]));
        const disasterData = await buildDisasterData(disasterClient, areaCodes, cityNameMap);

        if (disasterData.size > 0) {
          scoringInput = mergeDisasterIntoScoringInput(scoringInput, disasterData);
          definitions = ALL_INDICATORS;
          hasDisasterData = true;
          enrichedRows = enrichedRows.map((row) => {
            const data = disasterData.get(row.areaCode);
            if (!data) return row;
            return {
              ...row,
              floodRisk: data.floodRisk,
              landslideRisk: data.landslideRisk,
              evacuationSiteCount: data.evacuationSiteCount,
            };
          });
        } else {
          console.warn("[warn] 災害リスクデータが0件でした");
        }
      } catch (err) {
        console.warn(`[warn] 災害リスクデータの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 教育統計データ
  let hasEducationData = false;

  if (options.education) {
    try {
      const areaCodes = reportData.rows.map((r) => r.areaCode);
      const populationMap = new Map<string, number>(
        reportData.rows.map((r) => [r.areaCode, r.total]),
      );
      const educationData = await buildEducationData(
        client, areaCodes,
        { statsDataId: DATASETS.education.statsDataId },
        populationMap,
      );

      if (educationData.size > 0) {
        scoringInput = mergeEducationIntoScoringInput(scoringInput, educationData);
        definitions = ALL_INDICATORS;
        hasEducationData = true;
        enrichedRows = enrichedRows.map((row) => {
          const stats = educationData.get(row.areaCode);
          if (!stats) return row;
          return {
            ...row,
            elementarySchoolsPerCapita: stats.elementarySchoolsPerCapita,
            juniorHighSchoolsPerCapita: stats.juniorHighSchoolsPerCapita,
          };
        });
      } else {
        console.warn("[warn] 教育統計データが0件でした");
      }
    } catch (err) {
      console.warn(`[warn] 教育統計データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 交通利便性データ
  let hasTransportData = false;

  if (options.transport) {
    try {
      const areaCodes = reportData.rows.map((r) => r.areaCode);
      const populationMap = new Map<string, number>(
        reportData.rows.map((r) => [r.areaCode, r.total]),
      );
      const transportData = await buildTransportData(
        client, areaCodes,
        { statsDataId: DATASETS.transport.statsDataId },
        populationMap,
      );

      if (transportData.size > 0) {
        scoringInput = mergeTransportIntoScoringInput(scoringInput, transportData);
        definitions = ALL_INDICATORS;
        hasTransportData = true;
        enrichedRows = enrichedRows.map((row) => {
          const stats = transportData.get(row.areaCode);
          if (!stats) return row;
          return {
            ...row,
            stationCountPerCapita: stats.stationCountPerCapita,
            terminalAccessKm: stats.terminalAccessKm,
          };
        });
      } else {
        console.warn("[warn] 交通利便性データが0件でした");
      }
    } catch (err) {
      console.warn(`[warn] 交通利便性データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 医療統計データ
  let hasHealthcareData = false;

  if (options.healthcare) {
    try {
      const areaCodes = reportData.rows.map((r) => r.areaCode);
      const populationMap = new Map<string, number>(
        reportData.rows.map((r) => [r.areaCode, r.total]),
      );
      const healthcareData = await buildHealthcareData(
        client, areaCodes,
        { statsDataId: DATASETS.healthcare.statsDataId },
        populationMap,
      );

      if (healthcareData.size > 0) {
        scoringInput = mergeHealthcareIntoScoringInput(scoringInput, healthcareData);
        definitions = ALL_INDICATORS;
        hasHealthcareData = true;
        enrichedRows = enrichedRows.map((row) => {
          const stats = healthcareData.get(row.areaCode);
          if (!stats) return row;
          return {
            ...row,
            hospitalsPerCapita: stats.hospitalsPerCapita,
            clinicsPerCapita: stats.clinicsPerCapita,
            pediatricsPerCapita: stats.pediatricsPerCapita,
          };
        });
      } else {
        console.warn("[warn] 医療統計データが0件でした");
      }
    } catch (err) {
      console.warn(`[warn] 医療統計データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const results = scoreCities(scoringInput, definitions, preset);

  console.log(`プリセット: ${preset.label}`);
  if (hasPriceData) {
    console.log("不動産価格データ: 有効");
  }
  if (hasCrimeData) {
    console.log("犯罪統計データ: 有効");
  }
  if (hasDisasterData) {
    console.log("災害リスクデータ: 有効");
  }
  if (hasEducationData) {
    console.log("教育統計データ: 有効");
  }
  if (hasTransportData) {
    console.log("交通利便性データ: 有効");
  }
  if (hasHealthcareData) {
    console.log("医療統計データ: 有効");
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
    definitions,
    rawRows: enrichedRows,
    hasPriceData,
    propertyTypeLabel: hasPriceData ? propertyTypeLabel : undefined,
    budgetLimit: hasPriceData ? budgetLimit : undefined,
    hasCrimeData,
    hasDisasterData,
    hasEducationData,
    hasTransportData,
    hasHealthcareData,
  });
}
