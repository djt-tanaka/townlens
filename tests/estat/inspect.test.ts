import { describe, it, expect, vi } from "vitest";
import { inspectStatsData, formatInspectResult, InspectResult } from "../../src/estat/inspect";

vi.mock("../../src/estat/cache", () => ({
  loadMetaInfoWithCache: vi.fn(),
}));

import { loadMetaInfoWithCache } from "../../src/estat/cache";
const mockedLoadMeta = vi.mocked(loadMetaInfoWithCache);

const goodMetaInfo = {
  CLASS_INF: {
    CLASS_OBJ: [
      {
        "@id": "area",
        "@name": "地域事項",
        CLASS: [
          { "@code": "13104", "@name": "新宿区" },
          { "@code": "14100", "@name": "横浜市" },
        ],
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
    ],
  },
};

const badMetaInfo = {
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
        "@name": "産業分類",
        CLASS: [
          { "@code": "A", "@name": "農業" },
          { "@code": "B", "@name": "漁業" },
        ],
      },
    ],
  },
};

const mockClient = {
  getMetaInfo: vi.fn(),
  getStatsData: vi.fn(),
  getStatsList: vi.fn(),
} as any;

describe("inspectStatsData", () => {
  it("正常な統計表ではcanGenerateReport=trueを返す", async () => {
    mockedLoadMeta.mockResolvedValue(goodMetaInfo);
    const result = await inspectStatsData(mockClient, "0003448299");

    expect(result.canGenerateReport).toBe(true);
    expect(result.areaDetection.success).toBe(true);
    expect(result.timeDetection.success).toBe(true);
    expect(result.ageDetection.success).toBe(true);
    expect(result.ageDetection.totalCode).toBe("000");
    expect(result.ageDetection.kidsCode).toBe("001");
  });

  it("年齢区分が検出不能な統計表ではcanGenerateReport=falseを返す", async () => {
    mockedLoadMeta.mockResolvedValue(badMetaInfo);
    const result = await inspectStatsData(mockClient, "9999999999");

    expect(result.canGenerateReport).toBe(false);
    expect(result.ageDetection.success).toBe(false);
  });

  it("分類一覧を正しく要約する", async () => {
    mockedLoadMeta.mockResolvedValue(goodMetaInfo);
    const result = await inspectStatsData(mockClient, "0003448299");

    expect(result.classifications).toHaveLength(3);
    expect(result.classifications[0].id).toBe("area");
    expect(result.classifications[0].itemCount).toBe(2);
  });
});

describe("formatInspectResult", () => {
  it("成功時に「レポート生成: 可能」を含む", () => {
    const result: InspectResult = {
      statsDataId: "0003448299",
      classifications: [],
      areaDetection: { success: true, classId: "area", className: "地域事項", detail: "2件" },
      timeDetection: { success: true, classId: "time", detail: "最新: 2020年" },
      ageDetection: {
        success: true,
        classId: "cat01",
        totalCode: "000",
        totalName: "総数",
        kidsCode: "001",
        kidsName: "0～14歳",
        detail: "総数(000) / 0～14歳(001)",
      },
      canGenerateReport: true,
    };
    const output = formatInspectResult(result);
    expect(output).toContain("レポート生成: 可能");
  });

  it("失敗時に「レポート生成: 不可」と推奨IDを含む", () => {
    const result: InspectResult = {
      statsDataId: "9999999999",
      classifications: [],
      areaDetection: { success: true, classId: "area", className: "地域事項", detail: "1件" },
      timeDetection: { success: true, classId: "time", detail: "最新: 2020年" },
      ageDetection: { success: false, errorMessage: "年齢区分が見つかりません" },
      canGenerateReport: false,
    };
    const output = formatInspectResult(result);
    expect(output).toContain("レポート生成: 不可");
    expect(output).toContain("0003448299");
  });

  it("デフォルトIDの場合は推奨メッセージを表示しない", () => {
    const result: InspectResult = {
      statsDataId: "0003448299",
      classifications: [],
      areaDetection: { success: true, classId: "area", className: "地域事項", detail: "1件" },
      timeDetection: { success: false, errorMessage: "時間軸がない" },
      ageDetection: { success: false, errorMessage: "年齢区分がない" },
      canGenerateReport: false,
    };
    const output = formatInspectResult(result);
    expect(output).toContain("レポート生成: 不可");
    expect(output).not.toContain("推奨:");
  });
});
