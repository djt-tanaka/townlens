import { describe, it, expect, vi } from "vitest";
import { latLngToTile, fetchDisasterRisk } from "../../src/reinfo/disaster-client";

describe("latLngToTile", () => {
  it("東京駅付近の座標をタイル座標に変換する（z=14）", () => {
    const tile = latLngToTile(35.6812, 139.7671, 14);
    expect(tile.z).toBe(14);
    expect(tile.x).toBe(14552);
    expect(tile.y).toBe(6451);
  });

  it("ズームレベル0で全世界が1タイルになる", () => {
    const tile = latLngToTile(0, 0, 0);
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
    expect(tile.z).toBe(0);
  });

  it("負の経度（西半球）でも正しく変換する", () => {
    const tile = latLngToTile(40.7128, -74.0060, 10);
    expect(tile.z).toBe(10);
    expect(tile.x).toBe(301);
    expect(tile.y).toBe(385);
  });
});

describe("fetchDisasterRisk", () => {
  it("3種のタイルAPIを呼び出して結果を返す", async () => {
    const mockClient = {
      fetchTile: vi.fn()
        .mockResolvedValueOnce({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: {} }],
        })
        .mockResolvedValueOnce({
          type: "FeatureCollection",
          features: [],
        })
        .mockResolvedValueOnce({
          type: "FeatureCollection",
          features: [
            { type: "Feature", geometry: { type: "Point", coordinates: [] }, properties: {} },
            { type: "Feature", geometry: { type: "Point", coordinates: [] }, properties: {} },
          ],
        }),
    } as any;

    const result = await fetchDisasterRisk(mockClient, { lat: 35.69, lng: 139.70 });

    expect(result.floodRisk).toBe(true);
    expect(result.landslideRisk).toBe(false);
    expect(result.evacuationSiteCount).toBe(2);
  });

  it("API呼び出しがエラーの場合はリスクなしとして扱う", async () => {
    const mockClient = {
      fetchTile: vi.fn().mockRejectedValue(new Error("network error")),
    } as any;

    const result = await fetchDisasterRisk(mockClient, { lat: 35.69, lng: 139.70 });

    expect(result.floodRisk).toBe(false);
    expect(result.landslideRisk).toBe(false);
    expect(result.evacuationSiteCount).toBe(0);
  });
});
