/**
 * メッシュモードのレポート生成ハンドラ。
 * 地域メッシュ単位で人口データを取得し、比較レポートをPDF出力する。
 */

import {
  AppError,
  DATASETS,
  extractClassObjects,
  resolveAgeSelection,
  resolveLatestTime,
  scoreCities,
  findPreset,
  CHILDCARE_FOCUSED,
  POPULATION_INDICATORS,
} from "@townlens/core";
import type { EstatApiClient } from "@townlens/core";
import { buildMeshData, meshDataToReportRows, meshRowsToScoringInput } from "../mesh/mesh-data";
import { loadMeshDataFromCache, saveMeshDataToCache } from "../mesh/cache";
import { isValidMeshCode } from "../mesh/geometry";
import { renderReportHtml } from "../report/html";
import { renderScoredReportHtml } from "../report/templates/compose";
import { renderPdfFromHtml } from "../report/pdf";
import { resolveOutPath } from "../utils";
import type { ReportOptions } from "./types";

/** メッシュモードのレポート生成 */
export async function handleMeshReport(
  client: EstatApiClient,
  options: ReportOptions,
): Promise<void> {
  const meshCodes = options.mesh!
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

  if (meshCodes.length === 0) {
    throw new AppError("--mesh が空です", ["例: --mesh \"53394525,53394526\""]);
  }

  const invalidCodes = meshCodes.filter((code) => !isValidMeshCode(code));
  if (invalidCodes.length > 0) {
    throw new AppError(
      `不正なメッシュコード: ${invalidCodes.join(", ")}`,
      [
        "メッシュコードは4桁(1次), 6桁(2次), 8桁(3次), 9桁(半)のいずれかです。",
        "例: --mesh \"53394525\" (新宿区付近の3次メッシュ)",
      ],
    );
  }

  const meshStatsId = options.meshStatsId ?? DATASETS.meshPopulation.statsDataId;

  // キャッシュチェック
  const cached = await loadMeshDataFromCache(meshStatsId, meshCodes);
  let meshResult;

  if (cached) {
    console.log("メッシュデータ: キャッシュから読み込み");
    const metaInfo = await client.getMetaInfo(meshStatsId);
    const classObjs = extractClassObjects(metaInfo);
    const ageSelection = resolveAgeSelection(classObjs, {
      classId: options.classId,
      totalCode: options.totalCode,
      kidsCode: options.kidsCode,
    });
    const timeSelection = resolveLatestTime(classObjs, options.timeCode);
    meshResult = {
      data: cached,
      timeLabel: `${timeSelection.code} (${timeSelection.label})`,
      totalLabel: ageSelection.total.name,
      kidsLabel: ageSelection.kids.name,
      ageSelection,
    };
  } else {
    const metaInfo = await client.getMetaInfo(meshStatsId);
    meshResult = await buildMeshData({
      client,
      statsDataId: meshStatsId,
      meshCodes,
      metaInfo,
      selectors: {
        classId: options.classId,
        totalCode: options.totalCode,
        kidsCode: options.kidsCode,
      },
      timeCode: options.timeCode,
    });
    await saveMeshDataToCache(meshStatsId, meshCodes, meshResult.data);
  }

  const rows = meshDataToReportRows(meshCodes, meshResult);
  const outPath = resolveOutPath(options.out);

  if (rows.length === 0) {
    throw new AppError("指定メッシュコードのデータが取得できませんでした", [
      "--mesh-stats-id が正しいか確認してください。",
      `現在の statsDataId: ${meshStatsId}`,
      "townlens search --keyword \"地域メッシュ 人口\" で適切なIDを検索してください。",
    ]);
  }

  let html: string;

  if (options.scored) {
    const preset = findPreset(options.preset) ?? CHILDCARE_FOCUSED;
    const timeYear = meshResult.timeLabel.match(/\d{4}/)?.[0] ?? "不明";
    const scoringInput = meshRowsToScoringInput(rows, timeYear, meshStatsId);
    const results = scoreCities(scoringInput, POPULATION_INDICATORS, preset);

    html = renderScoredReportHtml({
      title: "メッシュ比較スコア レポート",
      generatedAt: new Date().toLocaleString("ja-JP"),
      cities: meshCodes,
      statsDataId: meshStatsId,
      timeLabel: meshResult.timeLabel,
      preset,
      results,
      definitions: POPULATION_INDICATORS,
      rawRows: rows,
      hasPriceData: false,
      hasCrimeData: false,
      hasDisasterData: false,
    });

    console.log(`メッシュスコア付きPDFを出力しました: ${outPath}`);
    console.log(`プリセット: ${preset.label}`);
    for (const r of [...results].sort((a, b) => a.rank - b.rank)) {
      if (r.starRating != null) {
        const filled = "\u2605";
        const empty = "\u2606";
        const rounded = Math.round(r.starRating);
        console.log(`  ${r.rank}位: ${r.cityName} (${filled.repeat(rounded)}${empty.repeat(5 - rounded)} ${r.starRating.toFixed(1)}/5.0)`);
      } else {
        console.log(`  ${r.rank}位: ${r.cityName} (スコア: ${r.compositeScore.toFixed(1)})`);
      }
    }
  } else {
    html = renderReportHtml({
      title: "メッシュ比較レポート",
      generatedAt: new Date().toLocaleString("ja-JP"),
      statsDataId: meshStatsId,
      timeLabel: meshResult.timeLabel,
      totalLabel: meshResult.totalLabel,
      kidsLabel: meshResult.kidsLabel,
      classInfo: `${meshResult.ageSelection.classId}: メッシュモード`,
      rows: [...rows],
    });

    console.log(`メッシュPDFを出力しました: ${outPath}`);
  }

  await renderPdfFromHtml(html, outPath);

  console.log(`メッシュコード数: ${meshCodes.length}`);
  console.log(`データ取得: ${rows.length}/${meshCodes.length} メッシュ`);
  console.log(`時点: ${meshResult.timeLabel}`);
}
