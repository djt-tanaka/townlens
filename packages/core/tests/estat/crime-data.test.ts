import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCrimeData, CrimeDataConfig } from "../../src/estat/crime-data";

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

  function createMockClient(metaInfo: any) {
    return {
      getMetaInfo: vi.fn().mockResolvedValue(metaInfo),
      getStatsData: vi.fn(),
    } as any;
  }

  it("複数都市の犯罪統計を取得する", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
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
    const mockClient = createMockClient(sampleMetaInfo);
    const result = await buildCrimeData(mockClient, [], baseConfig);
    expect(result.size).toBe(0);
    expect(mockClient.getMetaInfo).not.toHaveBeenCalled();
  });

  it("データが存在しない都市はMapに含まれない", async () => {
    const mockClient = createMockClient(sampleMetaInfo);
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
    const mockClient = createMockClient(sampleMetaInfo);
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
    const mockClient = createMockClient(sampleMetaInfo);
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
    const mockClient = createMockClient(sampleMetaInfo);
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
    const mockClient = createMockClient(sampleMetaInfo);
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
    const mockClient = createMockClient(sampleMetaInfo);
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

  it("tab クラスの指標（刑法犯認知件数）を自動検出し千人当たりを優先する", async () => {
    const mockClient = createMockClient(tabMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2009100000", cat01: "R3120", tab: "K4201", value: "15.2" },
      ]),
    );

    const result = await buildCrimeData(mockClient, ["13104"], baseConfig);

    expect(result.size).toBe(1);
    expect(result.get("13104")!.crimeRate).toBe(15.2);
    expect(result.get("13104")!.dataYear).toBe("2009");
    // tab クラスから K4201（刑法犯認知件数）が検出され cdTab に設定される
    // cat01 は「人口千人当たり」(R3120) が優先される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "K4201", cdCat01: "R3120" }),
    );
  });

  it("最新年にデータがない場合、前年度にフォールバックする", async () => {
    const mockClient = createMockClient(tabMetaInfo);
    // 1回目(2009年度): 空レスポンス → 2回目(2008年度): データあり
    mockClient.getStatsData
      .mockResolvedValueOnce(createStatsResponse([]))
      .mockResolvedValueOnce(
        createStatsResponse([
          { area: "13104", time: "2008100000", cat01: "R3120", tab: "K4201", value: "10.5" },
          { area: "13113", time: "2008100000", cat01: "R3120", tab: "K4201", value: "7.8" },
        ]),
      );

    const result = await buildCrimeData(mockClient, ["13104", "13113"], baseConfig);

    expect(result.size).toBe(2);
    expect(result.get("13104")!.crimeRate).toBe(10.5);
    expect(result.get("13104")!.dataYear).toBe("2008");
    expect(result.get("13113")!.crimeRate).toBe(7.8);
    // 2回API呼び出しが行われる
    expect(mockClient.getStatsData).toHaveBeenCalledTimes(2);
  });

  it("tab 指標検出時に「千人当たり」が実数より優先される", async () => {
    const mockClient = createMockClient(tabMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2009100000", cat01: "R3120", tab: "K4201", value: "15.2" },
      ]),
    );

    await buildCrimeData(mockClient, ["13104"], baseConfig);

    // tab の K4201 と cat01 の「人口千人当たり」(R3120) が適用される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({
        cdTab: "K4201",
        cdCat01: "R3120",
      }),
    );
  });

  it("tab 内に実数と千人当たりの両方の指標がある場合、千人当たりを優先する", async () => {
    // 社会・人口統計体系では tab に実数指標と千人当たり指標が混在する場合がある
    const mixedTabMetaInfo = {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            "@id": "tab",
            "@name": "表章項目",
            CLASS: [
              { "@code": "K3101", "@name": "K3101_交通事故発生件数" },
              { "@code": "K4201", "@name": "K4201_刑法犯認知件数" },
              { "@code": "K6101", "@name": "K6101_刑法犯認知件数（人口千人当たり）" },
              { "@code": "K6104", "@name": "K6104_窃盗犯認知件数（人口千人当たり）" },
            ],
          },
          {
            "@id": "cat01",
            "@name": "K安全 分類",
            CLASS: [
              { "@code": "R3110", "@name": "実数" },
            ],
          },
          {
            "@id": "area",
            "@name": "地域事項",
            CLASS: [
              { "@code": "23212", "@name": "安城市" },
              { "@code": "23202", "@name": "岡崎市" },
            ],
          },
          {
            "@id": "time",
            "@name": "時間軸（年度）",
            CLASS: [
              { "@code": "2022100000", "@name": "2022年度" },
            ],
          },
        ],
      },
    };

    const mockClient = createMockClient(mixedTabMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "23212", time: "2022100000", cat01: "R3110", tab: "K6101", value: "7.2" },
        { area: "23202", time: "2022100000", cat01: "R3110", tab: "K6101", value: "6.8" },
      ]),
    );

    const result = await buildCrimeData(mockClient, ["23212", "23202"], baseConfig);

    // K4201（実数）ではなく K6101（千人当たり）が選択される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdTab: "K6101" }),
    );
    expect(result.size).toBe(2);
    expect(result.get("23212")!.crimeRate).toBe(7.2);
    expect(result.get("23202")!.crimeRate).toBe(6.8);
  });

  it("cat01 内の「千人当り」（「た」なし表記）も検出できる", async () => {
    const altLabelMetaInfo = {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            "@id": "tab",
            "@name": "表章項目",
            CLASS: [
              { "@code": "K4201", "@name": "K4201_刑法犯認知件数" },
            ],
          },
          {
            "@id": "cat01",
            "@name": "K安全 分類",
            CLASS: [
              { "@code": "R3110", "@name": "実数" },
              { "@code": "R3120", "@name": "人口千人当り" },
            ],
          },
          {
            "@id": "area",
            "@name": "地域事項",
            CLASS: [
              { "@code": "13104", "@name": "新宿区" },
            ],
          },
          {
            "@id": "time",
            "@name": "時間軸（年度）",
            CLASS: [
              { "@code": "2022100000", "@name": "2022年度" },
            ],
          },
        ],
      },
    };

    const mockClient = createMockClient(altLabelMetaInfo);
    mockClient.getStatsData.mockResolvedValue(
      createStatsResponse([
        { area: "13104", time: "2022100000", cat01: "R3120", tab: "K4201", value: "9.5" },
      ]),
    );

    await buildCrimeData(mockClient, ["13104"], baseConfig);

    // 「千人当り」（「た」なし）でも cdCat01=R3120 が適用される
    expect(mockClient.getStatsData).toHaveBeenCalledWith(
      expect.objectContaining({ cdCat01: "R3120" }),
    );
  });
});
