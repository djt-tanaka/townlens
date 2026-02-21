import { describe, it, expect } from "vitest";
import {
  findStationByName,
  getAllStationNames,
  getStationCount,
  countStationsByAreaCode,
} from "../../src/station/stations";

describe("findStationByName", () => {
  it("東京駅を検索できる", () => {
    const stations = findStationByName("東京");
    expect(stations.length).toBeGreaterThan(0);
    expect(stations[0].name).toBe("東京");
    expect(stations[0].lineName).toBe("JR山手線");
    expect(stations[0].lat).toBeCloseTo(35.6812, 3);
  });

  it("存在しない駅は空配列を返す", () => {
    const stations = findStationByName("存在しない駅");
    expect(stations).toHaveLength(0);
  });
});

describe("getAllStationNames", () => {
  it("重複なしの駅名リストを返す", () => {
    const names = getAllStationNames();
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it("東京駅が含まれる", () => {
    const names = getAllStationNames();
    expect(names).toContain("東京");
  });
});

describe("getStationCount", () => {
  it("正の数を返す", () => {
    const count = getStationCount();
    expect(count).toBeGreaterThan(50);
  });
});

describe("countStationsByAreaCode", () => {
  it("Mapを返す", () => {
    const counts = countStationsByAreaCode();
    expect(counts).toBeInstanceOf(Map);
    expect(counts.size).toBeGreaterThan(0);
  });

  it("渋谷区(13113)に複数駅がある", () => {
    const counts = countStationsByAreaCode();
    const shibuyaCount = counts.get("13113");
    expect(shibuyaCount).toBeDefined();
    expect(shibuyaCount!).toBeGreaterThan(1);
  });

  it("areaCodeが未設定の駅はカウントしない", () => {
    const counts = countStationsByAreaCode();
    expect(counts.has(undefined as any)).toBe(false);
  });
});
