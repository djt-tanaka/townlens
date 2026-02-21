/**
 * 都市ページ用データ取得ヘルパー。
 * Server Component から直接呼び出し、ISR でキャッシュされる。
 *
 * 既存の runReportPipeline と同じフェーズ構成だが、
 * 単一都市向けに scoreSingleCity() で全国ベースライン基準評価のみ算出する。
 */

import type {
  AreaEntry,
  CityIndicators,
  WeightPreset,
} from "@townlens/core";
import {
  extractClassObjects,
  resolveAreaClass,
  buildAreaEntries,
  buildReportData,
  toScoringInput,
  scoreSingleCity,
  ALL_INDICATORS,
  ALL_PRESETS,
  DATASETS,
  buildPriceData,
  mergePriceIntoScoringInput,
  buildCrimeData,
  mergeCrimeIntoScoringInput,
  buildDisasterData,
  mergeDisasterIntoScoringInput,
  buildEducationData,
  mergeEducationIntoScoringInput,
  buildHealthcareData,
  mergeHealthcareIntoScoringInput,
} from "@townlens/core";
import type { SingleCityScore } from "@townlens/core";
import { createEstatClient, createReinfoClient } from "./api-clients";
import { getPrefectureName } from "./prefectures";

const MAN_YEN = 10000;

/** 都市ページに必要な全データ */
export interface CityPageData {
  readonly cityName: string;
  readonly areaCode: string;
  readonly prefecture: string;
  readonly population: number;
  readonly kidsRatio: number;
  readonly presetScores: ReadonlyArray<{
    readonly preset: WeightPreset;
    readonly score: SingleCityScore;
  }>;
  readonly rawData: CityRawData;
}

export interface CityRawData {
  readonly condoPriceMedian?: number | null;
  readonly crimeRate?: number | null;
  readonly floodRisk?: boolean | null;
  readonly evacuationSiteCount?: number | null;
  readonly elementarySchoolsPerCapita?: number | null;
  readonly juniorHighSchoolsPerCapita?: number | null;
  readonly hospitalsPerCapita?: number | null;
  readonly clinicsPerCapita?: number | null;
  readonly pediatricsPerCapita?: number | null;
}

/** 全市区町村リストのメモリキャッシュ */
let cachedAreaEntries: ReadonlyArray<AreaEntry> | null = null;

/** 全市区町村リストを取得（メモリキャッシュ付き） */
export async function getAllAreaEntries(): Promise<ReadonlyArray<AreaEntry>> {
  if (cachedAreaEntries) return cachedAreaEntries;
  const client = createEstatClient();
  const metaInfo = await client.getMetaInfo(DATASETS.population.statsDataId);
  const classObjs = extractClassObjects(metaInfo);
  const areaClass = resolveAreaClass(classObjs);
  cachedAreaEntries = buildAreaEntries(areaClass);
  return cachedAreaEntries;
}

/** 都市名から AreaEntry を検索 */
export async function findCityByName(
  cityName: string,
): Promise<AreaEntry | null> {
  const entries = await getAllAreaEntries();
  return entries.find((e) => e.name === cityName) ?? null;
}

