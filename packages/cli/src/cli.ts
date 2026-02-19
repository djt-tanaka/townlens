#!/usr/bin/env node
/**
 * TownLens CLI エントリポイント。
 * 各コマンドは commands/ ディレクトリに分割されている。
 */

import dotenv from "dotenv";
import { Command } from "commander";
import { formatError, AppError } from "@townlens/core";
import { FileCacheAdapter } from "./cache/file-cache";
import { registerInitCommand } from "./commands/init";
import { registerSearchCommand } from "./commands/search";
import { registerInspectCommand } from "./commands/inspect";
import { registerReportCommand } from "./commands/report";

dotenv.config();

const cache = new FileCacheAdapter();

const program = new Command();
program.name("townlens").description("市区町村比較スコアリングCLI — TownLens").version("0.1.0");

registerInitCommand(program);
registerSearchCommand(program, cache);
registerInspectCommand(program, cache);
registerReportCommand(program, cache);

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(formatError(error));
  const code = error instanceof AppError ? (error.exitCode ?? 1) : 1;
  process.exit(code);
});
