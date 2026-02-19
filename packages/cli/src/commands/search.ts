/**
 * search コマンド: 統計表をキーワード検索する。
 */

import type { Command } from "commander";
import type { CacheAdapter } from "@townlens/core";
import { EstatApiClient } from "@townlens/core";
import { requireAppId } from "./shared";

export function registerSearchCommand(program: Command, cache: CacheAdapter): void {
  program
    .command("search")
    .description("統計表を検索")
    .requiredOption("--keyword <text>", "検索キーワード")
    .option("--limit <n>", "件数", "20")
    .option("--json", "JSON形式で出力")
    .action(async (options: { keyword: string; limit: string; json?: boolean }) => {
      const appId = requireAppId();
      const client = new EstatApiClient(appId, { cache });
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
}
