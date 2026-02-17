import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCrimeData, CrimeDataConfig } from "../../src/estat/crime-data";
import * as cache from "../../src/estat/cache";

vi.mock("../../src/estat/cache");

const mockClient = {
  getStatsData: vi.fn(),
} as any;

/** 社会・人口統計体系のメタ情報モック */
const sampleMetaInfo = {
  CLASS_INF: {
    CLASS_OBJ: [
      {
        "@id": "area",
        "@name": "地域事項",
        CLASS: [
          { "@code": "13104", "@name": "新宿区" },
          { "@code": "13113", "@name": "渋谷区" },
          { "@code": "14100", "@name": "横浜市" },
        ],
      },
      {
        "@id": "time",
        "@name": "時間軸（年次）",
        CLASS: [
          { "@code": "2021000000", "@name": "2021年" },
          { "@code": "2022000000", "@name": "2022年" },
        ],
      },
      {
        "@id": "cat01",
        "@name": "指標",
        CLASS: [
          { "@code": "D3101", "@name": "刑法犯認知件数（千人当たり）" },
          { "@code": "D3201", "@name": "交通事故発生件数（千人当たり）" },
        ],
      },
    ],
  },
};

/** 社会・人口統計体系のメタ情報モック（tab クラスに指標がある場合） */
const tabMetaInfo = {
  CLASS_INF: {
    CLASS_OBJ: [
      {
        "@id": "area",
        "@name": "地域事項",
        CLASS: [
          { "@code": "13104", "@name": "新宿区" },
          { "@code": "13113", "@name": "渋谷区" },
        ],
      },
      {
        "@id": "time",
        "@name": "時間軸（年度）",
        CLASS: [
          { "@code": "2008100000", "@name": "2008年度" },
          { "@code": "2009100000", "@name": "2009年度" },
        ],
      },
      {
        "@id": "tab",
        "@name": "表章項目",
        CLASS: [
          { "@code": "K3101", "@name": "K3101_交通事故発生件数" },
          { "@code": "K4201", "@name": "K4201_刑法犯認知件数" },
        ],
      },
      {
        "@id": "cat01",
        "@name": "K安全 分類",
        CLASS: [
          { "@code": "R3110", "@name": "実数" },
          { "@code": "R3120", "@name": "人口千人当たり" },
        ],
      },
    ],
  },
};

/** e-Stat APIレスポンスのモック生成 */
function createStatsResponse(
  values: Array<{ area: string; time: string; cat01: string; value: string; tab?: string }>,
) {
  return {
    GET_STATS_DATA: {
      STATISTICAL_DATA: {
        DATA_INF: {
          VALUE: values.map((v) => ({
            "@area": v.area,
            "@time": v.time,
            "@cat01": v.cat01,
            ...(v.tab ? { "@tab": v.tab } : {}),
            $: v.value,
          })),
        },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildCrimeData", () => {
  const baseConfig: CrimeDataConfig = {
    statsDataId: "0000010001",
  };

  it("複数都市の犯罪統計を取得する", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2022000000", cat01: "D3101", value: "12.5" },
        { area: "13113", time: "2022000000", cat01: "D3101", value: "8.3" },
      ]),
    );

    const result = await buildCrimeData(mockClient, ["13104", "13113"], baseConfig);

    expect(result.size).toBe(2);
    const shinjuku = result.get("13104")!;
    expect(shinjuku.crimeRate).toBe(12.5);
    expect(shinjuku.dataYear).toBe("2022");

    const shibuya = result.get("13113")!;
    expect(shibuya.crimeRate).toBe(8.3);
  });

  it("空の都市コード配列で空Mapを返す", async () => {
    const result = await buildCrimeData(mockClient, [], baseConfig);
    expect(result.size).toBe(0);
    expect(cache.loadMetaInfoWithCache).not.toHaveBeenCalled();
  });

  it("データが存在しない都市はMapに含まれない", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2022000000", cat01: "D3101", value: "12.5" },
      ]),
    );

    const result = await buildCrimeData(mockClient, ["13104", "13113"], baseConfig);

    expect(result.size).toBe(1);
    expect(result.has("13104")).toBe(true);
    expect(result.has("13113")).toBe(false);
  });

  it("明示的なindicatorCodeで指標を選択できる", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2022000000", cat01: "D3201", value: "5.2" },
      ]),
    );

    const result = await buildCrimeData(mockClient, ["13104"], {
      ...baseConfig,
      indicatorCode: "D3201",
    });

    expect(result.size).toBe(1);
    expect(result.get("13104")!.crimeRate).toBe(5.2);
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdCat01: "D3201" }),
    );
  });

  it("明示的なtimeCodeで時点を選択できる", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2021000000", cat01: "D3101", value: "13.1" },
      ]),
    );

    const result = await buildCrimeData(mockClient, ["13104"], {
      ...baseConfig,
      timeCode: "2021000000",
    });

    expect(result.size).toBe(1);
    expect(result.get("13104")!.crimeRate).toBe(13.1);
    expect(result.get("13104")!.dataYear).toBe("2021");
  });

  it("指標がnull値の都市はMapに含まれない", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue({
      GET_STATS_DATA: {
        STATISTICAL_DATA: {
          DATA_INF: {
            VALUE: [
              { "@area": "13104", "@time": "2022000000", "@cat01": "D3101", $: "-" },
            ],
          },
        },
      },
    });

    const result = await buildCrimeData(mockClient, ["13104"], baseConfig);

    expect(result.size).toBe(0);
  });

  it("自動検出で最もスコアの高い犯罪指標を選択する", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2022000000", cat01: "D3101", value: "12.5" },
      ]),
    );

    await buildCrimeData(mockClient, ["13104"], baseConfig);

    // 「刑法犯認知件数」が自動検出され、cdCat01にD3101が指定される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdCat01: "D3101" }),
    );
  });

  it("APIが空データを返した場合、空Mapを返す（グレースフル）", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue({
      GET_STATS_DATA: {
        STATISTICAL_DATA: {
          DATA_INF: { VALUE: [] },
        },
      },
    });

    const result = await buildCrimeData(mockClient, ["13104", "13113"], baseConfig);
    expect(result.size).toBe(0);
  });

  it("tab クラスの指標（刑法犯認知件数）を自動検出する", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(tabMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2009100000", cat01: "R3110", tab: "K4201", value: "15.2" },
      ]),
    );

    const result = await buildCrimeData(mockClient, ["13104"], baseConfig);

    expect(result.size).toBe(1);
    expect(result.get("13104")!.crimeRate).toBe(15.2);
    expect(result.get("13104")!.dataYear).toBe("2009");
    // tab クラスから K4201（刑法犯認知件数）が検出され cdTab に設定される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "K4201" }),
    );
  });

  it("tab 指標検出時に resolveDefaultFilters が適用される", async () => {
    vi.mocked(cache.loadMetaInfoWithCache).mockResolvedValue(tabMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2009100000", cat01: "R3110", tab: "K4201", value: "15.2" },
      ]),
    );

    await buildCrimeData(mockClient, ["13104"], baseConfig);

    // tab の K4201 と cat01 の「実数」がデフォルトフィルタとして適用される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({
        cdTab: "K4201",
        cdCat01: "R3110",
      }),
    );
  });
});
