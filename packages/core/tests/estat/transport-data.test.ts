import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTransportData, TransportDataConfig } from "../../src/estat/transport-data";

/** 社会・人口統計体系 C経済基盤のメタ情報モック（cat01に指標がある場合） */
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
        "@name": "C経済基盤",
        CLASS: [
          { "@code": "C3301", "@name": "C3301_鉄道駅数" },
          { "@code": "C3401", "@name": "C3401_バス停留所数" },
        ],
      },
    ],
  },
};

/** tabクラスに指標がある場合のメタ情報モック */
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
          { "@code": "C3301", "@name": "C3301_鉄道駅数" },
        ],
      },
      {
        "@id": "cat01",
        "@name": "分類",
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

describe("buildTransportData", () => {
  const baseConfig: TransportDataConfig = {
    statsDataId: "0000020203",
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

  it("複数都市の交通統計を取得し人口1万人あたりに変換する", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValueOnce(
      createStatsResponse([
        { area: "13112", time: "2022000000", cat01: "C3301", value: "18" },
        { area: "13113", time: "2022000000", cat01: "C3301", value: "10" },
      ]),
    );

    const result = await buildTransportData(
      mockClient,
      ["13112", "13113"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(2);

    const setagaya = result.get("13112")!;
    // 18 / 900000 * 10000 = 0.2
    expect(setagaya.stationCountPerCapita).toBeCloseTo(0.2, 1);
    expect(setagaya.dataYear).toBe("2022");
    // ターミナル距離は常に算出される
    expect(setagaya.terminalAccessKm).not.toBeNull();

    const shibuya = result.get("13113")!;
    // 10 / 230000 * 10000 ≈ 0.435
    expect(shibuya.stationCountPerCapita).toBeCloseTo(0.435, 2);
    expect(shibuya.terminalAccessKm).not.toBeNull();
  });

  it("空の都市コード配列で空Mapを返す", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    const result = await buildTransportData(mockClient, [], baseConfig);
    expect(result.size).toBe(0);
    expect(mockClient.getMetaInfo).not.toHaveBeenCalled();
  });

  it("populationMapなしではstationCountPerCapitaがnullになる", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValueOnce(
      createStatsResponse([
        { area: "13112", time: "2022000000", cat01: "C3301", value: "18" },
      ]),
    );

    const result = await buildTransportData(
      mockClient,
      ["13112"],
      baseConfig,
      undefined,
    );

    expect(result.size).toBe(1);
    const setagaya = result.get("13112")!;
    expect(setagaya.stationCountPerCapita).toBeNull();
    // ターミナル距離は人口に依存しないので算出可能
    expect(setagaya.terminalAccessKm).not.toBeNull();
  });

  it("e-Statから空データの場合、静的駅DBでフォールバックする", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    // 最新年（2022年）: 空
    mockClient.getStatsData
      .mockResolvedValueOnce(createStatsResponse([]))
      // 2021年: 空
      .mockResolvedValueOnce(createStatsResponse([]));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildTransportData(
      mockClient,
      ["13112", "13113"],
      baseConfig,
      populationMap,
    );

    // 静的駅DBのフォールバックにより駅数が取得できる
    // (世田谷区・渋谷区は静的駅DBにareaCodeが含まれている)
    expect(result.size).toBeGreaterThan(0);
    const setagaya = result.get("13112");
    if (setagaya) {
      expect(setagaya.dataYear).toBe("static");
    }

    consoleSpy.mockRestore();
  });

  it("API失敗時に静的駅DBでフォールバックする", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getMetaInfo.mockRejectedValue(new Error("API接続エラー"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildTransportData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    // エラーでも静的DBフォールバックで結果が返る
    expect(result.size).toBeGreaterThan(0);
    consoleSpy.mockRestore();
  });

  it("明示的なtimeCodeで時点を選択できる", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValueOnce(
      createStatsResponse([
        { area: "13112", time: "2021000000", cat01: "C3301", value: "17" },
      ]),
    );

    const result = await buildTransportData(
      mockClient,
      ["13112"],
      { ...baseConfig, timeCode: "2021000000" },
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(result.get("13112")!.dataYear).toBe("2021");
  });

  it("tabクラスの指標を自動検出する", async () => {
    const mockClient = createMockClient(tabMetaInfo);
    mockClient.getStatsData.mockResolvedValueOnce(
      createStatsResponse([
        { area: "13112", time: "2021100000", cat01: "R110", tab: "C3301", value: "18" },
      ]),
    );

    const result = await buildTransportData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "C3301" }),
    );
  });

  it("指標分類が検出できない場合、静的駅DBで代替する", async () => {
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
    const result = await buildTransportData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    // 静的DBフォールバックにより結果が返る
    expect(result.size).toBeGreaterThan(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("自動検出できませんでした"),
    );
    consoleSpy.mockRestore();
  });

  it("最新年にデータがない場合、前年にフォールバックする", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    // 2022年: 空
    mockClient.getStatsData
      .mockResolvedValueOnce(createStatsResponse([]))
      // 2021年: データあり
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13112", time: "2021000000", cat01: "C3301", value: "17" },
        ]),
      );

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await buildTransportData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    expect(result.size).toBe(1);
    expect(result.get("13112")!.dataYear).toBe("2021");
    expect(mockClient.getStatsData).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it("ターミナル距離は常に算出される（e-Statに関わらず）", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
    mockClient.getStatsData.mockResolvedValueOnce(
      createStatsResponse([
        { area: "13112", time: "2022000000", cat01: "C3301", value: "18" },
      ]),
    );

    const result = await buildTransportData(
      mockClient,
      ["13112"],
      baseConfig,
      populationMap,
    );

    const setagaya = result.get("13112")!;
    expect(setagaya.terminalAccessKm).not.toBeNull();
    expect(typeof setagaya.terminalAccessKm).toBe("number");
    expect(setagaya.terminalAccessKm!).toBeGreaterThan(0);
  });
});
