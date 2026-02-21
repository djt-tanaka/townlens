/**
 * Haversine公式による2点間の距離計算。
 */

/** 地球の平均半径(km) */
const EARTH_RADIUS_KM = 6371;

/** 度をラジアンに変換 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine公式で2点間の距離(km)を算出 */
export function haversineDistanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
