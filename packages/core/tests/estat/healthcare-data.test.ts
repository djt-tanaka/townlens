import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildHealthcareData, HealthcareDataConfig } from "../../src/estat/healthcare-data";

/** 社会・人口統計体系 I健康・医療のメタ情報モック（cat01に指標がある場合） */
const sampleMetaInfo = {
  CLASS_INF: {
    CLASS_OBJ: [
      {
        "@id": "area",
        "@name": "地域事項",
        CLASS: [
          { "@code": "13112", "@name": "世田谷区" },
          { "@code": "13113", "@name": "渋谷区" },
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
        "@name": "I健康・医療",
        CLASS: [
          { "@code": "I1101", "@name": "I1101_一般病院数" },
          { "@code": "I1102", "@name": "I1102_一般診療所数" },
          { "@code": "I5210", "@name": "I5210_小児科標榜施設数" },
          { "@code": "I9999", "@name": "I9999_薬局数" },
        ],
      },
    ],
  },
};

/** tab クラスに指標がある場合のメタ情報モック */
const tabMetaInfo = {
  CLASS_INF: {
    CLASS_OBJ: [
      {
        "@id": "area",
        "@name": "地域事項",
        CLASS: [
          { "@code": "13112", "@name": "世田谷区" },
          { "@code": "13113", "@name": "渋谷区" },
        ],
      },
      {
        "@id": "time",
        "@name": "時間軸（年度）",
        CLASS: [
          { "@code": "2020100000", "@name": "2020年度" },
          { "@code": "2021100000", "@name": "2021年度" },
        ],
      },
      {
        "@id": "tab",
        "@name": "表章項目",
        CLASS: [
          { "@code": "I1101", "@name": "I1101_一般病院数" },
          { "@code": "I1102", "@name": "I1102_一般診療所数" },
          { "@code": "I5210", "@name": "I5210_小児科標榜施設数" },
        ],
      },
      {
        "@id": "cat01",
        "@name": "I健康・医療 分類",
        CLASS: [{ "@code": "R110", "@name": "実数" }],
      },
    ],
  },
};

/** e-Stat APIレスポンスのモック生成 */
function createStatsResponse(
  values: Array<{
    area: string;
    time: string;
    cat01: string;
    value: string;
    tab?: string;
  }>,
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

describe("buildHealthcareData", () => {
  const baseConfig: HealthcareDataConfig = {
    statsDataId: "0000020207",
  };

  const populationMap = new Map<string, number>([
    ["13112", 900000],
    ["13113", 230000],
  ]);

  function createMockClient(metaInfo: any) {
    return {
      getMetaInfo: vi.fn().mockResolvedValue(metaInfo),
      getStatsData: vi.fn(),
    } as any;
  }

  it("複数都市の医療統計を取得し人口10万人あたりに変換する", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    // 一般病院数の取得
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I1101", value: "45" },
          { area: "13113", time: "2022000000", cat01: "I1101", value: "12" },
        ]),
      )
      // 一般診療所数の取得
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I1102", value: "720" },
          { area: "13113", time: "2022000000", cat01: "I1102", value: "180" },
        ]),
      )
      // 小児科標榜施設数の取得
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I5210", value: "90" },
          { area: "13113", time: "2022000000", cat01: "I5210", value: "25" },
        ]),
      );

    const result = await buildHealthcareData(
      mockClient,
      ["13112", "13113"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(2);

    const setagaya = result.get("13112")!;
    // 45 / 900000 * 100000 = 5.0
    expect(setagaya.hospitalsPerCapita).toBeCloseTo(5.0, 1);
    // 720 / 900000 * 100000 = 80.0
    expect(setagaya.clinicsPerCapita).toBeCloseTo(80.0, 1);
    // 90 / 900000 * 100000 = 10.0
    expect(setagaya.pediatricsPerCapita).toBeCloseTo(10.0, 1);
    expect(setagaya.dataYear).toBe("2022");

    const shibuya = result.get("13113")!;
    // 12 / 230000 * 100000 ≈ 5.217
    expect(shibuya.hospitalsPerCapita).toBeCloseTo(5.217, 2);
    // 180 / 230000 * 100000 ≈ 78.261
    expect(shibuya.clinicsPerCapita).toBeCloseTo(78.261, 2);
    // 25 / 230000 * 100000 ≈ 10.870
    expect(shibuya.pediatricsPerCapita).toBeCloseTo(10.87, 2);
  });

  it("空の都市コード配列で空Mapを返す", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    const result = await buildHealthcareData(mockClient, [], baseConfig);
    expect(result.size).toBe(0);
    expect(mockClient.getMetaInfo).not.toHaveBeenCalled();
  });

  it("populationMapなしではperCapitaがnullになる", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I1101", value: "45" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I1102", value: "720" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I5210", value: "90" },
        ]),
      );

    const result = await buildHealthcareData(
      mockClient,
      ["13112"],
      baseConfig,
      undefined,
    );

    expect(result.size).toBe(1);
    const setagaya = result.get("13112")!;
    expect(setagaya.hospitalsPerCapita).toBeNull();
    expect(setagaya.clinicsPerCapita).toBeNull();
    expect(setagaya.pediatricsPerCapita).toBeNull();
  });

  it("データが存在しない都市はMapに含まれない", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I1101", value: "45" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I1102", value: "720" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "I5210", value: "90" },
        ]),
      );

    const result = await buildHealthcareData(
      mockClient,
      ["13112", "13113"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(result.has("13112")).toBe(true);
    expect(result.has("13113")).toBe(false);
  });

  it("明示的なtimeCodeで時点を選択できる", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "I1101", value: "44" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "I1102", value: "710" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "I5210", value: "88" },
        ]),
      );

    const result = await buildHealthcareData(
      mockClient,
      ["13112"],
      { ...baseConfig, timeCode: "2021000000" },
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(result.get("13112")!.dataYear).toBe("2021");
  });

  it("APIが空データを返した場合、空Mapを返す", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([]),
    );

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildHealthcareData(
      mockClient,
      ["13112", "13113"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(0);
    consoleSpy.mockRestore();
  });

  it("最新年にデータがない場合、前年にフォールバックする", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    // 2022年: 空レスポンス（3指標とも）
    mockClient.getStatsData
      .mockResolvedValueOnce(createStatsResponse([]))
      .mockResolvedValueOnce(createStatsResponse([]))
      .mockResolvedValueOnce(createStatsResponse([]))
      // 2021年: データあり
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "I1101", value: "44" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "I1102", value: "710" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "I5210", value: "88" },
        ]),
      );

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildHealthcareData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(result.get("13112")!.dataYear).toBe("2021");
    // 6回API呼び出し（2年分 × 3指標）
    expect(mockClient.getStatsData).toHaveBeenCalledTimes(6);
    consoleSpy.mockRestore();
  });

  it("tab クラスの指標を自動検出する", async () => {
    const mockClient = createMockClient(tabMetaInfo);
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021100000", cat01: "R110", tab: "I1101", value: "45" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021100000", cat01: "R110", tab: "I1102", value: "720" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021100000", cat01: "R110", tab: "I5210", value: "90" },
        ]),
      );

    const result = await buildHealthcareData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "I1101" }),
    );
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "I1102" }),
    );
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "I5210" }),
    );
  });

  it("指標分類が検出できない場合、空Mapを返す", async () => {
    const noIndicatorMeta = {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            "@id": "area",
            "@name": "地域事項",
            CLASS: [{ "@code": "13112", "@name": "世田谷区" }],
          },
          {
            "@id": "time",
            "@name": "時間軸（年次）",
            CLASS: [{ "@code": "2022000000", "@name": "2022年" }],
          },
          {
            "@id": "cat01",
            "@name": "指標",
            CLASS: [{ "@code": "X9999", "@name": "関連なし指標" }],
          },
        ],
      },
    };
    const mockClient = createMockClient(noIndicatorMeta);

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildHealthcareData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("自動検出できませんでした"),
    );
    consoleSpy.mockRestore();
  });
});
