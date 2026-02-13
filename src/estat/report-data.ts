import { CliError } from "../errors";
import { CityIndicators, IndicatorValue } from "../scoring/types";
import { ReportRow } from "../types";
import { resolveOutPath } from "../utils";
import { SelectorConfig } from "../config/config";
import { EstatApiClient } from "./client";
import {
  AgeSelection,
  DefaultFilter,
  buildAreaEntries,
  extractClassObjects,
  extractDataValues,
  formatSelectionPreview,
  resolveAgeSelection,
  resolveAreaClass,
  resolveCities,
  resolveDefaultFilters,
  resolveLatestTime,
  valuesByArea
} from "./meta";

export { ReportRow } from "../types";

export interface BuildReportInput {
  client: EstatApiClient;
  statsDataId: string;
  cityNames: string[];
  outPath?: string;
  selectors?: SelectorConfig;
  timeCode?: string;
  metaInfo: any;
}

export interface BuildReportResult {
  outPath: string;
  rows: ReportRow[];
  timeLabel: string;
  totalLabel: string;
  kidsLabel: string;
  ageSelection: AgeSelection;
}

async function fetchMetricByArea(args: {
  client: EstatApiClient;
  statsDataId: string;
  areaCodes: string[];
  timeCode: string;
  ageSelection: AgeSelection;
  metricCode: string;
  extraFilters: ReadonlyArray<DefaultFilter>;
}): Promise<Map<string, number>> {
  const extraParams = Object.fromEntries(
    args.extraFilters.map((f) => [f.paramName, f.code])
  );

  const response = await args.client.getStatsData({
    statsDataId: args.statsDataId,
    cdArea: args.areaCodes.join(","),
    cdTime: args.timeCode,
    [args.ageSelection.paramName]: args.metricCode,
    ...extraParams,
  });

  const values = extractDataValues(response);
  return valuesByArea(values, args.timeCode);
}

export async function buildReportData(input: BuildReportInput): Promise<BuildReportResult> {
  const classObjs = extractClassObjects(input.metaInfo);
  if (classObjs.length === 0) {
    throw new CliError("メタ情報の分類事項が空です", [
      "statsDataId が正しいか確認してください。",
      "estat-report search --keyword \"人口\" で別IDを探索してください。"
    ]);
  }

  const areaClass = resolveAreaClass(classObjs);
  const areaEntries = buildAreaEntries(areaClass);
  const cities = resolveCities(input.cityNames, areaEntries);
  const ageSelection = resolveAgeSelection(classObjs, input.selectors);
  const timeSelection = resolveLatestTime(classObjs, input.timeCode);

  const areaCodes = cities.map((city) => city.code);

  // area/time/指定cat以外のcat・tab分類（男女、表章項目等）の「総数」「実数」コードを導出
  const excludeIds = new Set(["area", areaClass.id, "time", timeSelection.classId, ageSelection.classId]);
  const extraFilters = resolveDefaultFilters(classObjs, excludeIds);

  const [totalMap, kidsMap] = await Promise.all([
    fetchMetricByArea({
      client: input.client,
      statsDataId: input.statsDataId,
      areaCodes,
      timeCode: timeSelection.code,
      ageSelection,
      metricCode: ageSelection.total.code,
      extraFilters,
    }),
    fetchMetricByArea({
      client: input.client,
      statsDataId: input.statsDataId,
      areaCodes,
      timeCode: timeSelection.code,
      ageSelection,
      metricCode: ageSelection.kids.code,
      extraFilters,
    })
  ]);

  const baseRows = cities.map((city) => {
    const total = totalMap.get(city.code);
    const kids = kidsMap.get(city.code);

    if (total === undefined || kids === undefined) {
      throw new CliError(`統計値を取得できない市区町村があります (${city.input})`, [
        `時間コード: ${timeSelection.code} / 年齢分類: ${ageSelection.classId}`,
        "指定した市区町村にデータが存在しない可能性があります（e-Stat API がデータなしを返却）。",
        "--timeCode または --classId/--totalCode/--kidsCode の手動指定を試してください。",
        `分類候補:\n${formatSelectionPreview(classObjs)}`
      ]);
    }

    return {
      cityInput: city.input,
      cityResolved: city.resolvedName,
      areaCode: city.code,
      total,
      kids,
      ratio: total > 0 ? (kids / total) * 100 : 0
    };
  });

  const totalSorted = [...baseRows].sort((a, b) => b.total - a.total);
  const ratioSorted = [...baseRows].sort((a, b) => b.ratio - a.ratio);

  const rows: ReportRow[] = baseRows.map((row) => ({
    ...row,
    totalRank: totalSorted.findIndex((r) => r.areaCode === row.areaCode) + 1,
    ratioRank: ratioSorted.findIndex((r) => r.areaCode === row.areaCode) + 1
  }));

  return {
    outPath: resolveOutPath(input.outPath),
    rows,
    timeLabel: `${timeSelection.code} (${timeSelection.label})`,
    totalLabel: ageSelection.total.name,
    kidsLabel: ageSelection.kids.name,
    ageSelection
  };
}

/**
 * BuildReportResult からスコアリング入力を構築する
 */
export function toScoringInput(
  result: BuildReportResult,
  dataYear: string,
  statsDataId: string
): ReadonlyArray<CityIndicators> {
  return result.rows.map((row) => {
    const indicators: IndicatorValue[] = [
      {
        indicatorId: "population_total",
        rawValue: row.total,
        dataYear,
        sourceId: statsDataId,
      },
      {
        indicatorId: "kids_ratio",
        rawValue: row.ratio,
        dataYear,
        sourceId: statsDataId,
      },
    ];

    return {
      cityName: row.cityResolved,
      areaCode: row.areaCode,
      indicators,
    };
  });
}
