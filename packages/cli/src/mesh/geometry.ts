/**
 * JIS X 0410 標準地域メッシュのコード演算モジュール。
 * 緯度経度からメッシュコードへの変換、逆変換、半径内メッシュ列挙を行う。
 *
 * メッシュ体系:
 * - 1次メッシュ(4桁): 緯度40分 × 経度1度 (約80km)
 * - 2次メッシュ(6桁): 緯度5分 × 経度7.5分 (約10km)
 * - 3次メッシュ(8桁): 緯度30秒 × 経度45秒 (約1km)
 * - 半メッシュ(9桁): 3次の4分割 (約500m)
 */

import type { MeshLevel } from "../geo/types";

/** 緯度経度からメッシュコードを算出する */
export function latLngToMeshCode(lat: number, lng: number, level: MeshLevel): string {
  // 1次メッシュ
  const lat1 = Math.floor(lat * 1.5);
  const lng1 = Math.floor(lng) - 100;
  const code1 = `${String(lat1).padStart(2, "0")}${String(lng1).padStart(2, "0")}`;
  if (level === 1) return code1;

  // 1次メッシュ南西端からの残余
  const latRem1 = lat - lat1 / 1.5;
  const lngRem1 = lng - (lng1 + 100);

  // 2次メッシュ: 1次を緯度8分割×経度8分割
  const lat2 = Math.floor(latRem1 / (5 / 60));   // 5分刻み
  const lng2 = Math.floor(lngRem1 / (7.5 / 60)); // 7.5分刻み
  const code2 = `${code1}${lat2}${lng2}`;
  if (level === 2) return code2;

  // 2次メッシュ南西端からの残余
  const latRem2 = latRem1 - lat2 * (5 / 60);
  const lngRem2 = lngRem1 - lng2 * (7.5 / 60);

  // 3次メッシュ: 2次を緯度10分割×経度10分割
  const lat3 = Math.floor(latRem2 / (30 / 3600));   // 30秒刻み
  const lng3 = Math.floor(lngRem2 / (45 / 3600));   // 45秒刻み
  const code3 = `${code2}${lat3}${lng3}`;
  if (level === 3) return code3;

  // 半メッシュ: 3次を2×2の4分割
  const latRem3 = latRem2 - lat3 * (30 / 3600);
  const lngRem3 = lngRem2 - lng3 * (45 / 3600);
  const halfLat = Math.floor(latRem3 / (15 / 3600));
  const halfLng = Math.floor(lngRem3 / (22.5 / 3600));
  // 半メッシュコード: 南西=1, 南東=2, 北西=3, 北東=4
  const halfCode = halfLat * 2 + halfLng + 1;
  return `${code3}${halfCode}`;
}

/** メッシュコードの南西端の緯度経度を算出する */
function meshCodeToSouthWest(code: string): { readonly lat: number; readonly lng: number } {
  const level = detectMeshLevel(code);
  if (level === null) {
    throw new Error(`不正なメッシュコード: ${code}`);
  }

  const lat1 = parseInt(code.substring(0, 2), 10);
  const lng1 = parseInt(code.substring(2, 4), 10);
  let lat = lat1 / 1.5;
  let lng = lng1 + 100;

  if (level === 1) return { lat, lng };

  const lat2 = parseInt(code[4], 10);
  const lng2 = parseInt(code[5], 10);
  lat += lat2 * (5 / 60);
  lng += lng2 * (7.5 / 60);

  if (level === 2) return { lat, lng };

  const lat3 = parseInt(code[6], 10);
  const lng3 = parseInt(code[7], 10);
  lat += lat3 * (30 / 3600);
  lng += lng3 * (45 / 3600);

  if (level === 3) return { lat, lng };

  // 半メッシュ
  const half = parseInt(code[8], 10);
  const halfLat = Math.floor((half - 1) / 2);
  const halfLng = (half - 1) % 2;
  lat += halfLat * (15 / 3600);
  lng += halfLng * (22.5 / 3600);

  return { lat, lng };
}

