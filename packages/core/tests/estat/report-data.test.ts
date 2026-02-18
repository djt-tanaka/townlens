import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReportData, BuildReportInput, ReportRow } from "../../src/estat/report-data";

// e-Stat APIレスポンスのモック用フィクスチャ
const sampleMetaInfo = {
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
        "@name": "時間軸（年次）",
        CLASS: [
          { "@code": "2020000000", "@name": "2020年" },
        ],
      },
      {
        "@id": "cat01",
        "@name": "年齢分類",
        CLASS: [
          { "@code": "000", "@name": "総数" },
          { "@code": "001", "@name": "0～14歳" },
        ],
      },
    ],
  },
};

function createMockStatsData(area: string, catCode: string, value: number) {
  return {
    GET_STATS_DATA: {
      STATISTICAL_DATA: {
        DATA_INF: {
          VALUE: [{ "@area": area, "@time": "2020000000", "@cat01": catCode, $: String(value) }],
        },
      },
    },
  };
}

function createMockClient(dataMap: Record<string, number>) {
  return {
    getStatsData: vi.fn().mockImplementation((params: Record<string, string>) => {
      const area = params.cdArea;
      const catCode = params.cdCat01;
      // 複数エリアの場合（カンマ区切り）
      const areas = area.split(",");
      const values = areas.map((a: string) => ({
        "@area": a,
        "@time": "2020000000",
        "@cat01": catCode,
        $: String(dataMap[`${a}_${catCode}`] ?? 0),
      }));
      return Promise.resolve({
        GET_STATS_DATA: {
          STATISTICAL_DATA: {
            DATA_INF: { VALUE: values },
          },
        },
      });
    }),
    getStatsList: vi.fn(),
    getMetaInfo: vi.fn(),
  };
}

