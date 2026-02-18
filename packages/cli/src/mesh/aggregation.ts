/**
 * 複数メッシュの人口データを集約するモジュール。
 */
import type { MeshDataPoint, AggregatedMeshData } from "./types";

/** 複数メッシュのデータを集約する */
export function aggregateMeshData(
  meshData: ReadonlyMap<string, MeshDataPoint>,
  requestedCount: number,
): AggregatedMeshData {
  let totalPopulation = 0;
  let totalKids = 0;
  let validCount = 0;

  for (const point of meshData.values()) {
    if (point.population !== undefined) {
      totalPopulation += point.population;
      validCount++;
    }
    if (point.kidsPopulation !== undefined) {
      totalKids += point.kidsPopulation;
    }
  }

  const kidsRatio = totalPopulation > 0
    ? (totalKids / totalPopulation) * 100
    : 0;

  const coverageRate = requestedCount > 0
    ? validCount / requestedCount
    : 0;

  return {
    totalPopulation,
    totalKids,
    kidsRatio: Math.round(kidsRatio * 100) / 100,
    meshCount: validCount,
    coverageRate: Math.round(coverageRate * 1000) / 1000,
  };
}
