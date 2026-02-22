/**
 * ランキングデータの DB 読み取りモジュール。
 * ランキングページ (ISR) から呼び出される。
 *
 * 書き込み（バッチ生成）は scripts/generate-rankings.ts で行う。
 */

import { unstable_cache } from "next/cache";
import { isDesignatedCityCode } from "@townlens/core";
import type { Json } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { RANKING_PRESET_META } from "./ranking-presets";

/** ISR 再生成時のキャッシュ TTL（24時間） */
const CACHE_REVALIDATE = 86400;

/** ランキング1行分の表示データ */
export interface RankingEntry {
  readonly rank: number;
  readonly cityName: string;
  readonly areaCode: string;
  readonly prefecture: string;
  readonly starRating: number;
  readonly indicatorStars: Json;
  readonly population: number | null;
}

function toRankingEntry(row: {
  rank: number;
  city_name: string;
  area_code: string;
  prefecture: string;
  star_rating: number;
  indicator_stars: Json;
  population: number | null;
}): RankingEntry {
  return {
    rank: row.rank,
    cityName: row.city_name,
    areaCode: row.area_code,
    prefecture: row.prefecture,
    starRating: row.star_rating,
    indicatorStars: row.indicator_stars,
    population: row.population,
  };
}

/** DB からプリセット別ランキングを取得（内部実装） */
async function fetchRankingByPresetInternal(
  preset: string,
  limit = 30,
): Promise<ReadonlyArray<RankingEntry>> {
  const supabase = createAdminClient();

  // 都道府県・政令指定都市を除外するため余分にフェッチ
  const fetchLimit = limit + 25;

  const { data, error } = await supabase
    .from("city_rankings")
    .select(
      "rank, city_name, area_code, prefecture, star_rating, indicator_stars, population",
    )
    .eq("preset", preset)
    .not("area_code", "like", "__000%") // 都道府県コード（XX000）を除外
    .order("rank", { ascending: true })
    .limit(fetchLimit);

  if (error) {
    throw new Error(`ランキング取得エラー: ${error.message}`);
  }

  // 政令指定都市の親コードを除外し、連番の順位を再付与
  const filtered = (data ?? [])
    .filter((row) => !isDesignatedCityCode(row.area_code))
    .slice(0, limit);

  return filtered.map((row, i) => toRankingEntry({ ...row, rank: i + 1 }));
}

/**
 * DB からプリセット別ランキングを取得（プリセットページ用）。
 * unstable_cache でサーバーサイドキャッシュ。
 */
export const fetchRankingByPreset = unstable_cache(
  fetchRankingByPresetInternal,
  ["ranking-by-preset"],
  { revalidate: CACHE_REVALIDATE },
);

/** DB から全プリセットの TOP N を取得（一覧ページ用） */
export async function fetchAllPresetRankings(
  topN = 5,
): Promise<ReadonlyMap<string, ReadonlyArray<RankingEntry>>> {
  const result = new Map<string, ReadonlyArray<RankingEntry>>();

  // 3プリセット分を並列取得
  const entries = await Promise.all(
    RANKING_PRESET_META.map(async (meta) => {
      const rankings = await fetchRankingByPreset(meta.name, topN);
      return [meta.name, rankings] as const;
    }),
  );

  for (const [name, rankings] of entries) {
    result.set(name, rankings);
  }

  return result;
}
