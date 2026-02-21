/**
 * report コマンド: 市区町村・メッシュ・駅圏比較レポートを生成する。
 * モード判定を行い、各ハンドラに処理を委譲する。
 */

import type { Command } from "commander";
import type { CacheAdapter } from "@townlens/core";
import { AppError, EstatApiClient } from "@townlens/core";
import type { ReportOptions } from "./types";
import { requireAppId } from "./shared";
import { handleMunicipalityReport } from "./report-municipality";
import { handleMeshReport } from "./report-mesh";
import { handleStationReport } from "./report-station";

export function registerReportCommand(program: Command, cache: CacheAdapter): void {
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
    .option("--no-education", "教育統計データなしで実行")
    .option("--no-healthcare", "医療統計データなしで実行")
    .option("--interactive", "インタラクティブモードで実行")
    .action(async (rawOptions: ReportOptions) => {
      // インタラクティブモードの場合、ユーザー入力でオプションを上書き
      const options = await applyInteractiveSession(rawOptions);

      validateModeSelection(options);

      const appId = requireAppId();
      const client = new EstatApiClient(appId, { cache });

      if (options.mesh) {
        await handleMeshReport(client, options);
        return;
      }

      if (options.stations) {
        await handleStationReport(client, options);
        return;
      }

      await handleMunicipalityReport(client, options, cache);
    });
}

/** インタラクティブモードの場合、ユーザー入力をオプションに反映する */
async function applyInteractiveSession(options: ReportOptions): Promise<ReportOptions> {
  if (!options.interactive) {
    return options;
  }

  const { runInteractiveSession } = await import("../interactive/prompts");
  const session = await runInteractiveSession();

  const modeOverrides = buildModeOverrides(session);

  return {
    ...options,
    ...modeOverrides,
    scored: session.scored,
    preset: session.preset,
  };
}

/** セッションのモードに応じたオプション上書き値を構築する */
function buildModeOverrides(session: { mode: string; targets: readonly string[]; radius?: number }): Partial<ReportOptions> {
  switch (session.mode) {
    case "municipality":
      return { cities: session.targets.join(",") };
    case "mesh":
      return { mesh: session.targets.join(",") };
    case "station": {
      const overrides: Partial<ReportOptions> = { stations: session.targets.join(",") };
      if (session.radius !== undefined) {
        return { ...overrides, radius: String(session.radius) };
      }
      return overrides;
    }
    default:
      return {};
  }
}

/** モード選択のバリデーション: 1つだけ選択されていることを検証する */
function validateModeSelection(options: ReportOptions): void {
  const modeCount = [options.cities, options.mesh, options.stations].filter(Boolean).length;

  if (modeCount === 0) {
    throw new AppError("--cities, --mesh, --stations のいずれかを指定してください", [
      "市区町村モード:  --cities \"新宿区,渋谷区\"",
      "メッシュモード:   --mesh \"53394525,53394526\"",
      "駅圏モード:      --stations \"渋谷,新宿\" --radius 1000",
      "インタラクティブ: --interactive",
    ]);
  }

  if (modeCount > 1) {
    throw new AppError("--cities, --mesh, --stations は同時に指定できません", [
      "いずれか1つのモードを選択してください。",
    ]);
  }
}
