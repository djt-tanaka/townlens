import { describe, it, expect } from "vitest";
import {
  TERMINAL_STATIONS,
  nearestTerminalDistance,
  nearestTerminalDistanceKm,
} from "../../src/station/terminal-stations";

describe("TERMINAL_STATIONS", () => {
  it("15駅定義されている", () => {
    expect(TERMINAL_STATIONS).toHaveLength(15);
  });

  it("全駅がname, lat, lngを持つ", () => {
    for (const station of TERMINAL_STATIONS) {
      expect(station.name).toBeTruthy();
      expect(station.lat).toBeGreaterThan(25);
      expect(station.lat).toBeLessThan(50);
      expect(station.lng).toBeGreaterThan(125);
      expect(station.lng).toBeLessThan(150);
    }
  });
});

describe("nearestTerminalDistance", () => {
  it("東京駅付近では東京駅が最寄り", () => {
    const result = nearestTerminalDistance(35.6812, 139.7671);
    expect(result.stationName).toBe("東京");
    expect(result.distanceKm).toBeLessThan(1);
  });

  it("横浜駅付近では横浜駅が最寄り", () => {
    const result = nearestTerminalDistance(35.4660, 139.6223);
    expect(result.stationName).toBe("横浜");
    expect(result.distanceKm).toBeLessThan(1);
  });

  it("大阪駅付近では大阪駅が最寄り", () => {
    const result = nearestTerminalDistance(34.7025, 135.4959);
    expect(result.stationName).toBe("大阪");
    expect(result.distanceKm).toBeLessThan(1);
  });

  it("札幌駅付近では札幌駅が最寄り", () => {
    const result = nearestTerminalDistance(43.0687, 141.3508);
    expect(result.stationName).toBe("札幌");
    expect(result.distanceKm).toBeLessThan(1);
  });

  it("世田谷区の代表地点では渋谷が最寄り", () => {
    const result = nearestTerminalDistance(35.6461, 139.6530);
    expect(["渋谷", "品川", "新宿"]).toContain(result.stationName);
    expect(result.distanceKm).toBeLessThan(10);
  });
});

describe("nearestTerminalDistanceKm", () => {
  it("数値のみを返す", () => {
    const result = nearestTerminalDistanceKm(35.6812, 139.7671);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("nearestTerminalDistanceと同じ値を返す", () => {
    const full = nearestTerminalDistance(35.6812, 139.7671);
    const km = nearestTerminalDistanceKm(35.6812, 139.7671);
    expect(km).toBe(full.distanceKm);
  });
});
