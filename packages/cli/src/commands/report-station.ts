/**
 * 駅圏モードのレポート生成ハンドラ。
 * 駅周辺のメッシュデータを集約し、駅圏比較レポートをPDF出力する。
 */

import {
  AppError,
  DATASETS,
  extractClassObjects,
  resolveLatestTime,
  scoreCities,
  findPreset,
  CHILDCARE_FOCUSED,
  POPULATION_INDICATORS,
} from "@townlens/core";
import type { EstatApiClient } from "@townlens/core";
import { buildMeshData } from "../mesh/mesh-data";
import { loadMeshDataFromCache, saveMeshDataToCache } from "../mesh/cache";
import { meshCodesInRadius } from "../mesh/geometry";
import type { MeshDataPoint } from "../mesh/types";
import { resolveStations } from "../station/resolver";
import { buildStationAreaRows, stationRowsToScoringInput } from "../station/area-builder";
import { renderReportHtml } from "../report/html";
import { renderScoredReportHtml } from "../report/templates/compose";
import { renderPdfFromHtml } from "../report/pdf";
import { resolveOutPath } from "../utils";
import type { ReportOptions } from "./types";

/** 駅圏モードのレポート生成 */
export async function handleStationReport(
  client: EstatApiClient,
  options: ReportOptions,
): Promise<void> {
  const stationNames = options.stations!
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (stationNames.length === 0) {
    throw new AppError("--stations が空です", [
      "例: --stations \"渋谷,新宿,池袋\"",
    ]);
  }

  const radiusM = Number(options.radius);
  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    throw new AppError("--radius は正の数値を指定してください", [
      "例: --radius 1000 (1000メートル = 1km圏)",
    ]);
  }

  // 駅名解決
  const resolutions = resolveStations(stationNames);

  // 各駅の圏内メッシュコードを列挙
  const meshLevel = 3 as const; // 3次メッシュ（約1km四方）
  const stationAreaInputs = resolutions.map((resolution) => {
    const entry = resolution.entries[0];
    const meshCodes = meshCodesInRadius(entry.lat, entry.lng, radiusM, meshLevel);
    return {
      stationName: resolution.stationName,
      meshCodes,
      lat: entry.lat,
      lng: entry.lng,
      areaCode: entry.areaCode,
    };
  });

  // 全駅圏のメッシュコードを統合（重複除去）
  const allMeshCodes = [
    ...new Set(stationAreaInputs.flatMap((area) => [...area.meshCodes])),
  ];

  console.log(`駅圏解決: ${resolutions.map((r) => r.stationName).join(", ")}`);
  console.log(`半径: ${radiusM}m, メッシュレベル: 3次, 合計メッシュ数: ${allMeshCodes.length}`);

  const meshStatsId = options.meshStatsId ?? DATASETS.meshPopulation.statsDataId;

  // キャッシュチェック + メッシュデータ取得
  const cached = await loadMeshDataFromCache(meshStatsId, allMeshCodes);
  let meshDataMap: ReadonlyMap<string, MeshDataPoint>;
  let timeLabel: string;

  if (cached) {
    console.log("メッシュデータ: キャッシュから読み込み");
    meshDataMap = cached;

    const metaInfo = await client.getMetaInfo(meshStatsId);
    const classObjs = extractClassObjects(metaInfo);
    const timeSelection = resolveLatestTime(classObjs, options.timeCode);
    timeLabel = `${timeSelection.code} (${timeSelection.label})`;
  } else {
    const metaInfo = await client.getMetaInfo(meshStatsId);
    const meshResult = await buildMeshData({
      client,
      statsDataId: meshStatsId,
      meshCodes: allMeshCodes,
      metaInfo,
      selectors: {
        classId: options.classId,
        totalCode: options.totalCode,
        kidsCode: options.kidsCode,
      },
      timeCode: options.timeCode,
    });
    meshDataMap = meshResult.data;
    timeLabel = meshResult.timeLabel;
    await saveMeshDataToCache(meshStatsId, allMeshCodes, meshResult.data);
  }

  // 駅圏集約 → ReportRow
  const rows = buildStationAreaRows(stationAreaInputs, meshDataMap, radiusM);
  const outPath = resolveOutPath(options.out);

  let html: string;

  if (options.scored) {
    const preset = findPreset(options.preset) ?? CHILDCARE_FOCUSED;
    const dataYear = timeLabel.match(/\d{4}/)?.[0] ?? "不明";
    const scoringInput = stationRowsToScoringInput(rows, dataYear, meshStatsId);
    const results = scoreCities(scoringInput, POPULATION_INDICATORS, preset);

    html = renderScoredReportHtml({
      title: "駅圏比較スコア レポート",
      generatedAt: new Date().toLocaleString("ja-JP"),
      cities: stationNames.map((n) => `${n}駅`),
      statsDataId: meshStatsId,
      timeLabel,
      preset,
      results,
      definitions: POPULATION_INDICATORS,
      rawRows: rows,
      hasPriceData: false,
      hasCrimeData: false,
      hasDisasterData: false,
    });

    console.log(`駅圏スコア付きPDFを出力しました: ${outPath}`);
    console.log(`プリセット: ${preset.label}`);
    for (const r of [...results].sort((a, b) => a.rank - b.rank)) {
      console.log(`  ${r.rank}位: ${r.cityName} (スコア: ${r.compositeScore.toFixed(1)})`);
    }
  } else {
    html = renderReportHtml({
      title: "駅圏比較レポート",
      generatedAt: new Date().toLocaleString("ja-JP"),
      statsDataId: meshStatsId,
      timeLabel,
      totalLabel: "総人口",
      kidsLabel: "0〜14歳",
      classInfo: "駅圏モード（メッシュ集約）",
      rows: [...rows],
    });

    console.log(`駅圏PDFを出力しました: ${outPath}`);
  }

  await renderPdfFromHtml(html, outPath);

  console.log(`駅数: ${stationNames.length}`);
  console.log(`時点: ${timeLabel}`);
}
