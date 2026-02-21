/**
 * 都道府県ページ用データ層。
 * 地方ブロック定義、都道府県→都市マッピング、データ取得を提供する。
 */

import { CITY_LOCATIONS } from "@townlens/core";
import { getPrefectureCode } from "./prefectures";
import { fetchCityPageData } from "./city-data";
import type { CityPageData } from "./city-data";

/** 地方ブロック内の都道府県 */
export interface PrefectureEntry {
  readonly code: string;
  readonly name: string;
}

/** 地方ブロック定義 */
export interface RegionalBlock {
  readonly name: string;
  readonly prefectures: ReadonlyArray<PrefectureEntry>;
}

/** 8地方ブロック × 47都道府県の静的マッピング */
export const REGIONAL_BLOCKS: ReadonlyArray<RegionalBlock> = [
  {
    name: "北海道地方",
    prefectures: [{ code: "01", name: "北海道" }],
  },
  {
    name: "東北地方",
    prefectures: [
      { code: "02", name: "青森県" },
      { code: "03", name: "岩手県" },
      { code: "04", name: "宮城県" },
      { code: "05", name: "秋田県" },
      { code: "06", name: "山形県" },
      { code: "07", name: "福島県" },
    ],
  },
  {
    name: "関東地方",
    prefectures: [
      { code: "08", name: "茨城県" },
      { code: "09", name: "栃木県" },
      { code: "10", name: "群馬県" },
      { code: "11", name: "埼玉県" },
      { code: "12", name: "千葉県" },
      { code: "13", name: "東京都" },
      { code: "14", name: "神奈川県" },
    ],
  },
  {
    name: "中部地方",
    prefectures: [
      { code: "15", name: "新潟県" },
      { code: "16", name: "富山県" },
      { code: "17", name: "石川県" },
      { code: "18", name: "福井県" },
      { code: "19", name: "山梨県" },
      { code: "20", name: "長野県" },
      { code: "21", name: "岐阜県" },
      { code: "22", name: "静岡県" },
      { code: "23", name: "愛知県" },
    ],
  },
  {
    name: "近畿地方",
    prefectures: [
      { code: "24", name: "三重県" },
      { code: "25", name: "滋賀県" },
      { code: "26", name: "京都府" },
      { code: "27", name: "大阪府" },
      { code: "28", name: "兵庫県" },
      { code: "29", name: "奈良県" },
      { code: "30", name: "和歌山県" },
    ],
  },
  {
    name: "中国地方",
    prefectures: [
      { code: "31", name: "鳥取県" },
      { code: "32", name: "島根県" },
      { code: "33", name: "岡山県" },
      { code: "34", name: "広島県" },
      { code: "35", name: "山口県" },
    ],
  },
  {
    name: "四国地方",
    prefectures: [
      { code: "36", name: "徳島県" },
      { code: "37", name: "香川県" },
      { code: "38", name: "愛媛県" },
      { code: "39", name: "高知県" },
    ],
  },
  {
    name: "九州・沖縄地方",
    prefectures: [
      { code: "40", name: "福岡県" },
      { code: "41", name: "佐賀県" },
      { code: "42", name: "長崎県" },
      { code: "43", name: "熊本県" },
      { code: "44", name: "大分県" },
      { code: "45", name: "宮崎県" },
      { code: "46", name: "鹿児島県" },
      { code: "47", name: "沖縄県" },
    ],
  },
];

/** 都道府県コードに属する CITY_LOCATIONS 登録済み都市を取得 */
export function getCityCodesForPrefecture(
  prefectureCode: string,
): ReadonlyArray<{ readonly code: string; readonly name: string }> {
  return [...CITY_LOCATIONS.entries()]
    .filter(([code]) => code.startsWith(prefectureCode))
    .map(([code, loc]) => ({ code, name: loc.name }));
}

/** 都道府県内の登録都市数を返す（同期・インメモリ） */
export function getCityCountForPrefecture(prefectureCode: string): number {
  return [...CITY_LOCATIONS.keys()].filter((code) =>
    code.startsWith(prefectureCode),
  ).length;
}

/** 都道府県内の全都市データを並列取得する（ソートはClient側で実施） */
export async function fetchPrefectureCities(
  prefectureName: string,
): Promise<ReadonlyArray<CityPageData>> {
  const prefCode = getPrefectureCode(prefectureName);
  if (!prefCode) return [];

  const cityEntries = getCityCodesForPrefecture(prefCode);
  if (cityEntries.length === 0) return [];

  const results = await Promise.allSettled(
    cityEntries.map((entry) => fetchCityPageData(entry.name)),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<CityPageData | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((data): data is CityPageData => data !== null);
}
