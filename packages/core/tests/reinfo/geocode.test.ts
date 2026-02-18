import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { geocodeCityName } from "../../src/reinfo/geocode";

vi.mock("axios");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("geocodeCityName", () => {
  it("正常なレスポンスで座標を返す", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [
        {
          geometry: { coordinates: [137.0851, 34.9587] },
          properties: { title: "愛知県安城市" },
        },
      ],
    });

    const result = await geocodeCityName("安城市");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(34.96, 1);
    expect(result!.lng).toBeCloseTo(137.09, 1);
  });

  it("空の結果配列でnullを返す", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });

    const result = await geocodeCityName("存在しない市");
    expect(result).toBeNull();
  });

  it("APIエラーでnullを返す", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

    const result = await geocodeCityName("安城市");
    expect(result).toBeNull();
  });

  it("不正なレスポンス形式でnullを返す", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: "invalid" });

    const result = await geocodeCityName("安城市");
    expect(result).toBeNull();
  });

  it("GeoJSON標準の[lng, lat]順序を正しくパースする", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: [
        {
          geometry: { coordinates: [139.6917, 35.6895] },
          properties: { title: "東京都" },
        },
      ],
    });

    const result = await geocodeCityName("東京");
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(35.69, 1);
    expect(result!.lng).toBeCloseTo(139.69, 1);
  });
});
