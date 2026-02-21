/**
 * レポート生成パイプライン。
 * CLI の cli.ts:280-419 と同一のデータフローを純粋関数として実装する。
 *
 * Phase 0: 人口統計取得（buildReportData → toScoringInput）
 * Phase 1: 不動産価格取得（buildPriceData → mergePriceIntoScoringInput）
 * Phase 2a: 犯罪統計取得（buildCrimeData → mergeCrimeIntoScoringInput）
 * Phase 2b: 災害リスク取得（buildDisasterData → mergeDisasterIntoScoringInput）
 * Phase 3: 教育統計取得（buildEducationData → mergeEducationIntoScoringInput）
 * スコアリング: scoreCities()
 */

import type { CityIndicators } from "../scoring/types";
import type { CityScoreResult } from "../scoring/types";
import type { IndicatorDefinition } from "../scoring/types";
import type { WeightPreset } from "../scoring/types";
import type { ReportRow } from "../types";
import type { EstatApiClient } from "../estat/client";
import type { ReinfoApiClient } from "../reinfo/client";
import type { CondoPriceStats } from "../reinfo/types";
import type { CrimeStats } from "../estat/crime-data";
import type { CityDisasterData } from "../reinfo/disaster-data";
import type { EducationStats } from "../estat/education-data";
import { buildReportData, toScoringInput } from "../estat/report-data";
import { buildPriceData } from "../reinfo/price-data";
import { mergePriceIntoScoringInput } from "../reinfo/merge-scoring";
import { buildCrimeData } from "../estat/crime-data";
import { mergeCrimeIntoScoringInput } from "../estat/merge-crime-scoring";
import { buildDisasterData } from "../reinfo/disaster-data";
import { mergeDisasterIntoScoringInput } from "../reinfo/merge-disaster-scoring";
import { buildEducationData } from "../estat/education-data";
import { mergeEducationIntoScoringInput } from "../estat/merge-education-scoring";
import { scoreCities } from "../scoring";
import { findPreset, POPULATION_INDICATORS, ALL_INDICATORS, CHILDCARE_FOCUSED } from "../scoring/presets";
import { DATASETS } from "../config/datasets";

const MAN_YEN = 10000;

/** 各フェーズのデータを ReportRow にマージする */
function enrichRows(
  rows: ReadonlyArray<ReportRow>,
  priceData?: ReadonlyMap<string, CondoPriceStats>,
  crimeData?: ReadonlyMap<string, CrimeStats>,
  disasterData?: ReadonlyMap<string, CityDisasterData>,
  educationData?: ReadonlyMap<string, EducationStats>,
): ReadonlyArray<ReportRow> {
  return rows.map((row) => {
    let enriched: ReportRow = { ...row };

    const price = priceData?.get(row.areaCode);
    if (price) {
      enriched = {
        ...enriched,
        condoPriceMedian: Math.round(price.median / MAN_YEN),
        condoPriceQ25: Math.round(price.q25 / MAN_YEN),
        condoPriceQ75: Math.round(price.q75 / MAN_YEN),
        condoPriceCount: price.count,
        affordabilityRate: price.affordabilityRate ?? null,
        propertyTypeLabel: price.propertyTypeLabel ?? null,
      };
    }

    const crime = crimeData?.get(row.areaCode);
    if (crime) {
      enriched = { ...enriched, crimeRate: crime.crimeRate };
    }

    const disaster = disasterData?.get(row.areaCode);
    if (disaster) {
      enriched = {
        ...enriched,
        floodRisk: disaster.floodRisk,
        landslideRisk: disaster.landslideRisk,
        evacuationSiteCount: disaster.evacuationSiteCount,
      };
    }

    const education = educationData?.get(row.areaCode);
    if (education) {
      enriched = {
        ...enriched,
        elementarySchoolsPerCapita: education.elementarySchoolsPerCapita,
        juniorHighSchoolsPerCapita: education.juniorHighSchoolsPerCapita,
      };
    }

    return enriched;
  });
}

export interface PipelineInput {
  readonly cityNames: ReadonlyArray<string>;
  readonly preset: string;
  readonly includePrice: boolean;
  readonly includeCrime: boolean;
  readonly includeDisaster: boolean;
  readonly includeEducation: boolean;
}

export interface PipelineResult {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
  readonly rawRows: ReadonlyArray<ReportRow>;
  readonly hasPriceData: boolean;
  readonly hasCrimeData: boolean;
  readonly hasDisasterData: boolean;
  readonly hasEducationData: boolean;
  readonly preset: WeightPreset;
  readonly timeLabel: string;
  readonly cities: ReadonlyArray<string>;
}

