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
import { ensureDir } from "./utils";
import { DATASETS } from "./config/datasets";
import { inspectStatsData, formatInspectResult } from "./estat/inspect";

dotenv.config();

const program = new Command();
program.name("estat-report").description("e-Stat 市区町村比較レポートCLI").version("0.1.0");

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
      console.log("初期ファイルは既に存在します: estat.config.json, .env.example");
      return;
    }

    console.log(`作成: ${created.join(", ")}`);
    console.log("次に estat.config.json の statsDataId と ESTAT_APP_ID を設定してください。");
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
  .description("市区町村比較レポートをPDF出力")
  .requiredOption("--cities <list>", "市区町村名をカンマ区切りで指定")
  .option("--statsDataId <id>", "統計表ID")
  .option("--profile <name>", "profile名 (estat.config.json)")
  .option("--out <path>", "PDF出力先")
  .option("--classId <id>", "年齢区分の分類ID (例: cat01)")
  .option("--totalCode <code>", "総数の分類コード")
  .option("--kidsCode <code>", "0〜14歳の分類コード")
  .option("--timeCode <code>", "時間コード")
  .option("--scored", "スコア付きレポートを生成")
  .option("--preset <name>", "重みプリセット (childcare/price/safety)", "childcare")
  .option("--year <YYYY>", "不動産取引データの年 (デフォルト: 前年)")
  .option("--quarter <1-4>", "四半期 (1-4)")
  .option("--property-type <type>", "物件タイプ (condo/house/land/all)", "condo")
  .option("--budget-limit <万円>", "予算上限（万円）")
  .option("--no-price", "不動産価格データなしで実行")
  .option("--no-crime", "犯罪統計データなしで実行")
  .option("--crime-stats-id <id>", "犯罪統計の statsDataId")
  .option("--no-disaster", "災害リスクデータなしで実行")
  .action(
    async (options: {
      cities: string;
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
    }) => {
      const appId = requireAppId();
      const config = await loadConfig();
      const resolved = resolveStatsDataId({
        explicitStatsDataId: options.statsDataId,
        profileName: options.profile,
        config
      });

      const cityNames = options.cities
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      if (cityNames.length === 0) {
        throw new CliError("--cities が空です", ["例: --cities \"新宿区,横浜市,大阪市\""]);
      }

      const client = new EstatApiClient(appId);
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
          const reinfoKey = requireReinfoApiKey();
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
        }

        let hasCrimeData = false;

        if (options.crime) {
          const crimeStatsDataId = options.crimeStatsId ?? config.crimeStatsDataId ?? DATASETS.crime.statsDataId;
          if (!crimeStatsDataId) {
            console.log("犯罪統計の statsDataId が未設定のためスキップします。");
          } else {
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
            }
          }
        }

        let hasDisasterData = false;

        if (options.disaster) {
          const reinfoKey = requireReinfoApiKey();
          const disasterClient = new ReinfoApiClient(reinfoKey);
          const areaCodes = reportData.rows.map((r) => r.areaCode);
          const disasterData = await buildDisasterData(disasterClient, areaCodes);

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

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(formatError(error));
  const code = error instanceof CliError ? error.exitCode : 1;
  process.exit(code);
});
