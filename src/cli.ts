#!/usr/bin/env node
import dotenv from "dotenv";
import { Command } from "commander";
import { formatError, CliError } from "./errors";
import { loadConfig, resolveStatsDataId, writeInitFiles } from "./config/config";
import { EstatApiClient } from "./estat/client";
import { loadMetaInfoWithCache } from "./estat/cache";
import { buildReportData, toScoringInput } from "./estat/report-data";
import { renderReportHtml } from "./report/html";
import { renderScoredReportHtml } from "./report/templates/compose";
import { renderPdfFromHtml } from "./report/pdf";
import { scoreCities } from "./scoring";
import { POPULATION_INDICATORS, ALL_INDICATORS, findPreset, CHILDCARE_FOCUSED } from "./scoring/presets";
import { ReinfoApiClient } from "./reinfo/client";
import { buildPriceData } from "./reinfo/price-data";
import { mergePriceIntoScoringInput } from "./reinfo/merge-scoring";
import { PropertyType, PROPERTY_TYPE_LABELS } from "./reinfo/types";
import { buildCrimeData } from "./estat/crime-data";
import { mergeCrimeIntoScoringInput } from "./estat/merge-crime-scoring";
import { buildDisasterData } from "./reinfo/disaster-data";
import { mergeDisasterIntoScoringInput } from "./reinfo/merge-disaster-scoring";
import { ensureDir, resolveOutPath } from "./utils";
import { DATASETS } from "./config/datasets";
import { inspectStatsData, formatInspectResult } from "./estat/inspect";
import { buildMeshData, meshDataToReportRows, meshRowsToScoringInput } from "./mesh/mesh-data";
import { loadMeshDataFromCache, saveMeshDataToCache } from "./mesh/cache";
import { isValidMeshCode, meshCodesInRadius } from "./mesh/geometry";
import { resolveStations } from "./station/resolver";
import { buildStationAreaRows, stationRowsToScoringInput } from "./station/area-builder";

dotenv.config();

const program = new Command();
program.name("townlens").description("市区町村比較スコアリングCLI — TownLens").version("0.1.0");

function requireAppId(): string {
  const appId = process.env.ESTAT_APP_ID;
  if (!appId) {
    throw new CliError(
      "環境変数 ESTAT_APP_ID が未設定です",
      [
        "e-Stat の appId を取得して ESTAT_APP_ID に設定してください。",
        ".env を使う場合は ESTAT_APP_ID=<YOUR_APP_ID> を記述してください。"
      ],
      undefined,
      2
    );
  }
  return appId;
}

function requireReinfoApiKey(): string {
  const key = process.env.REINFOLIB_API_KEY;
  if (!key) {
    throw new CliError(
      "環境変数 REINFOLIB_API_KEY が未設定です",
      [
        "不動産情報ライブラリのAPIキーを取得して設定してください。",
        "APIキー申請: https://www.reinfolib.mlit.go.jp/api/request/",
        "価格データなしで実行する場合は --no-price を指定してください。",
      ],
      undefined,
      2
    );
  }
  return key;
}

program
  .command("init")
  .description("初期設定ファイルを生成")
  .action(async () => {
    const created = await writeInitFiles();
    await ensureDir(".cache/estat");
    await ensureDir(".cache/reinfo");
    await ensureDir("out");

    if (created.length === 0) {
      console.log("初期ファイルは既に存在します: townlens.config.json, .env.example");
      return;
    }

    console.log(`作成: ${created.join(", ")}`);
    console.log("次に townlens.config.json の statsDataId と ESTAT_APP_ID を設定してください。");
    console.log("");
    console.log("  export ESTAT_APP_ID=<YOUR_APP_ID>");
    console.log("");
    console.log("または .env ファイルに ESTAT_APP_ID=<YOUR_APP_ID> を記述してください。");
  });

