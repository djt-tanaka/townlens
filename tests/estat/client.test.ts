import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { EstatApiClient } from "../../src/estat/client";
import { CliError } from "../../src/errors";

vi.mock("axios");

function createAxiosMock() {
  const instance = { get: vi.fn() };
  vi.mocked(axios.create).mockReturnValue(instance as any);
  vi.mocked(axios.isAxiosError).mockReturnValue(false);
  return instance;
}

function wrapResponse(rootKey: string, status: number, errorMsg?: string, dataInf?: any) {
  return {
    data: {
      [rootKey]: {
        RESULT: {
          STATUS: status,
          ...(errorMsg ? { ERROR_MSG: errorMsg } : {}),
        },
        ...(rootKey === "GET_STATS_DATA" ? { STATISTICAL_DATA: { DATA_INF: dataInf ?? { VALUE: [] } } } : {}),
        ...(rootKey === "GET_META_INFO" ? { METADATA_INF: { CLASS_INF: {} } } : {}),
      },
    },
  };
}

describe("EstatApiClient", () => {
  let mock: ReturnType<typeof createAxiosMock>;
  let client: EstatApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createAxiosMock();
    client = new EstatApiClient("test-app-id");
  });

  describe("status=0 (正常)", () => {
    it("getStatsData でデータを正常に返す", async () => {
      const value = [{ "@area": "13104", "@time": "2020000000", $: "346235" }];
      mock.get.mockResolvedValue(
        wrapResponse("GET_STATS_DATA", 0, undefined, { VALUE: value })
      );

      const result = await client.getStatsData({ statsDataId: "test" });
      expect(result.GET_STATS_DATA.STATISTICAL_DATA.DATA_INF.VALUE).toHaveLength(1);
    });

    it("getMetaInfo でメタ情報を返す", async () => {
      mock.get.mockResolvedValue(wrapResponse("GET_META_INFO", 0));

      const result = await client.getMetaInfo("test-id");
      expect(result).toBeDefined();
    });
  });

  describe("status=1 (データなし)", () => {
    it("getStatsData では throw せず data を返す", async () => {
      mock.get.mockResolvedValue(
        wrapResponse("GET_STATS_DATA", 1, "正常に終了しましたが、該当するデータはありませんでした。")
      );

      const result = await client.getStatsData({ statsDataId: "test" });
      expect(result).toBeDefined();
      expect(result.GET_STATS_DATA).toBeDefined();
    });

    it("getStatsData で console.warn に警告を出力する", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mock.get.mockResolvedValue(
        wrapResponse("GET_STATS_DATA", 1, "正常に終了しましたが、該当するデータはありませんでした。")
      );

      await client.getStatsData({ statsDataId: "test" });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("該当するデータはありません")
      );
      warnSpy.mockRestore();
    });

    it("getStatsData で errorMsg が空の場合は warn を出さない", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mock.get.mockResolvedValue(wrapResponse("GET_STATS_DATA", 1));

      await client.getStatsData({ statsDataId: "test" });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("getMetaInfo では CliError を throw する", async () => {
      mock.get.mockResolvedValue(
        wrapResponse("GET_META_INFO", 1, "該当するメタ情報がありません")
      );

      await expect(client.getMetaInfo("invalid-id")).rejects.toThrow(CliError);
      await expect(client.getMetaInfo("invalid-id")).rejects.toThrow(/statsDataId が無効または廃止/);
    });
  });

  describe("status=100+ (APIエラー)", () => {
    it("getStatsData で CliError を throw する", async () => {
      mock.get.mockResolvedValue(
        wrapResponse("GET_STATS_DATA", 100, "パラメータが不正です")
      );

      await expect(client.getStatsData({ statsDataId: "test" })).rejects.toThrow(CliError);
      await expect(client.getStatsData({ statsDataId: "test" })).rejects.toThrow(/status=100/);
    });

    it("getMetaInfo で CliError を throw する", async () => {
      mock.get.mockResolvedValue(
        wrapResponse("GET_META_INFO", 100, "パラメータが不正です")
      );

      await expect(client.getMetaInfo("test-id")).rejects.toThrow(CliError);
    });
  });
});
