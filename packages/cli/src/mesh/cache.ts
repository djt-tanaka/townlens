/**
 * メッシュ人口データのキャッシュモジュール。
 * `.cache/mesh/` にJSON形式で保存し、同じクエリの再実行時にAPI呼び出しを削減する。
 *
 * キャッシュキー: statsDataId + ソート済みメッシュコードのMD5ハッシュ
 * TTL: 30日（国勢調査データは更新頻度が低い）
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ensureDir } from "../utils";
import type { MeshDataPoint } from "./types";

const MESH_CACHE_DIR = path.resolve(".cache", "mesh");
const MESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CachedMeshData {
  readonly data: ReadonlyArray<MeshDataPoint>;
  readonly fetchedAt: string;
}

function cacheKey(
  statsDataId: string,
  meshCodes: ReadonlyArray<string>,
): string {
  const sorted = [...meshCodes].sort().join(",");
  const hash = crypto
    .createHash("md5")
    .update(`${statsDataId}:${sorted}`)
    .digest("hex")
    .substring(0, 12);
  return `mesh_${statsDataId}_${hash}`;
}

function cachePath(key: string): string {
  return path.join(MESH_CACHE_DIR, `${key}.json`);
}

/** キャッシュからメッシュデータを読み込む。TTL超過またはファイル不在の場合はnullを返す。 */
export async function loadMeshDataFromCache(
  statsDataId: string,
  meshCodes: ReadonlyArray<string>,
): Promise<ReadonlyMap<string, MeshDataPoint> | null> {
  const key = cacheKey(statsDataId, meshCodes);
  const filePath = cachePath(key);

  try {
    const stat = await fs.stat(filePath);
    if (Date.now() - stat.mtimeMs > MESH_TTL_MS) {
      return null;
    }
    const content = await fs.readFile(filePath, "utf8");
    const cached: CachedMeshData = JSON.parse(content);
    const map = new Map<string, MeshDataPoint>();
    for (const point of cached.data) {
      map.set(point.meshCode, point);
    }
    return map;
  } catch {
    return null;
  }
}

/** メッシュデータをキャッシュに保存する */
export async function saveMeshDataToCache(
  statsDataId: string,
  meshCodes: ReadonlyArray<string>,
  data: ReadonlyMap<string, MeshDataPoint>,
): Promise<void> {
  await ensureDir(MESH_CACHE_DIR);
  const key = cacheKey(statsDataId, meshCodes);
  const filePath = cachePath(key);

  const cached: CachedMeshData = {
    data: [...data.values()],
    fetchedAt: new Date().toISOString(),
  };

  await fs.writeFile(
    filePath,
    `${JSON.stringify(cached, null, 2)}\n`,
    "utf8",
  );
}