program
  .command("search")
  .description("統計表を検索")
  .requiredOption("--keyword <text>", "検索キーワード")
  .option("--limit <n>", "件数", "20")
  .option("--json", "JSON形式で出力")
  .action(async (options: { keyword: string; limit: string; json?: boolean }) => {
    const appId = requireAppId();
    const client = new EstatApiClient(appId);
    const limit = Number(options.limit);

    const items = await client.getStatsList(options.keyword, Number.isFinite(limit) ? limit : 20);

    if (items.length === 0) {
      if (options.json) {
        console.log("[]");
      } else {
        console.log("検索結果がありませんでした。");
      }
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    console.log(`検索結果: ${items.length}件`);
    for (const item of items) {
      console.log(`- ${item.id} | ${item.title} | ${item.statName} | ${item.surveyDate}`);
    }
  });

program
  .command("inspect")
  .description("統計表のメタデータを検査し、レポート生成の可否を診断")
  .requiredOption("--statsDataId <id>", "検査する統計表ID")
  .option("--json", "JSON形式で出力")
  .action(async (options: { statsDataId: string; json?: boolean }) => {
    const appId = requireAppId();
    const client = new EstatApiClient(appId);
    const result = await inspectStatsData(client, options.statsDataId);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(formatInspectResult(result));
  });

program
  .command("report")
  .description("市区町村・メッシュ・駅圏比較レポートをPDF出力")
  .option("--cities <list>", "市区町村名をカンマ区切りで指定")
  .option("--mesh <codes>", "メッシュコードをカンマ区切りで指定（8桁=3次メッシュ）")
  .option("--stations <list>", "駅名をカンマ区切りで指定（例: 渋谷,新宿）")
  .option("--radius <meters>", "駅圏の半径（メートル）", "1000")
  .option("--mesh-stats-id <id>", "メッシュ統計の statsDataId")
  .option("--statsDataId <id>", "統計表ID")
  .option("--profile <name>", "profile名 (townlens.config.json)")
  .option("--out <path>", "PDF出力先")
  .option("--classId <id>", "年齢区分の分類ID (例: cat01)")
  .option("--totalCode <code>", "総数の分類コード")
  .option("--kidsCode <code>", "0〜14歳の分類コード")
  .option("--timeCode <code>", "時間コード")
  .option("--no-scored", "スコアなし基本レポートで生成")
  .option("--preset <name>", "重みプリセット (childcare/price/safety)", "childcare")
  .option("--year <YYYY>", "不動産取引データの年 (デフォルト: 前年)")
  .option("--quarter <1-4>", "四半期 (1-4)")
  .option("--property-type <type>", "物件タイプ (condo/house/land/all)", "condo")
  .option("--budget-limit <万円>", "予算上限（万円）")
  .option("--no-price", "不動産価格データなしで実行")
  .option("--no-crime", "犯罪統計データなしで実行")
  .option("--crime-stats-id <id>", "犯罪統計の statsDataId")
  .option("--no-disaster", "災害リスクデータなしで実行")
  .option("--interactive", "インタラクティブモードで実行")
  .action(
    async (options: {
      cities?: string;
      mesh?: string;
      stations?: string;
      radius: string;
      meshStatsId?: string;
      statsDataId?: string;
      profile?: string;
      out?: string;
      classId?: string;
      totalCode?: string;
      kidsCode?: string;
      timeCode?: string;
      scored?: boolean;
      preset: string;
      year?: string;
      quarter?: string;
      propertyType: string;
      budgetLimit?: string;
      price: boolean;
      crime: boolean;
      crimeStatsId?: string;
      disaster: boolean;
      interactive?: boolean;
    }) => {
      // インタラクティブモード
      if (options.interactive) {
        const { runInteractiveSession } = await import("./interactive/prompts");
        const session = await runInteractiveSession();

        switch (session.mode) {
          case "municipality":
            options.cities = session.targets.join(",");
            break;
          case "mesh":
            options.mesh = session.targets.join(",");
            break;
          case "station":
            options.stations = session.targets.join(",");
            if (session.radius !== undefined) {
              options.radius = String(session.radius);
            }
            break;
        }
        options.scored = session.scored;
        options.preset = session.preset;
      }

      const modeCount = [options.cities, options.mesh, options.stations].filter(Boolean).length;
      if (modeCount === 0) {
        throw new CliError("--cities, --mesh, --stations のいずれかを指定してください", [
          "市区町村モード:  --cities \"新宿区,渋谷区\"",
          "メッシュモード:   --mesh \"53394525,53394526\"",
          "駅圏モード:      --stations \"渋谷,新宿\" --radius 1000",
          "インタラクティブ: --interactive",
        ]);
      }
      if (modeCount > 1) {
        throw new CliError("--cities, --mesh, --stations は同時に指定できません", [
          "いずれか1つのモードを選択してください。",
        ]);
      }

      const appId = requireAppId();
      const client = new EstatApiClient(appId);

      // メッシュモード
      if (options.mesh) {
        await handleMeshReport(client, options);
        return;
      }

      // 駅圏モード
      if (options.stations) {
        await handleStationReport(client, options);
        return;
      }

      // 市区町村モード（既存フロー）
      const config = await loadConfig();
      const resolved = resolveStatsDataId({
        explicitStatsDataId: options.statsDataId,
        profileName: options.profile,
        config
      });

      const cityNames = options.cities!
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      if (cityNames.length === 0) {
        throw new CliError("--cities が空です", ["例: --cities \"新宿区,横浜市,大阪市\""]);
      }

      const metaInfo = await loadMetaInfoWithCache(client, resolved.statsDataId);

      const reportData = await buildReportData({
        client,
        statsDataId: resolved.statsDataId,
        cityNames,
        outPath: options.out,
        selectors: {
          ...resolved.selectors,
          classId: options.classId ?? resolved.selectors?.classId,
          totalCode: options.totalCode ?? resolved.selectors?.totalCode,
          kidsCode: options.kidsCode ?? resolved.selectors?.kidsCode
        },
        timeCode: options.timeCode,
        metaInfo
      });

      let html: string;

      if (options.scored) {
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
          throw new CliError("--budget-limit は正の数値を指定してください", ["例: --budget-limit 5000"]);
        }
        const propertyTypeLabel = PROPERTY_TYPE_LABELS[propertyType];

        if (options.price) {
          const reinfoKey = process.env.REINFOLIB_API_KEY;
          if (!reinfoKey) {
            console.log("REINFOLIB_API_KEY 未設定のため不動産価格データをスキップします。");
          } else {
            try {
              const reinfoClient = new ReinfoApiClient(reinfoKey);
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

        let hasCrimeData = false;

        if (options.crime) {
          const crimeStatsDataId = options.crimeStatsId ?? config.crimeStatsDataId ?? DATASETS.crime.statsDataId;
          if (!crimeStatsDataId) {
            console.log("犯罪統計の statsDataId が未設定のためスキップします。");
          } else {
            try {
              const crimeData = await buildCrimeData(client, reportData.rows.map((r) => r.areaCode), {
                statsDataId: crimeStatsDataId,
              });

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

        let hasDisasterData = false;

        if (options.disaster) {
          const reinfoKey = process.env.REINFOLIB_API_KEY;
          if (!reinfoKey) {
            console.log("REINFOLIB_API_KEY 未設定のため災害リスクデータをスキップします。");
          } else {
            try {
              const disasterClient = new ReinfoApiClient(reinfoKey);
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

        const results = scoreCities(scoringInput, definitions, preset);

        html = renderScoredReportHtml({
          title: "引っ越し先スコア レポート（子育て世帯向け）",
          generatedAt: new Date().toLocaleString("ja-JP"),
          cities: cityNames,
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
        });

        console.log(`スコア付きPDFを出力しました: ${reportData.outPath}`);
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
        for (const r of [...results].sort((a, b) => a.rank - b.rank)) {
          console.log(`  ${r.rank}位: ${r.cityName} (スコア: ${r.compositeScore.toFixed(1)}, 信頼度: ${r.confidence.level})`);
        }
      } else {
        html = renderReportHtml({
          title: "市区町村比較レポート（子育て世帯向け・MVP）",
          generatedAt: new Date().toLocaleString("ja-JP"),
          statsDataId: `${resolved.statsDataId} (${resolved.source})`,
          timeLabel: reportData.timeLabel,
          totalLabel: reportData.totalLabel,
          kidsLabel: reportData.kidsLabel,
          classInfo: `${reportData.ageSelection.classId}: ${reportData.ageSelection.total.code}(${reportData.totalLabel}) / ${reportData.ageSelection.kids.code}(${reportData.kidsLabel})`,
          rows: reportData.rows
        });

        console.log(`PDFを出力しました: ${reportData.outPath}`);
      }

      await renderPdfFromHtml(html, reportData.outPath);

      console.log(`時点: ${reportData.timeLabel}`);
      console.log(`年齢分類: ${reportData.ageSelection.classId}`);
      console.log(`総数: ${reportData.totalLabel}(${reportData.ageSelection.total.code})`);
      console.log(`0〜14: ${reportData.kidsLabel}(${reportData.ageSelection.kids.code})`);
    }
  );

/** メッシュモードのレポート生成 */
async function handleMeshReport(
  client: EstatApiClient,
  options: {
    mesh?: string;
    meshStatsId?: string;
    out?: string;
    classId?: string;
    totalCode?: string;
    kidsCode?: string;
    timeCode?: string;
    scored?: boolean;
    preset: string;
  },
): Promise<void> {
  const meshCodes = options.mesh!
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

  if (meshCodes.length === 0) {
    throw new CliError("--mesh が空です", ["例: --mesh \"53394525,53394526\""]);
  }

  const invalidCodes = meshCodes.filter((code) => !isValidMeshCode(code));
  if (invalidCodes.length > 0) {
    throw new CliError(
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
    const metaInfo = await loadMetaInfoWithCache(client, meshStatsId);
    const { extractClassObjects, resolveAgeSelection, resolveLatestTime } = await import("./estat/meta");
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
    const metaInfo = await loadMetaInfoWithCache(client, meshStatsId);
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
    throw new CliError("指定メッシュコードのデータが取得できませんでした", [
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
      console.log(`  ${r.rank}位: ${r.cityName} (スコア: ${r.compositeScore.toFixed(1)})`);
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

/** 駅圏モードのレポート生成 */
async function handleStationReport(
  client: EstatApiClient,
  options: {
    stations?: string;
    radius: string;
    meshStatsId?: string;
    out?: string;
    classId?: string;
    totalCode?: string;
    kidsCode?: string;
    timeCode?: string;
    scored?: boolean;
    preset: string;
  },
): Promise<void> {
  const stationNames = options.stations!
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (stationNames.length === 0) {
    throw new CliError("--stations が空です", [
      "例: --stations \"渋谷,新宿,池袋\"",
    ]);
  }

  const radiusM = Number(options.radius);
  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    throw new CliError("--radius は正の数値を指定してください", [
      "例: --radius 1000 (1000メートル = 1km圏)",
    ]);
  }

  // 駅名解決
  const resolutions = resolveStations(stationNames);

  // 各駅の圏内メッシュコードを列挙
  const meshLevel = 3 as const; // 3次メッシュ（≒1km²）
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
  let meshDataMap: ReadonlyMap<string, import("./mesh/types").MeshDataPoint>;
  let timeLabel: string;

  if (cached) {
    console.log("メッシュデータ: キャッシュから読み込み");
    meshDataMap = cached;

    const metaInfo = await loadMetaInfoWithCache(client, meshStatsId);
    const { extractClassObjects, resolveLatestTime } = await import("./estat/meta");
    const classObjs = extractClassObjects(metaInfo);
    const timeSelection = resolveLatestTime(classObjs, options.timeCode);
    timeLabel = `${timeSelection.code} (${timeSelection.label})`;
  } else {
    const metaInfo = await loadMetaInfoWithCache(client, meshStatsId);
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

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(formatError(error));
  const code = error instanceof CliError ? error.exitCode : 1;
  process.exit(code);
});