describe("buildReportData", () => {
  it("2都市の比較レポートデータを生成する", async () => {
    const client = createMockClient({
      "13104_000": 346235,  // 新宿区・総数
      "13104_001": 32451,   // 新宿区・0-14歳
      "13113_000": 227850,  // 渋谷区・総数
      "13113_001": 22100,   // 渋谷区・0-14歳
    });

    const result = await buildReportData({
      client: client as any,
      statsDataId: "0003448299",
      cityNames: ["新宿区", "渋谷区"],
      metaInfo: sampleMetaInfo,
    });

    expect(result.rows).toHaveLength(2);

    const shinjuku = result.rows.find((r) => r.cityInput === "新宿区");
    expect(shinjuku).toBeDefined();
    expect(shinjuku!.total).toBe(346235);
    expect(shinjuku!.kids).toBe(32451);
    expect(shinjuku!.ratio).toBeCloseTo((32451 / 346235) * 100, 4);

    const shibuya = result.rows.find((r) => r.cityInput === "渋谷区");
    expect(shibuya).toBeDefined();
    expect(shibuya!.total).toBe(227850);
    expect(shibuya!.kids).toBe(22100);
  });

  it("人口順とratio順のランクが正しく付与される", async () => {
    const client = createMockClient({
      "13104_000": 300000,
      "13104_001": 30000,  // ratio: 10%
      "13113_000": 200000,
      "13113_001": 24000,  // ratio: 12%
    });

    const result = await buildReportData({
      client: client as any,
      statsDataId: "0003448299",
      cityNames: ["新宿区", "渋谷区"],
      metaInfo: sampleMetaInfo,
    });

    const shinjuku = result.rows.find((r) => r.cityInput === "新宿区")!;
    const shibuya = result.rows.find((r) => r.cityInput === "渋谷区")!;

    // 人口順: 新宿区(300000) > 渋谷区(200000)
    expect(shinjuku.totalRank).toBe(1);
    expect(shibuya.totalRank).toBe(2);

    // ratio順: 渋谷区(12%) > 新宿区(10%)
    expect(shibuya.ratioRank).toBe(1);
    expect(shinjuku.ratioRank).toBe(2);
  });

  it("timeLabelが設定される", async () => {
    const client = createMockClient({
      "13104_000": 100,
      "13104_001": 10,
    });

    const result = await buildReportData({
      client: client as any,
      statsDataId: "test",
      cityNames: ["新宿区"],
      metaInfo: sampleMetaInfo,
    });

    expect(result.timeLabel).toContain("2020000000");
    expect(result.timeLabel).toContain("2020年");
  });

  it("cat02（男女）軸がある場合、cdCat02をAPIパラメータに追加する", async () => {
    const metaWithCat02 = {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            "@id": "area",
            "@name": "地域事項",
            CLASS: [{ "@code": "13104", "@name": "新宿区" }],
          },
          {
            "@id": "time",
            "@name": "時間軸（年次）",
            CLASS: [{ "@code": "2020000000", "@name": "2020年" }],
          },
          {
            "@id": "cat01",
            "@name": "年齢分類",
            CLASS: [
              { "@code": "000", "@name": "総数" },
              { "@code": "001", "@name": "0～14歳" },
            ],
          },
          {
            "@id": "cat02",
            "@name": "男女",
            CLASS: [
              { "@code": "000", "@name": "総数" },
              { "@code": "001", "@name": "男" },
              { "@code": "002", "@name": "女" },
            ],
          },
        ],
      },
    };

    const client = {
      getStatsData: vi.fn().mockImplementation((params: Record<string, string>) => {
        // cdCat02 が "000"（総数）で指定されていることを検証
        expect(params.cdCat02).toBe("000");
        const catCode = params.cdCat01;
        return Promise.resolve({
          GET_STATS_DATA: {
            STATISTICAL_DATA: {
              DATA_INF: {
                VALUE: [{
                  "@area": "13104",
                  "@time": "2020000000",
                  "@cat01": catCode,
                  "@cat02": "000",
                  $: catCode === "000" ? "346235" : "32451",
                }],
              },
            },
          },
        });
      }),
      getStatsList: vi.fn(),
      getMetaInfo: vi.fn(),
    };

    const result = await buildReportData({
      client: client as any,
      statsDataId: "0003448299",
      cityNames: ["新宿区"],
      metaInfo: metaWithCat02,
    });

    const shinjuku = result.rows[0];
    expect(shinjuku.total).toBe(346235);
    expect(shinjuku.kids).toBe(32451);
    expect(shinjuku.ratio).toBeCloseTo((32451 / 346235) * 100, 2);
  });

  it("tab（表章項目）軸がある場合、cdTabをAPIパラメータに追加する", async () => {
    const metaWithTab = {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            "@id": "area",
            "@name": "地域事項",
            CLASS: [{ "@code": "13104", "@name": "新宿区" }],
          },
          {
            "@id": "time",
            "@name": "時間軸（年次）",
            CLASS: [{ "@code": "2020000000", "@name": "2020年" }],
          },
          {
            "@id": "cat01",
            "@name": "年齢分類",
            CLASS: [
              { "@code": "000", "@name": "総数" },
              { "@code": "001", "@name": "0～14歳" },
            ],
          },
          {
            "@id": "tab",
            "@name": "表章項目",
            CLASS: [
              { "@code": "010", "@name": "実数" },
              { "@code": "020", "@name": "構成比" },
            ],
          },
        ],
      },
    };

    const client = {
      getStatsData: vi.fn().mockImplementation((params: Record<string, string>) => {
        // cdTab が "010"（実数）で指定されていることを検証
        expect(params.cdTab).toBe("010");
        const catCode = params.cdCat01;
        return Promise.resolve({
          GET_STATS_DATA: {
            STATISTICAL_DATA: {
              DATA_INF: {
                VALUE: [{
                  "@area": "13104",
                  "@time": "2020000000",
                  "@cat01": catCode,
                  "@tab": "010",
                  $: catCode === "000" ? "346235" : "32451",
                }],
              },
            },
          },
        });
      }),
      getStatsList: vi.fn(),
      getMetaInfo: vi.fn(),
    };

    const result = await buildReportData({
      client: client as any,
      statsDataId: "0003448299",
      cityNames: ["新宿区"],
      metaInfo: metaWithTab,
    });

    const shinjuku = result.rows[0];
    expect(shinjuku.total).toBe(346235);
    expect(shinjuku.kids).toBe(32451);
  });

  it("APIが空データを返した場合、ヒント付きエラーを投げる", async () => {
    const emptyClient = {
      getStatsData: vi.fn().mockResolvedValue({
        GET_STATS_DATA: {
          STATISTICAL_DATA: {
            DATA_INF: { VALUE: [] },
          },
        },
      }),
      getStatsList: vi.fn(),
      getMetaInfo: vi.fn(),
    };

    await expect(
      buildReportData({
        client: emptyClient as any,
        statsDataId: "0003448299",
        cityNames: ["新宿区"],
        metaInfo: sampleMetaInfo,
      })
    ).rejects.toThrow(/統計値を取得できない/);
  });
});
