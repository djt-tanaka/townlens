import { describe, it, expect, vi } from "vitest";
import { buildMeshData, meshDataToReportRows, meshRowsToScoringInput } from "../../src/mesh/mesh-data";
import type { BuildMeshDataResult } from "../../src/mesh/mesh-data";
import type { MeshDataPoint } from "../../src/mesh/types";

/** メッシュ統計用のモックメタ情報 */
const sampleMetaInfo = {
  CLASS_INF: {
    CLASS_OBJ: [
      {
        "@id": "area",
        "@name": "地域事項",
        CLASS: [
          { "@code": "53394525", "@name": "53394525" },
          { "@code": "53394526", "@name": "53394526" },
          { "@code": "53394527", "@name": "53394527" },
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

/** モックAPIクライアント */
function createMockClient(dataMap: Record<string, number>) {
  return {
    getStatsData: vi.fn().mockImplementation((params: Record<string, string>) => {
      const areas = params.cdArea.split(",");
      const catCode = params.cdCat01;
      // dataMapにキーが存在するエリアのみ返す（API実動作に合わせる）
      const values = areas
        .filter((a: string) => `${a}_${catCode}` in dataMap)
        .map((a: string) => ({
          "@area": a,
          "@time": "2020000000",
          "@cat01": catCode,
          $: String(dataMap[`${a}_${catCode}`]),
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

describe("buildMeshData", () => {
  it("メッシュコードから人口データを取得する", async () => {
    const client = createMockClient({
      "53394525_000": 1200,
      "53394525_001": 150,
      "53394526_000": 800,
      "53394526_001": 90,
    });

    const result = await buildMeshData({
      client: client as any,
      statsDataId: "test-mesh-id",
      meshCodes: ["53394525", "53394526"],
      metaInfo: sampleMetaInfo,
    });

    expect(result.data.size).toBe(2);

    const mesh1 = result.data.get("53394525");
    expect(mesh1).toBeDefined();
    expect(mesh1!.population).toBe(1200);
    expect(mesh1!.kidsPopulation).toBe(150);
    expect(mesh1!.kidsRatio).toBeCloseTo((150 / 1200) * 100, 2);

    const mesh2 = result.data.get("53394526");
    expect(mesh2).toBeDefined();
    expect(mesh2!.population).toBe(800);
    expect(mesh2!.kidsPopulation).toBe(90);
  });

  it("timeLabelとageSelectionを返す", async () => {
    const client = createMockClient({
      "53394525_000": 100,
      "53394525_001": 10,
    });

    const result = await buildMeshData({
      client: client as any,
      statsDataId: "test-mesh-id",
      meshCodes: ["53394525"],
      metaInfo: sampleMetaInfo,
    });

    expect(result.timeLabel).toContain("2020000000");
    expect(result.ageSelection.total.code).toBe("000");
    expect(result.ageSelection.kids.code).toBe("001");
  });

  it("データが存在しないメッシュはスキップされる", async () => {
    const client = createMockClient({
      "53394525_000": 500,
      "53394525_001": 60,
      // 53394527 にはデータなし
    });

    const result = await buildMeshData({
      client: client as any,
      statsDataId: "test-mesh-id",
      meshCodes: ["53394525", "53394527"],
      metaInfo: sampleMetaInfo,
    });

    expect(result.data.size).toBe(1);
    expect(result.data.has("53394525")).toBe(true);
    expect(result.data.has("53394527")).toBe(false);
  });

  it("100コード超のバッチ分割が動作する", async () => {
    const meshCodes: string[] = [];
    const dataMap: Record<string, number> = {};

    for (let i = 0; i < 150; i++) {
      const code = `533945${String(i).padStart(2, "0")}`;
      meshCodes.push(code);
      dataMap[`${code}_000`] = 100 + i;
      dataMap[`${code}_001`] = 10 + i;
    }

    const client = createMockClient(dataMap);

    const result = await buildMeshData({
      client: client as any,
      statsDataId: "test-mesh-id",
      meshCodes,
      metaInfo: sampleMetaInfo,
    });

    // 150コード → 2バッチ(100+50) × 2指標(total+kids) = 4回のAPI呼び出し
    expect(client.getStatsData).toHaveBeenCalledTimes(4);
    expect(result.data.size).toBe(150);
  });

  it("セレクタ上書きが適用される", async () => {
    const customMeta = {
      CLASS_INF: {
        CLASS_OBJ: [
          {
            "@id": "area",
            "@name": "地域事項",
            CLASS: [{ "@code": "53394525", "@name": "53394525" }],
          },
          {
            "@id": "time",
            "@name": "時間軸",
            CLASS: [{ "@code": "2020000000", "@name": "2020年" }],
          },
          {
            "@id": "cat02",
            "@name": "年齢区分",
            CLASS: [
              { "@code": "T00", "@name": "総数" },
              { "@code": "T01", "@name": "0～14歳" },
            ],
          },
        ],
      },
    };

    const client = {
      getStatsData: vi.fn().mockImplementation((params: Record<string, string>) => {
        const catCode = params.cdCat02;
        return Promise.resolve({
          GET_STATS_DATA: {
            STATISTICAL_DATA: {
              DATA_INF: {
                VALUE: [{
                  "@area": "53394525",
                  "@time": "2020000000",
                  "@cat02": catCode,
                  $: catCode === "T00" ? "999" : "111",
                }],
              },
            },
          },
        });
      }),
      getStatsList: vi.fn(),
      getMetaInfo: vi.fn(),
    };

    const result = await buildMeshData({
      client: client as any,
      statsDataId: "test",
      meshCodes: ["53394525"],
      metaInfo: customMeta,
      selectors: { classId: "cat02", totalCode: "T00", kidsCode: "T01" },
    });

    expect(result.data.get("53394525")?.population).toBe(999);
    expect(result.data.get("53394525")?.kidsPopulation).toBe(111);
  });
});

describe("meshDataToReportRows", () => {
  const meshResult: BuildMeshDataResult = {
    data: new Map<string, MeshDataPoint>([
      ["53394525", { meshCode: "53394525", population: 1200, kidsPopulation: 150, kidsRatio: 12.5 }],
      ["53394526", { meshCode: "53394526", population: 800, kidsPopulation: 90, kidsRatio: 11.25 }],
    ]),
    timeLabel: "2020000000 (2020年)",
    totalLabel: "総数",
    kidsLabel: "0～14歳",
    ageSelection: { classId: "cat01", paramName: "cdCat01", total: { code: "000", name: "総数" }, kids: { code: "001", name: "0～14歳" } },
  };

  it("MeshDataPointからReportRowに変換する", () => {
    const rows = meshDataToReportRows(["53394525", "53394526"], meshResult);
    expect(rows).toHaveLength(2);

    expect(rows[0].areaCode).toBe("53394525");
    expect(rows[0].cityResolved).toBe("メッシュ53394525");
    expect(rows[0].total).toBe(1200);
    expect(rows[0].kids).toBe(150);
  });

  it("人口順ランクが正しく付与される", () => {
    const rows = meshDataToReportRows(["53394525", "53394526"], meshResult);
    const row1 = rows.find((r) => r.areaCode === "53394525")!;
    const row2 = rows.find((r) => r.areaCode === "53394526")!;

    expect(row1.totalRank).toBe(1); // 1200 > 800
    expect(row2.totalRank).toBe(2);
  });

  it("データのないメッシュはスキップされる", () => {
    const rows = meshDataToReportRows(["53394525", "99999999"], meshResult);
    expect(rows).toHaveLength(1);
    expect(rows[0].areaCode).toBe("53394525");
  });
});

describe("meshRowsToScoringInput", () => {
  it("ReportRowからスコアリング入力を構築する", () => {
    const rows = [
      { cityInput: "53394525", cityResolved: "メッシュ53394525", areaCode: "53394525", total: 1200, kids: 150, ratio: 12.5, totalRank: 1, ratioRank: 1 },
    ];

    const input = meshRowsToScoringInput(rows, "2020", "test-id");
    expect(input).toHaveLength(1);
    expect(input[0].cityName).toBe("メッシュ53394525");
    expect(input[0].areaCode).toBe("53394525");
    expect(input[0].indicators).toHaveLength(2);
    expect(input[0].indicators[0].indicatorId).toBe("population_total");
    expect(input[0].indicators[0].rawValue).toBe(1200);
    expect(input[0].indicators[1].indicatorId).toBe("kids_ratio");
    expect(input[0].indicators[1].rawValue).toBe(12.5);
  });
});
