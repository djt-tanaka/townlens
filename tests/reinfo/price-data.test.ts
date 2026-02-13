import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPriceData } from "../../src/reinfo/price-data";
import * as cache from "../../src/reinfo/cache";

vi.mock("../../src/reinfo/cache");

const mockClient = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildPriceData", () => {
  it("各都市の取引データを取得して統計を計算する", async () => {
    vi.mocked(cache.fetchTradesWithCache)
      .mockResolvedValueOnce([
        { Type: "中古マンション等", TradePrice: "30000000", Area: "100", BuildingYear: "2010", FloorPlan: "3LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "西新宿" },
        { Type: "中古マンション等", TradePrice: "50000000", Area: "80", BuildingYear: "2015", FloorPlan: "2LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "新宿" },
        { Type: "中古マンション等", TradePrice: "40000000", Area: "70", BuildingYear: "2012", FloorPlan: "2LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "大久保" },
      ] as any)
      .mockResolvedValueOnce([
        { Type: "中古マンション等", TradePrice: "25000000", Area: "60", BuildingYear: "2008", FloorPlan: "1LDK", Prefecture: "東京都", Municipality: "渋谷区", DistrictName: "渋谷" },
      ] as any);

    const result = await buildPriceData(mockClient, ["13104", "13113"], "2024");

    expect(result.size).toBe(2);

    const shinjuku = result.get("13104")!;
    expect(shinjuku).toBeDefined();
    expect(shinjuku.median).toBe(40000000);
    expect(shinjuku.count).toBe(3);
    expect(shinjuku.year).toBe("2024");

    const shibuya = result.get("13113")!;
    expect(shibuya).toBeDefined();
    expect(shibuya.median).toBe(25000000);
    expect(shibuya.count).toBe(1);
  });

  it("取引データがない都市はMapに含まれない", async () => {
    vi.mocked(cache.fetchTradesWithCache)
      .mockResolvedValueOnce([
        { Type: "中古マンション等", TradePrice: "30000000", Area: "100", BuildingYear: "2010", FloorPlan: "3LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "西新宿" },
      ] as any)
      .mockResolvedValueOnce([]); // データなし

    const result = await buildPriceData(mockClient, ["13104", "13113"], "2024");

    expect(result.size).toBe(1);
    expect(result.has("13104")).toBe(true);
    expect(result.has("13113")).toBe(false);
  });

  it("マンション以外の取引は除外される", async () => {
    vi.mocked(cache.fetchTradesWithCache).mockResolvedValueOnce([
      { Type: "宅地(土地)", TradePrice: "100000000", Area: "200", BuildingYear: "", FloorPlan: "", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "西新宿" },
      { Type: "中古マンション等", TradePrice: "30000000", Area: "100", BuildingYear: "2010", FloorPlan: "3LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "西新宿" },
    ] as any);

    const result = await buildPriceData(mockClient, ["13104"], "2024");
    const stats = result.get("13104")!;
    expect(stats.count).toBe(1);
    expect(stats.median).toBe(30000000);
  });

  it("quarterパラメータを渡せる", async () => {
    vi.mocked(cache.fetchTradesWithCache).mockResolvedValue([]);

    await buildPriceData(mockClient, ["13104"], "2024", "2");

    expect(cache.fetchTradesWithCache).toHaveBeenCalledWith(
      mockClient,
      { year: "2024", city: "13104", quarter: "2" },
    );
  });

  it("空の都市コード配列で空Mapを返す", async () => {
    const result = await buildPriceData(mockClient, [], "2024");
    expect(result.size).toBe(0);
  });

  it("API呼び出し間にディレイが入る", async () => {
    vi.mocked(cache.fetchTradesWithCache).mockResolvedValue([]);
    const start = Date.now();

    await buildPriceData(mockClient, ["13104", "13113", "13110"], "2024");

    // 3都市で間に2回ディレイ（各200ms）= 最低400ms
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(350); // マージン考慮
  }, 10000);

  it("propertyType=house で中古戸建住宅のみ集計する", async () => {
    vi.mocked(cache.fetchTradesWithCache).mockResolvedValueOnce([
      { Type: "中古マンション等", TradePrice: "50000000", Area: "80", BuildingYear: "2015", FloorPlan: "2LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "新宿" },
      { Type: "中古戸建住宅", TradePrice: "40000000", Area: "120", BuildingYear: "2010", FloorPlan: "4LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "西新宿" },
    ] as any);

    const result = await buildPriceData(mockClient, ["13104"], "2024", undefined, "house");
    const stats = result.get("13104")!;
    expect(stats.count).toBe(1);
    expect(stats.median).toBe(40000000);
    expect(stats.propertyTypeLabel).toBe("中古戸建住宅");
  });

  it("budgetLimit で予算上限フィルタが適用される", async () => {
    vi.mocked(cache.fetchTradesWithCache).mockResolvedValueOnce([
      { Type: "中古マンション等", TradePrice: "30000000", Area: "70", BuildingYear: "2010", FloorPlan: "2LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "西新宿" },
      { Type: "中古マンション等", TradePrice: "60000000", Area: "100", BuildingYear: "2015", FloorPlan: "3LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "新宿" },
      { Type: "中古マンション等", TradePrice: "40000000", Area: "80", BuildingYear: "2012", FloorPlan: "2LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "大久保" },
    ] as any);

    const result = await buildPriceData(mockClient, ["13104"], "2024", undefined, "condo", 5000);
    const stats = result.get("13104")!;
    expect(stats.count).toBe(2);
    expect(stats.affordabilityRate).toBeCloseTo(66.7, 0);
  });

  it("budgetLimit未指定時はaffordabilityRateがundefined", async () => {
    vi.mocked(cache.fetchTradesWithCache).mockResolvedValueOnce([
      { Type: "中古マンション等", TradePrice: "30000000", Area: "70", BuildingYear: "2010", FloorPlan: "2LDK", Prefecture: "東京都", Municipality: "新宿区", DistrictName: "西新宿" },
    ] as any);

    const result = await buildPriceData(mockClient, ["13104"], "2024");
    const stats = result.get("13104")!;
    expect(stats.affordabilityRate).toBeUndefined();
  });
});
