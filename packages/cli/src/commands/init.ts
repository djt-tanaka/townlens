/**
 * init コマンド: 初期設定ファイルを生成する。
 */

import type { Command } from "commander";
import { writeInitFiles } from "../config/config";
import { ensureDir } from "../utils";

export function registerInitCommand(program: Command): void {
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
}
