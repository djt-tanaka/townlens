import { describe, it, expect, vi, beforeEach } from "vitest";

/* next/cache の unstable_cache をパススルーモック */
vi.mock("next/cache", () => ({
  unstable_cache: (fn: Function) => fn,
}));

/* Supabase admin クライアントのモック */
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { fetchRankingByPreset, fetchAllPresetRankings } from "@/lib/ranking-data";

/** Supabase クエリチェーンのモックを作成する（thenable で await 対応） */
function createQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.then = (resolve: Function, reject?: Function) =>
    Promise.resolve(result).then(resolve as never, reject as never);
  return chain;
}

describe("fetchRankingByPreset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("municipalities JOIN を使ってランキングを取得する", async () => {
    const mockData = [
      {
        rank: 1,
        area_code: "13101",
        star_rating: 4.5,
        indicator_stars: { population: 3 },
        municipalities: { city_name: "千代田区", prefecture: "東京都", population: 67000 },
      },
      {
        rank: 2,
        area_code: "13102",
        star_rating: 4.0,
        indicator_stars: { population: 4 },
        municipalities: { city_name: "中央区", prefecture: "東京都", population: 170000 },
      },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockData, error: null }),
    );

    const result = await fetchRankingByPreset("childcare");
    expect(result).toHaveLength(2);
    expect(result[0]?.rank).toBe(1);
    expect(result[0]?.cityName).toBe("千代田区");
    expect(result[0]?.prefecture).toBe("東京都");
    expect(result[0]?.starRating).toBe(4.5);
    expect(result[0]?.population).toBe(67000);
    expect(result[1]?.cityName).toBe("中央区");
  });

  it("政令指定都市の親コードを除外し連番を再付与する", async () => {
    const mockData = [
      {
        rank: 1,
        area_code: "14100", // 横浜市（親コード → 除外）
        star_rating: 4.5,
        indicator_stars: {},
        municipalities: { city_name: "横浜市", prefecture: "神奈川県", population: 3700000 },
      },
      {
        rank: 2,
        area_code: "14101", // 鶴見区（区 → 残す）
        star_rating: 4.0,
        indicator_stars: {},
        municipalities: { city_name: "鶴見区", prefecture: "神奈川県", population: 290000 },
      },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockData, error: null }),
    );

    const result = await fetchRankingByPreset("childcare");
    expect(result).toHaveLength(1);
    expect(result[0]?.cityName).toBe("鶴見区");
    expect(result[0]?.rank).toBe(1); // 連番再付与
  });

  it("municipalities が null の場合にフォールバックする", async () => {
    const mockData = [
      {
        rank: 1,
        area_code: "13101",
        star_rating: 4.5,
        indicator_stars: {},
        municipalities: null,
      },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockData, error: null }),
    );

    const result = await fetchRankingByPreset("childcare");
    expect(result).toHaveLength(1);
    expect(result[0]?.cityName).toBe("");
    expect(result[0]?.prefecture).toBe("");
    expect(result[0]?.population).toBeNull();
  });

  it("Supabase エラー時に例外をスローする", async () => {
    mockFrom.mockReturnValue(
      createQueryChain({ data: null, error: { message: "test error" } }),
    );

    await expect(fetchRankingByPreset("childcare")).rejects.toThrow(
      "ランキング取得エラー: test error",
    );
  });

  it("データが空の場合に空配列を返す", async () => {
    mockFrom.mockReturnValue(
      createQueryChain({ data: [], error: null }),
    );

    const result = await fetchRankingByPreset("childcare");
    expect(result).toEqual([]);
  });
});

describe("fetchAllPresetRankings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("全プリセットのランキングを Map で返す", async () => {
    const mockData = [
      {
        rank: 1,
        area_code: "13101",
        star_rating: 4.5,
        indicator_stars: {},
        municipalities: { city_name: "千代田区", prefecture: "東京都", population: 67000 },
      },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockData, error: null }),
    );

    const result = await fetchAllPresetRankings(1);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBeGreaterThan(0);
  });
});
