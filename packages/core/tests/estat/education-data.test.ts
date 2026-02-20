import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEducationData, EducationDataConfig } from "../../src/estat/education-data";

/** 社会・人口統計体系 E教育のメタ情報モック（cat01に指標がある場合） */
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
        "@name": "E教育",
        CLASS: [
          { "@code": "E2101", "@name": "E2101_小学校数" },
          { "@code": "E3101", "@name": "E3101_中学校数" },
          { "@code": "E5101", "@name": "E5101_大学数" },
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
          { "@code": "E2101", "@name": "E2101_小学校数" },
          { "@code": "E3101", "@name": "E3101_中学校数" },
        ],
      },
      {
        "@id": "cat01",
        "@name": "E教育 分類",
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

describe("buildEducationData", () => {
  const baseConfig: EducationDataConfig = {
    statsDataId: "0000020205",
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

  it("複数都市の教育統計を取得し人口1万人あたりに変換する", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    // 小学校数の取得
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "E2101", value: "63" },
          { area: "13113", time: "2022000000", cat01: "E2101", value: "18" },
        ]),
      )
      // 中学校数の取得
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "E3101", value: "30" },
          { area: "13113", time: "2022000000", cat01: "E3101", value: "11" },
        ]),
      );

    const result = await buildEducationData(
      mockClient,
      ["13112", "13113"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(2);

    const setagaya = result.get("13112")!;
    // 63 / 900000 * 10000 ≈ 0.7
    expect(setagaya.elementarySchoolsPerCapita).toBeCloseTo(0.7, 1);
    // 30 / 900000 * 10000 ≈ 0.333
    expect(setagaya.juniorHighSchoolsPerCapita).toBeCloseTo(0.333, 2);
    expect(setagaya.dataYear).toBe("2022");

    const shibuya = result.get("13113")!;
    // 18 / 230000 * 10000 ≈ 0.783
    expect(shibuya.elementarySchoolsPerCapita).toBeCloseTo(0.783, 2);
    // 11 / 230000 * 10000 ≈ 0.478
    expect(shibuya.juniorHighSchoolsPerCapita).toBeCloseTo(0.478, 2);
  });

  it("空の都市コード配列で空Mapを返す", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    const result = await buildEducationData(mockClient, [], baseConfig);
    expect(result.size).toBe(0);
    expect(mockClient.getMetaInfo).not.toHaveBeenCalled();
  });

  it("populationMapなしではperCapitaがnullになる", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "E2101", value: "63" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "E3101", value: "30" },
        ]),
      );

    const result = await buildEducationData(
      mockClient,
      ["13112"],
      baseConfig,
      undefined,
    );

    expect(result.size).toBe(1);
    const setagaya = result.get("13112")!;
    expect(setagaya.elementarySchoolsPerCapita).toBeNull();
    expect(setagaya.juniorHighSchoolsPerCapita).toBeNull();
  });

  it("データが存在しない都市はMapに含まれない", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "E2101", value: "63" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2022000000", cat01: "E3101", value: "30" },
        ]),
      );

    const result = await buildEducationData(
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
          { area: "13112", time: "2021000000", cat01: "E2101", value: "62" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "E3101", value: "29" },
        ]),
      );

    const result = await buildEducationData(
      mockClient,
      ["13112"],
      { ...baseConfig, timeCode: "2021000000" },
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(result.get("13112")!.dataYear).toBe("2021");
  });

  it("APIが空データを返した場合、空Mapを返す（グレースフル）", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([]),
    );

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildEducationData(
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
    // 2022年: 空レスポンス（小学校・中学校とも）
    mockClient.getStatsData
      .mockResolvedValueOnce(createStatsResponse([]))
      .mockResolvedValueOnce(createStatsResponse([]))
      // 2021年: データあり
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "E2101", value: "62" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "E3101", value: "29" },
        ]),
      );

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildEducationData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(result.get("13112")!.dataYear).toBe("2021");
    // 4回API呼び出し（2年分 × 2指標）
    expect(mockClient.getStatsData).toHaveBeenCalledTimes(4);
    consoleSpy.mockRestore();
  });

  it("tab クラスの指標を自動検出する", async () => {
    const mockClient = createMockClient(tabMetaInfo);
    mockClient.getStatsData
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021100000", cat01: "R110", tab: "E2101", value: "63" },
        ]),
      )
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021100000", cat01: "R110", tab: "E3101", value: "30" },
        ]),
      );

    const result = await buildEducationData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(1);
    // tab クラスから E2101, E3101 が検出され cdTab に設定される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "E2101" }),
    );
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "E3101" }),
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
    const result = await buildEducationData(
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
