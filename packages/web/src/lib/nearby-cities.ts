/**
 * 近隣都市検索ロジック。
 * CITY_LOCATIONS に登録されている都市から、Haversine 距離で近い順に返す。
 */

import { CITY_LOCATIONS } from "@townlens/core";
import type { CityLocation } from "@townlens/core";
import { getPrefectureName } from "./prefectures";

/** 地球の平均半径(km) */
const EARTH_RADIUS_KM = 6371;

/** Haversine 公式で2点間の距離(km)を算出 */
function haversineDistance(a: CityLocation, b: CityLocation): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface RelatedCity {
  readonly code: string;
  readonly name: string;
  readonly prefecture: string;
  readonly distance: number;
}

/** 近隣都市を距離順で返す（自身を除く） */
export function findNearbyCities(
  areaCode: string,
  limit = 6,
): ReadonlyArray<RelatedCity> {
  const target = CITY_LOCATIONS.get(areaCode);
  if (!target) return [];

  const candidates = [...CITY_LOCATIONS.entries()]
    .filter(([code]) => code !== areaCode)
    .map(([code, loc]) => ({
      code,
      name: loc.name,
      prefecture: getPrefectureName(code),
      distance: Math.round(haversineDistance(target, loc)),
    }))
    .sort((a, b) => a.distance - b.distance);

  return candidates.slice(0, limit);
}
