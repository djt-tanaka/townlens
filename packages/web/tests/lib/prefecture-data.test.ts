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

/* fetchCityPageData をモック */
vi.mock("@/lib/city-data", () => ({
  fetchCityPageData: vi.fn(),
}));

import {
  REGIONAL_BLOCKS,
  getCityCodesForPrefecture,
  fetchAllMunicipalityCounts,
  fetchPrefectureCities,
} from "@/lib/prefecture-data";

import { fetchCityPageData } from "@/lib/city-data";

const mockFetchCityPageData = vi.mocked(fetchCityPageData);

/** Supabase クエリチェーンのモックを作成する（thenable で await 対応） */
function createQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
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
      { prefecture: "東京都" },
      { prefecture: "東京都" },
      { prefecture: "大阪府" },
    ];
    mockFrom.mockReturnValue(createQueryChain({ data: mockData, error: null }));

    const counts = await fetchAllMunicipalityCounts();
    expect(counts.get("東京都")).toBe(2);
    expect(counts.get("大阪府")).toBe(1);
  });

  it("Supabase エラー時に空 Map を返す", async () => {
    mockFrom.mockReturnValue(
      createQueryChain({ data: null, error: { message: "test error" } }),
    );

    const counts = await fetchAllMunicipalityCounts();
    expect(counts.size).toBe(0);
  });
});

describe("fetchPrefectureCities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("存在しない都道府県名に対して空配列を返す", async () => {
    const result = await fetchPrefectureCities("架空県");
    expect(result).toEqual([]);
    expect(mockFetchCityPageData).not.toHaveBeenCalled();
  });

  it("municipalities が空の都道府県に対して空配列を返す", async () => {
    mockFrom.mockReturnValue(createQueryChain({ data: [], error: null }));

    const result = await fetchPrefectureCities("青森県");
    expect(result).toEqual([]);
    expect(mockFetchCityPageData).not.toHaveBeenCalled();
  });

  it("都道府県内の各都市に対して fetchCityPageData を呼ぶ", async () => {
    const mockCities = [
      { area_code: "13101", city_name: "千代田区" },
      { area_code: "13102", city_name: "中央区" },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockCities, error: null }),
    );

    const mockPageData = {
      cityName: "千代田区",
      areaCode: "13101",
      population: 67000,
      kidsRatio: 10.5,
      presetScores: [],
    };
    mockFetchCityPageData.mockResolvedValue(mockPageData as never);

    const result = await fetchPrefectureCities("東京都");
    expect(mockFetchCityPageData).toHaveBeenCalledTimes(2);
    expect(result.length).toBe(2);
  });

  it("fetchCityPageData が null を返した都市をフィルタする", async () => {
    const mockCities = [
      { area_code: "01100", city_name: "札幌市" },
      { area_code: "01202", city_name: "函館市" },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockCities, error: null }),
    );

    mockFetchCityPageData
      .mockResolvedValueOnce({ cityName: "札幌市" } as never)
      .mockResolvedValueOnce(null as never);

    const result = await fetchPrefectureCities("北海道");
    expect(result).toHaveLength(1);
  });

  it("fetchCityPageData が reject された都市を除外する", async () => {
    const mockCities = [
      { area_code: "01100", city_name: "札幌市" },
      { area_code: "01202", city_name: "函館市" },
    ];
    mockFrom.mockReturnValue(
      createQueryChain({ data: mockCities, error: null }),
    );

    mockFetchCityPageData
      .mockResolvedValueOnce({ cityName: "札幌市" } as never)
      .mockRejectedValueOnce(new Error("API エラー"));

    const result = await fetchPrefectureCities("北海道");
    expect(result).toHaveLength(1);
  });
});
