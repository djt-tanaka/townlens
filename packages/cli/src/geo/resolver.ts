/**
 * GeoTarget構築ファサード。
 * メッシュコードや駅圏情報からGeoTargetオブジェクトを生成する。
 */

import type { GeoTarget } from "./types";
import { meshTarget } from "./types";
import { meshCodeToCenter, detectMeshLevel } from "../mesh/geometry";
import type { MeshDataPoint } from "../mesh/types";

/** メッシュコード群からMeshTarget配列を構築する */
export function buildMeshTargets(
  meshCodes: ReadonlyArray<string>,
  meshData: ReadonlyMap<string, MeshDataPoint>,
): ReadonlyArray<GeoTarget> {
  return meshCodes.map((code) => {
    const level = detectMeshLevel(code);
    if (level === null) {
      throw new Error(`不正なメッシュコード: ${code}`);
    }

    const center = meshCodeToCenter(code);
    const data = meshData.get(code);
    const label =
      data?.population !== undefined
        ? `メッシュ${code} (人口:${data.population})`
        : `メッシュ${code}`;

    return meshTarget(code, level, label, center);
  });
}