/** メッシュレベルに応じたセルサイズ（度単位） */
function meshCellSize(level: MeshLevel): { readonly dLat: number; readonly dLng: number } {
  switch (level) {
    case 1:
      return { dLat: 40 / 60, dLng: 1 };
    case 2:
      return { dLat: 5 / 60, dLng: 7.5 / 60 };
    case 3:
      return { dLat: 30 / 3600, dLng: 45 / 3600 };
    case "half":
      return { dLat: 15 / 3600, dLng: 22.5 / 3600 };
  }
}

/** メッシュコードの中心緯度経度を算出する */
export function meshCodeToCenter(code: string): { readonly lat: number; readonly lng: number } {
  const sw = meshCodeToSouthWest(code);
  const level = detectMeshLevel(code);
  if (level === null) {
    throw new Error(`不正なメッシュコード: ${code}`);
  }
  const cell = meshCellSize(level);
  return {
    lat: sw.lat + cell.dLat / 2,
    lng: sw.lng + cell.dLng / 2,
  };
}

/** メッシュコードの桁数からレベルを判定する。不正な場合はnullを返す。 */
export function detectMeshLevel(code: string): MeshLevel | null {
  if (!/^\d+$/.test(code)) return null;
  switch (code.length) {
    case 4: return 1;
    case 6: return 2;
    case 8: return 3;
    case 9: return "half";
    default: return null;
  }
}

/** メッシュコードの妥当性を検証する */
export function isValidMeshCode(code: string): boolean {
  return detectMeshLevel(code) !== null;
}

/** 隣接8メッシュのコードを返す（同レベル） */
export function getAdjacentMeshCodes(code: string): ReadonlyArray<string> {
  const center = meshCodeToCenter(code);
  const level = detectMeshLevel(code);
  if (level === null) return [];
  const cell = meshCellSize(level);

  const offsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  return offsets.map(([dLatIdx, dLngIdx]) =>
    latLngToMeshCode(
      center.lat + dLatIdx * cell.dLat,
      center.lng + dLngIdx * cell.dLng,
      level,
    ),
  );
}

/** 緯度1度あたりの近似距離(m) */
const METERS_PER_LAT_DEGREE = 111_320;

/** 指定地点の半径(m)内に含まれるメッシュコード群を返す */
export function meshCodesInRadius(
  lat: number,
  lng: number,
  radiusM: number,
  level: MeshLevel,
): ReadonlyArray<string> {
  const centerCode = latLngToMeshCode(lat, lng, level);

  if (radiusM <= 0) return [centerCode];

  const cell = meshCellSize(level);
  // セルの緯度・経度方向のサイズ(m)
  const cellLatM = cell.dLat * METERS_PER_LAT_DEGREE;
  const cellLngM = cell.dLng * METERS_PER_LAT_DEGREE * Math.cos(lat * Math.PI / 180);

  // 半径をカバーするのに必要なセル数
  const latSteps = Math.ceil(radiusM / cellLatM);
  const lngSteps = Math.ceil(radiusM / cellLngM);

  const center = meshCodeToCenter(centerCode);
  const codes: string[] = [];
  const seen = new Set<string>();

  for (let dLat = -latSteps; dLat <= latSteps; dLat++) {
    for (let dLng = -lngSteps; dLng <= lngSteps; dLng++) {
      const candidateLat = center.lat + dLat * cell.dLat;
      const candidateLng = center.lng + dLng * cell.dLng;

      // 中心からの距離チェック（簡易的な楕円体近似）
      const distLat = (candidateLat - lat) * METERS_PER_LAT_DEGREE;
      const distLng = (candidateLng - lng) * METERS_PER_LAT_DEGREE * Math.cos(lat * Math.PI / 180);
      const dist = Math.sqrt(distLat * distLat + distLng * distLng);

      if (dist <= radiusM + Math.max(cellLatM, cellLngM)) {
        const code = latLngToMeshCode(candidateLat, candidateLng, level);
        if (!seen.has(code)) {
          seen.add(code);
          codes.push(code);
        }
      }
    }
  }

  return codes;
}
