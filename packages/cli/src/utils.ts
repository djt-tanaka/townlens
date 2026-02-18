/**
 * CLI専用のファイルシステム依存ユーティリティ。
 * @townlens/core から除外された fs 依存関数群。
 */

import fs from "node:fs/promises";
import path from "node:path";

/** ディレクトリが存在しなければ再帰的に作成する */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** PDF出力先パスを解決する。未指定の場合はタイムスタンプ付き自動命名 */
export function resolveOutPath(out?: string): string {
  if (out) {
    return path.resolve(out);
  }
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return path.resolve("out", `estat_report_${stamp}.pdf`);
}
