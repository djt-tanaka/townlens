import { describe, it, expect } from "vitest";
import { haversineDistanceKm } from "../../src/station/haversine";

describe("haversineDistanceKm", () => {
  it("同一地点の距離は0km", () => {
    const result = haversineDistanceKm(35.6812, 139.7671, 35.6812, 139.7671);
    expect(result).toBe(0);
  });

  it("東京駅→大阪駅 ≈ 400km", () => {
    const tokyo = { lat: 35.6812, lng: 139.7671 };
    const osaka = { lat: 34.7025, lng: 135.4959 };
    const result = haversineDistanceKm(tokyo.lat, tokyo.lng, osaka.lat, osaka.lng);
    expect(result).toBeGreaterThan(380);
    expect(result).toBeLessThan(420);
  });

  it("東京駅→渋谷駅 ≈ 5-10km（近距離）", () => {
    const tokyo = { lat: 35.6812, lng: 139.7671 };
    const shibuya = { lat: 35.6580, lng: 139.7016 };
    const result = haversineDistanceKm(tokyo.lat, tokyo.lng, shibuya.lat, shibuya.lng);
    expect(result).toBeGreaterThan(4);
    expect(result).toBeLessThan(10);
  });

  it("東京駅→札幌駅 ≈ 800-850km（長距離）", () => {
    const tokyo = { lat: 35.6812, lng: 139.7671 };
    const sapporo = { lat: 43.0687, lng: 141.3508 };
    const result = haversineDistanceKm(tokyo.lat, tokyo.lng, sapporo.lat, sapporo.lng);
    expect(result).toBeGreaterThan(800);
    expect(result).toBeLessThan(850);
  });

  it("引数の順序を入れ替えても同じ結果（対称性）", () => {
    const a = haversineDistanceKm(35.6812, 139.7671, 34.7025, 135.4959);
    const b = haversineDistanceKm(34.7025, 135.4959, 35.6812, 139.7671);
    expect(a).toBeCloseTo(b, 10);
  });
});
