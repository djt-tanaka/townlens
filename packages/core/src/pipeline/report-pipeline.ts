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
      const crimeData = await buildCrimeData(estatClient, areaCodes, {
        statsDataId: DATASETS.crime.statsDataId,
      });
      if (crimeData.size > 0) {
        scoringInput = mergeCrimeIntoScoringInput(scoringInput, crimeData);
        definitions = ALL_INDICATORS;
        hasCrimeData = true;
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
      }
    } catch (err) {
      console.warn(
        `教育統計データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // スコアリング
  const results = scoreCities(scoringInput, definitions, preset);

  return {
    results,
    definitions,
    rawRows: reportData.rows,
    hasPriceData,
    hasCrimeData,
    hasDisasterData,
    hasEducationData,
    preset,
    timeLabel: reportData.timeLabel,
    cities: [...input.cityNames],
  };
}
