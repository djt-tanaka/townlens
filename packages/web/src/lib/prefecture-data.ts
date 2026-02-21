/**
 * 都道府県ページ用データ層。
 * 地方ブロック定義、都道府県→都市マッピング、データ取得を提供する。
 *
 * 都市一覧は municipalities テーブル（自治体マスター）から取得する。
 */

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPrefectureCode } from "./prefectures";
import { fetchCityPageData } from "./city-data";
import type { CityPageData } from "./city-data";

/** ISR 再生成時のキャッシュ TTL（24時間） */
const CACHE_REVALIDATE = 86400;

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

/**
 * 全都道府県の都市数を一括取得する（municipalities テーブルから）。
 * 都道府県一覧ページでバッジに表示するためのもの。
 *
 * 注意: unstable_cache は内部的に JSON シリアライゼーションを使うため、
 * Map は正しくシリアライズされない。プレーンオブジェクトを返す。
 */
async function fetchAllMunicipalityCountsInternal(): Promise<
  Readonly<Record<string, number>>
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("municipalities")
    .select("prefecture");

  if (error) {
    console.error(`municipalities 取得エラー: ${error.message}`);
    return {};
  }

  // 都道府県名ごとにカウント
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.prefecture] = (counts[row.prefecture] ?? 0) + 1;
  }
  return counts;
}

/** 全都道府県の都市数を一括取得（キャッシュ付き） */
export const fetchAllMunicipalityCounts = unstable_cache(
  fetchAllMunicipalityCountsInternal,
  ["municipality-counts"],
  { revalidate: CACHE_REVALIDATE },
) as () => Promise<Readonly<Record<string, number>>>;

/** 都道府県名に属する municipalities テーブル登録済み都市を取得 */
async function getCityCodesForPrefectureInternal(
  prefectureName: string,
): Promise<ReadonlyArray<{ readonly code: string; readonly name: string }>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("municipalities")
    .select("area_code, city_name")
    .eq("prefecture", prefectureName)
    .order("area_code");

  if (error) {
    console.error(`municipalities 取得エラー: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row) => ({
    code: row.area_code,
    name: row.city_name,
  }));
}

/** 都道府県内の都市一覧を取得（キャッシュ付き） */
export const getCityCodesForPrefecture = unstable_cache(
  getCityCodesForPrefectureInternal,
  ["prefecture-city-codes"],
  { revalidate: CACHE_REVALIDATE },
);

/** 都道府県内の全都市データを並列取得する（内部実装） */
async function fetchPrefectureCitiesInternal(
  prefectureName: string,
): Promise<ReadonlyArray<CityPageData>> {
  const prefCode = getPrefectureCode(prefectureName);
  if (!prefCode) return [];

  const cityEntries = await getCityCodesForPrefectureInternal(prefectureName);
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

/**
 * 都道府県内の全都市データを並列取得する（ソートはClient側で実施）。
 * unstable_cache でサーバーサイドキャッシュし、ISR 再生成時も高速に応答する。
 */
export const fetchPrefectureCities = unstable_cache(
  fetchPrefectureCitiesInternal,
  ["prefecture-cities"],
  { revalidate: CACHE_REVALIDATE },
);
