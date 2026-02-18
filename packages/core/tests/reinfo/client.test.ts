import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { ReinfoApiClient } from "../../src/reinfo/client";
import { AppError } from "../../src/errors";

vi.mock("axios");

const mockAxiosInstance = {
  get: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as any);
  vi.mocked(axios.isAxiosError).mockImplementation(
    (error: any) => error?.isAxiosError === true,
  );
});

describe("ReinfoApiClient", () => {
  describe("constructor", () => {
    it("空のAPIキーでAppErrorをスローする", () => {
      expect(() => new ReinfoApiClient("")).toThrow(AppError);
    });

    it("有効なAPIキーでインスタンスを生成する", () => {
      const client = new ReinfoApiClient("test-key");
      expect(client).toBeInstanceOf(ReinfoApiClient);
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { "Ocp-Apim-Subscription-Key": "test-key" },
        }),
      );
    });
  });

  describe("fetchTrades", () => {
    it("取引データを取得できる", async () => {
      const mockData = [
        { Type: "中古マンション等", TradePrice: "30000000", Area: "100" },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: { data: mockData } });

      const client = new ReinfoApiClient("test-key");
      const result = await client.fetchTrades({ year: "2024", city: "13101" });

      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("XIT001", {
        params: { year: "2024", city: "13101" },
      });
    });

    it("dataがnullの場合は空配列を返す", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: null } });

      const client = new ReinfoApiClient("test-key");
      const result = await client.fetchTrades({ year: "2024", city: "13101" });

      expect(result).toEqual([]);
    });

    it("quarterパラメータを送信できる", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });

      const client = new ReinfoApiClient("test-key");
      await client.fetchTrades({ year: "2024", city: "13101", quarter: "1" });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("XIT001", {
        params: { year: "2024", city: "13101", quarter: "1" },
      });
    });

    it("undefinedパラメータはリクエストに含まれない", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { data: [] } });

      const client = new ReinfoApiClient("test-key");
      await client.fetchTrades({
        year: "2024",
        city: "13101",
        quarter: undefined,
        priceClassification: undefined,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("XIT001", {
        params: { year: "2024", city: "13101" },
      });
    });
  });

  describe("fetchCities", () => {
    it("市区町村一覧を取得できる", async () => {
      const mockData = [
        { id: "13101", name: "千代田区" },
        { id: "13102", name: "中央区" },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: { data: mockData } });

      const client = new ReinfoApiClient("test-key");
      const result = await client.fetchCities("13");

      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("XIT002", {
        params: { area: "13" },
      });
    });
  });

  describe("fetchTile", () => {
    it("response_format=geojsonパラメータを含めてリクエストする", async () => {
      const mockGeoJson = { type: "FeatureCollection", features: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: mockGeoJson });

      const client = new ReinfoApiClient("test-key");
      await client.fetchTile("XKT026", { z: 14, x: 14430, y: 6491 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("XKT026", {
        params: {
          response_format: "geojson",
          z: "14",
          x: "14430",
          y: "6491",
        },
      });
    });

    it("GeoJSONレスポンスを返す", async () => {
      const mockGeoJson = {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: {} }],
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockGeoJson });

      const client = new ReinfoApiClient("test-key");
      const result = await client.fetchTile("XGT001", { z: 14, x: 14430, y: 6491 });

      expect(result.features).toHaveLength(1);
    });
  });

  describe("エラーハンドリング", () => {
    it("401エラーで認証エラーメッセージをスローする", async () => {
      const axiosError = {
        isAxiosError: true,
        message: "Request failed",
        response: { status: 401 },
        code: undefined,
      };
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      const client = new ReinfoApiClient("test-key");
      await expect(client.fetchTrades({ year: "2024", city: "13101" })).rejects.toThrow(
        "認証に失敗",
      );
    });

    it("500エラーでリトライ後に通信エラーをスローする", async () => {
      const axiosError = {
        isAxiosError: true,
        message: "Internal Server Error",
        response: { status: 500 },
        code: undefined,
      };
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      const client = new ReinfoApiClient("test-key");
      await expect(client.fetchTrades({ year: "2024", city: "13101" })).rejects.toThrow(
        "通信に失敗",
      );
      // 3回リトライ
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    }, 15000);

    it("429でリトライ後に成功する", async () => {
      const axiosError = {
        isAxiosError: true,
        message: "Too Many Requests",
        response: { status: 429 },
        code: undefined,
      };
      const successResponse = { data: { data: [{ Type: "test" }] } };

      mockAxiosInstance.get
        .mockRejectedValueOnce(axiosError)
        .mockResolvedValueOnce(successResponse);

      const client = new ReinfoApiClient("test-key");
      const result = await client.fetchTrades({ year: "2024", city: "13101" });

      expect(result).toEqual([{ Type: "test" }]);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    }, 15000);

    it("非Axiosエラーはそのまま再スローする", async () => {
      mockAxiosInstance.get.mockRejectedValue(new TypeError("Network error"));

      const client = new ReinfoApiClient("test-key");
      await expect(client.fetchTrades({ year: "2024", city: "13101" })).rejects.toThrow(
        TypeError,
      );
    });
  });
});
