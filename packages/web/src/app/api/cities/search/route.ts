/**
 * GET /api/cities/search?q={query}
 * 都市名オートコンプリート。認証不要。
 *
 * e-Stat メタ情報から地域コード一覧を取得し、前方一致 + 読み仮名検索を行う。
 * 結果は上限 20 件。
 */

import { type NextRequest } from "next/server";
import {
  type AreaEntry,
  extractClassObjects,
  resolveAreaClass,
  buildAreaEntries,
  normalizeLabel,
  katakanaToHiragana,
  findByReading,
  isDesignatedCityCode,
  DATASETS,
} from "@townlens/core";
import { createEstatClient } from "@/lib/api-clients";
import { citySearchSchema } from "@/lib/validations";
import { jsonResponse, errorResponse, handleApiError } from "@/lib/api-utils";
import { getPrefectureName } from "@/lib/prefectures";
import type { CitySearchResponse } from "@/types";

const MAX_RESULTS = 20;

// モジュールレベルのメモリキャッシュ
let cachedAreaEntries: ReadonlyArray<AreaEntry> | null = null;

async function getAreaEntries(): Promise<ReadonlyArray<AreaEntry>> {
  if (cachedAreaEntries) return cachedAreaEntries;
  const client = createEstatClient();
  const metaInfo = await client.getMetaInfo(DATASETS.population.statsDataId);
  const classObjs = extractClassObjects(metaInfo);
  const areaClass = resolveAreaClass(classObjs);
  cachedAreaEntries = buildAreaEntries(areaClass);
  return cachedAreaEntries;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = citySearchSchema.safeParse({ q: searchParams.get("q") });

    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "バリデーションエラー",
        400,
      );
    }

    const query = parsed.data.q;
    const normalizedQuery = normalizeLabel(query);
    const hiraganaQuery = katakanaToHiragana(query);

    const areaEntries = await getAreaEntries();

    // 前方一致検索（正規化ラベルで比較、政令指定都市の親コードは除外）
    const nameMatches = areaEntries.filter((entry) => {
      if (isDesignatedCityCode(entry.code)) return false;
      const normalizedName = normalizeLabel(entry.name);
      return normalizedName.includes(normalizedQuery);
    });

    // 読み仮名検索（ひらがな入力対応、政令指定都市の親コードは除外）
    const readingMatches = findByReading(hiraganaQuery);
    const readingMatchSet = new Set(readingMatches);
    const readingResults = areaEntries.filter(
      (entry) =>
        !isDesignatedCityCode(entry.code) &&
        readingMatchSet.has(entry.name) &&
        !nameMatches.some((m) => m.code === entry.code),
    );

    // 統合して上限適用
    const combined = [...nameMatches, ...readingResults].slice(0, MAX_RESULTS);

    const response: CitySearchResponse = {
      cities: combined.map((entry) => ({
        code: entry.code,
        name: entry.name,
        prefecture: getPrefectureName(entry.code),
      })),
    };

    return jsonResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}
