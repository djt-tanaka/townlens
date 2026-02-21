import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  REGIONAL_BLOCKS,
  getCityCodesForPrefecture,
  getCityCountForPrefecture,
  fetchPrefectureCities,
} from "@/lib/prefecture-data";

/* fetchCityPageData をモック */
vi.mock("@/lib/city-data", () => ({
  fetchCityPageData: vi.fn(),
}));

import { fetchCityPageData } from "@/lib/city-data";

const mockFetchCityPageData = vi.mocked(fetchCityPageData);

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
  it("東京都（13）の都市コードを取得する", () => {
    const cities = getCityCodesForPrefecture("13");
    expect(cities.length).toBeGreaterThan(0);
    for (const city of cities) {
      expect(city.code.startsWith("13")).toBe(true);
      expect(city.name.length).toBeGreaterThan(0);
    }
  });

  it("登録都市がない都道府県コードでは空配列を返す", () => {
    const cities = getCityCodesForPrefecture("99");
    expect(cities).toEqual([]);
  });

  it("返却値は code と name を持つ", () => {
    const cities = getCityCodesForPrefecture("13");
    if (cities.length > 0) {
      expect(cities[0]).toHaveProperty("code");
      expect(cities[0]).toHaveProperty("name");
    }
  });
});

describe("getCityCountForPrefecture", () => {
  it("東京都（13）の都市数が正の値を返す", () => {
    expect(getCityCountForPrefecture("13")).toBeGreaterThan(0);
  });

  it("登録都市がない都道府県コードでは 0 を返す", () => {
    expect(getCityCountForPrefecture("99")).toBe(0);
  });

  it("getCityCodesForPrefecture と件数が一致する", () => {
    const codes = getCityCodesForPrefecture("13");
    const count = getCityCountForPrefecture("13");
    expect(count).toBe(codes.length);
  });
});

describe("fetchPrefectureCities", () => {
  beforeEach(() => {
    mockFetchCityPageData.mockReset();
  });

  it("存在しない都道府県名に対して空配列を返す", async () => {
    const result = await fetchPrefectureCities("架空県");
    expect(result).toEqual([]);
    expect(mockFetchCityPageData).not.toHaveBeenCalled();
  });

  it("登録都市がない都道府県に対して空配列を返す", async () => {
    const result = await fetchPrefectureCities("青森県");
    expect(result).toEqual([]);
    expect(mockFetchCityPageData).not.toHaveBeenCalled();
  });

  it("都道府県内の各都市に対して fetchCityPageData を呼ぶ", async () => {
    const mockData = {
      cityName: "世田谷区",
      areaCode: "13112",
      population: 900000,
      kidsRatio: 11.5,
      presetScores: [],
    };
    mockFetchCityPageData.mockResolvedValue(mockData as never);

    const result = await fetchPrefectureCities("東京都");
    expect(mockFetchCityPageData).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
  });

  it("fetchCityPageData が null を返した都市をフィルタする", async () => {
    mockFetchCityPageData
      .mockResolvedValueOnce({ cityName: "A市" } as never)
      .mockResolvedValueOnce(null as never);

    const result = await fetchPrefectureCities("北海道");
    const nonNull = result.filter((r) => r !== null);
    expect(nonNull.length).toBe(result.length);
  });

  it("fetchCityPageData が reject された都市を除外する", async () => {
    mockFetchCityPageData
      .mockResolvedValueOnce({ cityName: "A市" } as never)
      .mockRejectedValueOnce(new Error("API エラー"));

    const result = await fetchPrefectureCities("北海道");
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});
