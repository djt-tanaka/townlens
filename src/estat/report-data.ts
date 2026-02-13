import { CliError } from "../errors";
import { resolveOutPath } from "../utils";
import { SelectorConfig } from "../config/config";
import { EstatApiClient } from "./client";
import {
  AgeSelection,
  buildAreaEntries,
  extractClassObjects,
  extractDataValues,
  formatSelectionPreview,
  resolveAgeSelection,
  resolveAreaClass,
  resolveCities,
  resolveLatestTime,
  valuesByArea
} from "./meta";

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
  rows: Array<{
    cityInput: string;
    cityResolved: string;
    areaCode: string;
    total: number;
    kids: number;
    ratio: number;
  }>;
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
}): Promise<Map<string, number>> {
  const response = await args.client.getStatsData({
    statsDataId: args.statsDataId,
    cdArea: args.areaCodes.join(","),
    cdTime: args.timeCode,
    [args.ageSelection.paramName]: args.metricCode
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

  const [totalMap, kidsMap] = await Promise.all([
    fetchMetricByArea({
      client: input.client,
      statsDataId: input.statsDataId,
      areaCodes,
      timeCode: timeSelection.code,
      ageSelection,
      metricCode: ageSelection.total.code
    }),
    fetchMetricByArea({
      client: input.client,
      statsDataId: input.statsDataId,
      areaCodes,
      timeCode: timeSelection.code,
      ageSelection,
      metricCode: ageSelection.kids.code
    })
  ]);

  const rows = cities.map((city) => {
    const total = totalMap.get(city.code);
    const kids = kidsMap.get(city.code);

    if (total === undefined || kids === undefined) {
      throw new CliError(`統計値を取得できない市区町村があります (${city.input})`, [
        `時間コード: ${timeSelection.code} / 年齢分類: ${ageSelection.classId}`,
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

  return {
    outPath: resolveOutPath(input.outPath),
    rows,
    timeLabel: `${timeSelection.code} (${timeSelection.label})`,
    totalLabel: ageSelection.total.name,
    kidsLabel: ageSelection.kids.name,
    ageSelection
  };
}