/** 単一都市のデータを取得して全プリセットでスコアリングする */
export async function fetchCityPageData(
  cityName: string,
): Promise<CityPageData | null> {
  const estatClient = createEstatClient();
  const metaInfo = await estatClient.getMetaInfo(
    DATASETS.population.statsDataId,
  );

  // Phase 0: 人口統計取得
  let reportData;
  try {
    reportData = await buildReportData({
      client: estatClient,
      statsDataId: DATASETS.population.statsDataId,
      cityNames: [cityName],
      selectors: DATASETS.population.selectors,
      metaInfo,
    });
  } catch {
    return null;
  }

  const row = reportData.rows[0];
  if (!row) return null;

  const timeYear = reportData.timeLabel.match(/\d{4}/)?.[0] ?? "不明";
  let scoringInput: ReadonlyArray<CityIndicators> = toScoringInput(
    reportData,
    timeYear,
    DATASETS.population.statsDataId,
  );

  const areaCodes = [row.areaCode];

  // 各フェーズの生データを収集（最終的に CityRawData に組み立て）
  let condoPriceMedian: number | null = null;
  let crimeRate: number | null = null;
  let floodRisk: boolean | null = null;
  let evacuationSiteCount: number | null = null;
  let elementarySchoolsPerCapita: number | null = null;
  let juniorHighSchoolsPerCapita: number | null = null;
  let hospitalsPerCapita: number | null = null;
  let clinicsPerCapita: number | null = null;
  let pediatricsPerCapita: number | null = null;

  // Phase 1: 不動産価格取得
  let reinfoClient;
  try {
    reinfoClient = createReinfoClient();
  } catch {
    // REINFOLIB_API_KEY 未設定
  }

  if (reinfoClient) {
    try {
      const priceYear = String(new Date().getFullYear() - 1);
      const priceData = await buildPriceData(
        reinfoClient,
        areaCodes,
        priceYear,
      );
      if (priceData.size > 0) {
        scoringInput = mergePriceIntoScoringInput(scoringInput, priceData);
        const price = priceData.get(row.areaCode);
        if (price) {
          condoPriceMedian = Math.round(price.median / MAN_YEN);
        }
      }
    } catch {
      // 不動産価格データの取得失敗はスキップ
    }
  }

  // Phase 2a: 犯罪統計取得
  try {
    const populationMap = new Map<string, number>([[row.areaCode, row.total]]);
    const crimeData = await buildCrimeData(estatClient, areaCodes, {
      statsDataId: DATASETS.crime.statsDataId,
    }, populationMap);
    if (crimeData.size > 0) {
      scoringInput = mergeCrimeIntoScoringInput(scoringInput, crimeData);
      const crime = crimeData.get(row.areaCode);
      if (crime) {
        crimeRate = crime.crimeRate;
      }
    }
  } catch {
    // 犯罪統計データの取得失敗はスキップ
  }

  // Phase 2b: 災害リスク取得
  if (reinfoClient) {
    try {
      const cityNameMap = new Map([[row.areaCode, row.cityResolved]]);
      const disasterData = await buildDisasterData(
        reinfoClient,
        areaCodes,
        cityNameMap,
      );
      if (disasterData.size > 0) {
        scoringInput = mergeDisasterIntoScoringInput(
          scoringInput,
          disasterData,
        );
        const disaster = disasterData.get(row.areaCode);
        if (disaster) {
          floodRisk = disaster.floodRisk;
          evacuationSiteCount = disaster.evacuationSiteCount;
        }
      }
    } catch {
      // 災害リスクデータの取得失敗はスキップ
    }
  }

  // Phase 3: 教育統計取得
  try {
    const populationMap = new Map<string, number>([
      [row.areaCode, row.total],
    ]);
    const educationData = await buildEducationData(
      estatClient,
      areaCodes,
      { statsDataId: DATASETS.education.statsDataId },
      populationMap,
    );
    if (educationData.size > 0) {
      scoringInput = mergeEducationIntoScoringInput(
        scoringInput,
        educationData,
      );
      const edu = educationData.get(row.areaCode);
      if (edu) {
        elementarySchoolsPerCapita = edu.elementarySchoolsPerCapita;
        juniorHighSchoolsPerCapita = edu.juniorHighSchoolsPerCapita;
      }
    }
  } catch {
    // 教育統計データの取得失敗はスキップ
  }

  // Phase 4: 医療統計取得
  try {
    const populationMap = new Map<string, number>([
      [row.areaCode, row.total],
    ]);
    const healthcareData = await buildHealthcareData(
      estatClient,
      areaCodes,
      { statsDataId: DATASETS.healthcare.statsDataId },
      populationMap,
    );
    if (healthcareData.size > 0) {
      scoringInput = mergeHealthcareIntoScoringInput(
        scoringInput,
        healthcareData,
      );
      const hc = healthcareData.get(row.areaCode);
      if (hc) {
        hospitalsPerCapita = hc.hospitalsPerCapita;
        clinicsPerCapita = hc.clinicsPerCapita;
        pediatricsPerCapita = hc.pediatricsPerCapita;
      }
    }
  } catch {
    // 医療統計データの取得失敗はスキップ
  }

  const rawData: CityRawData = {
    condoPriceMedian,
    crimeRate,
    floodRisk,
    evacuationSiteCount,
    elementarySchoolsPerCapita,
    juniorHighSchoolsPerCapita,
    hospitalsPerCapita,
    clinicsPerCapita,
    pediatricsPerCapita,
  };

  // 全プリセットでスコアリング
  const cityData = scoringInput[0];
  const presetScores = ALL_PRESETS.map((preset) => ({
    preset,
    score: scoreSingleCity(cityData, ALL_INDICATORS, preset),
  }));

  return {
    cityName: row.cityResolved,
    areaCode: row.areaCode,
    prefecture: getPrefectureName(row.areaCode),
    population: row.total,
    kidsRatio: row.ratio,
    presetScores,
    rawData,
  };
}
