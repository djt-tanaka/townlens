#!/usr/bin/env node
import dotenv from "dotenv";
import { Command } from "commander";
import { formatError, CliError } from "./errors";
import { loadConfig, resolveStatsDataId, writeInitFiles } from "./config/config";
import { EstatApiClient } from "./estat/client";
import { loadMetaInfoWithCache } from "./estat/cache";
import { buildReportData } from "./estat/report-data";
import { renderReportHtml } from "./report/html";
import { renderPdfFromHtml } from "./report/pdf";
import { ensureDir } from "./utils";

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

program
  .command("init")
  .description("初期設定ファイルを生成")
  .action(async () => {
    const created = await writeInitFiles();
    await ensureDir(".cache/estat");
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

      const html = renderReportHtml({
        title: "市区町村比較レポート（子育て世帯向け・MVP）",
        generatedAt: new Date().toLocaleString("ja-JP"),
        statsDataId: `${resolved.statsDataId} (${resolved.source})`,
        timeLabel: reportData.timeLabel,
        totalLabel: reportData.totalLabel,
        kidsLabel: reportData.kidsLabel,
        classInfo: `${reportData.ageSelection.classId}: ${reportData.ageSelection.total.code}(${reportData.totalLabel}) / ${reportData.ageSelection.kids.code}(${reportData.kidsLabel})`,
        rows: reportData.rows
      });

      await renderPdfFromHtml(html, reportData.outPath);

      console.log(`PDFを出力しました: ${reportData.outPath}`);
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
