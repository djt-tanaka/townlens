/**
 * inspect コマンド: 統計表のメタデータを検査し、レポート生成の可否を診断する。
 */

import type { Command } from "commander";
import type { CacheAdapter } from "@townlens/core";
import { EstatApiClient } from "@townlens/core";
import { inspectStatsData, formatInspectResult } from "../estat/inspect";
import { requireAppId } from "./shared";

export function registerInspectCommand(program: Command, cache: CacheAdapter): void {
  program
    .command("inspect")
    .description("統計表のメタデータを検査し、レポート生成の可否を診断")
    .requiredOption("--statsDataId <id>", "検査する統計表ID")
    .option("--json", "JSON形式で出力")
    .action(async (options: { statsDataId: string; json?: boolean }) => {
      const appId = requireAppId();
      const client = new EstatApiClient(appId, { cache });
      const result = await inspectStatsData(client, options.statsDataId);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(formatInspectResult(result));
    });
}