export interface PipelineClients {
  readonly estatClient: EstatApiClient;
  readonly reinfoClient?: ReinfoApiClient;
}

/**
 * レポート生成パイプラインを実行する。
 * CLI の report コマンドと同一のデータフロー。
 */
export async function runReportPipeline(
  input: PipelineInput,
  clients: PipelineClients,
): Promise<PipelineResult> {
  const { estatClient, reinfoClient } = clients;
  const preset = findPreset(input.preset) ?? CHILDCARE_FOCUSED;
  const statsDataId = DATASETS.population.statsDataId;

  // Phase 0: 人口統計取得
  const metaInfo = await estatClient.getMetaInfo(statsDataId);
  const reportData = await buildReportData({
    client: estatClient,
    statsDataId,
    cityNames: [...input.cityNames],
    selectors: DATASETS.population.selectors,
    metaInfo,
  });

  const timeYear = reportData.timeLabel.match(/\d{4}/)?.[0] ?? "不明";
  let scoringInput: ReadonlyArray<CityIndicators> = toScoringInput(
    reportData,
    timeYear,
    statsDataId,
  );
  let definitions: ReadonlyArray<IndicatorDefinition> = POPULATION_INDICATORS;
  let hasPriceData = false;
  let hasCrimeData = false;
  let hasDisasterData = false;
  let hasEducationData = false;

  const areaCodes = reportData.rows.map((r) => r.areaCode);

  // 各フェーズのデータを保持（rawRows へのマージ用）
  let priceDataMap: ReadonlyMap<string, CondoPriceStats> | undefined;
  let crimeDataMap: ReadonlyMap<string, CrimeStats> | undefined;
  let disasterDataMap: ReadonlyMap<string, CityDisasterData> | undefined;
  let educationDataMap: ReadonlyMap<string, EducationStats> | undefined;

  // Phase 1: 不動産価格取得
  if (input.includePrice && reinfoClient) {
    try {
      const priceYear = String(new Date().getFullYear() - 1);
      const priceData = await buildPriceData(
        reinfoClient,
        areaCodes,
        priceYear,
      );
      if (priceData.size > 0) {
        scoringInput = mergePriceIntoScoringInput(scoringInput, priceData);
        definitions = ALL_INDICATORS;
        hasPriceData = true;
        priceDataMap = priceData;
      }
    } catch (err) {
      console.warn(
        `不動産価格データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Phase 2a: 犯罪統計取得
  if (input.includeCrime) {
    try {
      const populationMap = new Map<string, number>(
        reportData.rows.map((r) => [r.areaCode, r.total]),
      );
      const crimeData = await buildCrimeData(estatClient, areaCodes, {
        statsDataId: DATASETS.crime.statsDataId,
      }, populationMap);
      if (crimeData.size > 0) {
        scoringInput = mergeCrimeIntoScoringInput(scoringInput, crimeData);
        definitions = ALL_INDICATORS;
        hasCrimeData = true;
        crimeDataMap = crimeData;
      }
    } catch (err) {
      console.warn(
        `犯罪統計データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Phase 2b: 災害リスク取得
  if (input.includeDisaster && reinfoClient) {
    try {
      const cityNameMap = new Map(
        reportData.rows.map((r) => [r.areaCode, r.cityResolved]),
      );
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
        definitions = ALL_INDICATORS;
        hasDisasterData = true;
        disasterDataMap = disasterData;
      }
    } catch (err) {
      console.warn(
        `災害リスクデータの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Phase 3: 教育統計取得
  if (input.includeEducation) {
    try {
      // 人口あたりの算出に使うため、Phase 0 の人口データを抽出
      const populationMap = new Map<string, number>(
        reportData.rows.map((r) => [r.areaCode, r.total]),
      );
      const educationData = await buildEducationData(
        estatClient,
        areaCodes,
        { statsDataId: DATASETS.education.statsDataId },
        populationMap,
      );
      if (educationData.size > 0) {
        scoringInput = mergeEducationIntoScoringInput(scoringInput, educationData);
        definitions = ALL_INDICATORS;
        hasEducationData = true;
        educationDataMap = educationData;
      }
    } catch (err) {
      console.warn(
        `教育統計データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // スコアリング
  const results = scoreCities(scoringInput, definitions, preset);

  // 各フェーズのデータを rawRows にマージ
  const rawRows = enrichRows(
    reportData.rows,
    priceDataMap,
    crimeDataMap,
    disasterDataMap,
    educationDataMap,
  );

  return {
    results,
    definitions,
    rawRows,
    hasPriceData,
    hasCrimeData,
    hasDisasterData,
    hasEducationData,
    preset,
    timeLabel: reportData.timeLabel,
    cities: [...input.cityNames],
  };
}
