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

import {
  REGIONAL_BLOCKS,
  getCityCodesForPrefecture,
  fetchAllMunicipalityCounts,
  fetchPrefectureCities,
} from "@/lib/prefecture-data";

/** Supabase クエリチェーンのモックを作成する（thenable で await 対応） */
function createQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.not = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.range = vi.fn(() => chain);
  chain.then = (resolve: Function, reject?: Function) =>
    Promise.resolve(result).then(resolve as never, reject as never);
  return chain;
}

describe("REGIONAL_BLOCKS", () => {
  it("8つの地方ブロックを持つ", () => {
    expect(REGIONAL_BLOCKS).toHaveLength(8);
  });

  it("全ブロック合計で47都道府県を持つ", () => {
    const total = REGIONAL_BLOCKS.reduce(
      (sum, block) => sum + block.prefectures.length,
      0,
    );
    expect(total).toBe(47);
  });

  it("北海道地方が先頭にある", () => {
    expect(REGIONAL_BLOCKS[0]?.name).toBe("北海道地方");
  });

  it("九州・沖縄地方が末尾にある", () => {
    expect(REGIONAL_BLOCKS[7]?.name).toBe("九州・沖縄地方");
  });

  it("各ブロックにコードと名前を持つ都道府県が含まれる", () => {
    for (const block of REGIONAL_BLOCKS) {
      expect(block.prefectures.length).toBeGreaterThan(0);
      for (const pref of block.prefectures) {
        expect(pref.code).toMatch(/^\d{2}$/);
        expect(pref.name.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getCityCodesForPrefecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("都道府県名の都市コードを取得する", async () => {
    const mockData = [
      { area_code: "13101", city_name: "千代田区" },
      { area_code: "13102", city_name: "中央区" },
    ];
    mockFrom.mockReturnValue(createQueryChain({ data: mockData, error: null }));

    const cities = await getCityCodesForPrefecture("東京都");
    expect(cities).toHaveLength(2);
    expect(cities[0]).toEqual({ code: "13101", name: "千代田区" });
    expect(cities[1]).toEqual({ code: "13102", name: "中央区" });
  });

  it("Supabase エラー時に空配列を返す", async () => {
    mockFrom.mockReturnValue(
      createQueryChain({ data: null, error: { message: "test error" } }),
    );

    const cities = await getCityCodesForPrefecture("東京都");
    expect(cities).toEqual([]);
  });

  it("返却値は code と name を持つ", async () => {
    const mockData = [{ area_code: "13101", city_name: "千代田区" }];
    mockFrom.mockReturnValue(createQueryChain({ data: mockData, error: null }));

    const cities = await getCityCodesForPrefecture("東京都");
    expect(cities[0]).toHaveProperty("code");
    expect(cities[0]).toHaveProperty("name");
  });
});

describe("fetchAllMunicipalityCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("都道府県ごとの都市数を返す", async () => {
    const mockData = [
      { area_code: "13101", prefecture: "東京都" },
      { area_code: "13102", prefecture: "東京都" },
      { area_code: "27102", prefecture: "大阪府" },
    ];
    mockFrom.mockReturnValue(createQueryChain({ data: mockData, error: null }));

    const counts = await fetchAllMunicipalityCounts();
    expect(counts["東京都"]).toBe(2);
    expect(counts["大阪府"]).toBe(1);
  });

  it("政令指定都市の親コードをカウントから除外する", async () => {
    const mockData = [
      { area_code: "14101", prefecture: "神奈川県" }, // 横浜市鶴見区（区 → カウント対象）
      { area_code: "14100", prefecture: "神奈川県" }, // 横浜市（親 → 除外）
      { area_code: "14130", prefecture: "神奈川県" }, // 川崎市（親 → 除外）
    ];
    mockFrom.mockReturnValue(createQueryChain({ data: mockData, error: null }));

    const counts = await fetchAllMunicipalityCounts();
    expect(counts["神奈川県"]).toBe(1);
  });

  it("1000件以上の場合にページネーションで全件取得する", async () => {
    // 1ページ目: ちょうど 1000 件（PAGE_SIZE）→ 次ページへ進む
    // 政令指定都市の親コードと衝突しないよう 50001 始まりで生成
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      area_code: String(50001 + i),
      prefecture: "東京都",
    }));
    // 2ページ目: 1件 → ループ終了
    const page2 = [{ area_code: "27102", prefecture: "大阪府" }];

    mockFrom
      .mockReturnValueOnce(createQueryChain({ data: page1, error: null }))
      .mockReturnValueOnce(createQueryChain({ data: page2, error: null }));

    const counts = await fetchAllMunicipalityCounts();
    expect(counts["東京都"]).toBe(1000);
    expect(counts["大阪府"]).toBe(1);
  });

  it("Supabase エラー時に空オブジェクトを返す", async () => {
    mockFrom.mockReturnValue(
      createQueryChain({ data: null, error: { message: "test error" } }),
    );

    const counts = await fetchAllMunicipalityCounts();
    expect(Object.keys(counts)).toHaveLength(0);
  });
});

describe("fetchPrefectureCities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("存在しない都道府県名に対して空配列を返す", async () => {
    const result = await fetchPrefectureCities("架空県");
    expect(result).toEqual([]);
  });

  it("municipalities が空の都道府県に対して空配列を返す", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: [], error: null }));

    const result = await fetchPrefectureCities("青森県");
    expect(result).toEqual([]);
  });

  it("municipalities テーブルから都道府県内の都市を取得する", async () => {
    const mockData = [
      {
        area_code: "13101",
        city_name: "千代田区",
        population: 67000,
        kids_ratio: 10.5,
      },
      {
        area_code: "13102",
        city_name: "中央区",
        population: 170000,
        kids_ratio: 12.1,
      },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockData, error: null }),
    );

    const result = await fetchPrefectureCities("東京都");
    expect(result).toHaveLength(2);
    expect(result[0]?.cityName).toBe("千代田区");
    expect(result[0]?.population).toBe(67000);
    expect(result[0]?.kidsRatio).toBe(10.5);
    expect(result[1]?.cityName).toBe("中央区");
  });

  it("Supabase エラー時に空配列を返す", async () => {
    mockFrom.mockReturnValue(
      createQueryChain({ data: null, error: { message: "test error" } }),
    );

    const result = await fetchPrefectureCities("東京都");
    expect(result).toEqual([]);
  });

  it("政令指定都市の親コードを除外する", async () => {
    const mockData = [
      {
        area_code: "14100",
        city_name: "横浜市",
        population: 3700000,
        kids_ratio: 11.0,
      },
      {
        area_code: "14101",
        city_name: "鶴見区",
        population: 290000,
        kids_ratio: 12.0,
      },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockData, error: null }),
    );

    const result = await fetchPrefectureCities("神奈川県");
    expect(result).toHaveLength(1);
    expect(result[0]?.cityName).toBe("鶴見区");
  });
});
