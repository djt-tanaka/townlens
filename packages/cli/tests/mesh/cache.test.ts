import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { loadMeshDataFromCache, saveMeshDataToCache } from "../../src/mesh/cache";
import type { MeshDataPoint } from "../../src/mesh/types";

const TEST_CACHE_DIR = path.resolve(".cache", "mesh");

describe("メッシュデータキャッシュ", () => {
  const testMeshCodes = ["53394525", "53394526"];
  const testStatsDataId = "test-stats-id";

  const testData: ReadonlyMap<string, MeshDataPoint> = new Map([
    ["53394525", { meshCode: "53394525", population: 1200, kidsPopulation: 150, kidsRatio: 12.5 }],
    ["53394526", { meshCode: "53394526", population: 800, kidsPopulation: 90, kidsRatio: 11.25 }],
  ]);

  afterEach(async () => {
    // テスト用キャッシュファイルをクリーンアップ
    try {
      const files = await fs.readdir(TEST_CACHE_DIR);
      for (const file of files) {
        if (file.startsWith("mesh_test-stats-id_")) {
          await fs.unlink(path.join(TEST_CACHE_DIR, file));
        }
      }
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  });

  it("キャッシュが存在しない場合nullを返す", async () => {
    const result = await loadMeshDataFromCache("nonexistent-id", ["99999999"]);
    expect(result).toBeNull();
  });

  it("保存したデータを正しく読み込める", async () => {
    await saveMeshDataToCache(testStatsDataId, testMeshCodes, testData);
    const loaded = await loadMeshDataFromCache(testStatsDataId, testMeshCodes);

    expect(loaded).not.toBeNull();
    expect(loaded!.size).toBe(2);
    expect(loaded!.get("53394525")?.population).toBe(1200);
    expect(loaded!.get("53394526")?.kidsPopulation).toBe(90);
  });

  it("異なるメッシュコードセットは異なるキャッシュキーになる", async () => {
    await saveMeshDataToCache(testStatsDataId, testMeshCodes, testData);

    const differentCodes = ["53394527", "53394528"];
    const result = await loadMeshDataFromCache(testStatsDataId, differentCodes);
    expect(result).toBeNull();
  });

  it("メッシュコードの順序が異なっても同じキャッシュキーになる", async () => {
    await saveMeshDataToCache(testStatsDataId, ["53394526", "53394525"], testData);
    const loaded = await loadMeshDataFromCache(testStatsDataId, ["53394525", "53394526"]);

    expect(loaded).not.toBeNull();
    expect(loaded!.size).toBe(2);
  });
});
