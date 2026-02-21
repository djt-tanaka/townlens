/**
 * 主要ターミナル駅定義と距離計算。
 * 市区町村からの最寄りターミナル駅距離を算出する。
 */

import type { StationEntry } from "./types";
import { haversineDistanceKm } from "./haversine";

/** 主要ターミナル駅リスト（首都圏・近畿圏・中部圏・その他主要都市） */
export const TERMINAL_STATIONS: ReadonlyArray<StationEntry> = [
  { name: "東京", lineName: "JR山手線", lat: 35.6812, lng: 139.7671 },
  { name: "新宿", lineName: "JR山手線", lat: 35.6896, lng: 139.7006 },
  { name: "渋谷", lineName: "JR山手線", lat: 35.6580, lng: 139.7016 },
  { name: "池袋", lineName: "JR山手線", lat: 35.7295, lng: 139.7109 },
  { name: "品川", lineName: "JR山手線", lat: 35.6285, lng: 139.7387 },
  { name: "横浜", lineName: "JR京浜東北線", lat: 35.4660, lng: 139.6223 },
  { name: "大宮", lineName: "JR京浜東北線", lat: 35.9066, lng: 139.6238 },
  { name: "大阪", lineName: "JR東海道線", lat: 34.7025, lng: 135.4959 },
  { name: "京都", lineName: "JR東海道線", lat: 34.9858, lng: 135.7588 },
  { name: "名古屋", lineName: "JR東海道線", lat: 35.1709, lng: 136.8815 },
  { name: "博多", lineName: "JR鹿児島本線", lat: 33.5898, lng: 130.4207 },
  { name: "札幌", lineName: "JR函館本線", lat: 43.0687, lng: 141.3508 },
  { name: "仙台", lineName: "JR東北本線", lat: 38.2600, lng: 140.8825 },
  { name: "三ノ宮", lineName: "JR東海道線", lat: 34.6933, lng: 135.1957 },
  { name: "広島", lineName: "JR山陽新幹線", lat: 34.3963, lng: 132.4752 },
];

export interface TerminalDistance {
  readonly stationName: string;
  readonly distanceKm: number;
}

/** 指定地点から最寄りのターミナル駅までの距離情報を返す */
export function nearestTerminalDistance(
  lat: number,
  lng: number,
): TerminalDistance {
  let nearest: TerminalDistance = {
    stationName: TERMINAL_STATIONS[0].name,
    distanceKm: Infinity,
  };

  for (const station of TERMINAL_STATIONS) {
    const dist = haversineDistanceKm(lat, lng, station.lat, station.lng);
    if (dist < nearest.distanceKm) {
      nearest = { stationName: station.name, distanceKm: dist };
    }
  }

  return nearest;
}

/** 指定地点から最寄りのターミナル駅までの距離(km)を返す */
export function nearestTerminalDistanceKm(
  lat: number,
  lng: number,
): number {
  return nearestTerminalDistance(lat, lng).distanceKm;
}
