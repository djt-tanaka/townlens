/**
 * 駅データベースの基本テスト。
 */
import { describe, it, expect } from "vitest";
import { findStationByName, getAllStationNames, getStationCount } from "../../src/station/stations";

describe("findStationByName", () => {
  it("存在する駅名で StationEntry を返す", () => {
    const results = findStationByName("渋谷");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe("渋谷");
    expect(results[0].lat).toBeCloseTo(35.658, 2);
    expect(results[0].lng).toBeCloseTo(139.702, 2);
  });

  it("複数路線に存在する駅名は複数エントリを返す", () => {
    const results = findStationByName("品川");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const lineNames = results.map((r) => r.lineName);
    expect(lineNames).toContain("JR山手線");
    expect(lineNames).toContain("JR東海道新幹線");
  });

  it("存在しない駅名は空配列を返す", () => {
    const results = findStationByName("存在しない駅");
    expect(results).toEqual([]);
  });

  it("areaCode が設定されている駅がある", () => {
    const results = findStationByName("新宿");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].areaCode).toBe("13104");
  });
});

describe("getAllStationNames", () => {
  it("重複なしの駅名リストを返す", () => {
    const names = getAllStationNames();
    expect(names.length).toBeGreaterThan(50);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("主要駅が含まれる", () => {
    const names = getAllStationNames();
    expect(names).toContain("東京");
    expect(names).toContain("大阪");
    expect(names).toContain("名古屋");
  });
});

describe("getStationCount", () => {
  it("登録されたエントリ数を返す（重複含む）", () => {
    const count = getStationCount();
    expect(count).toBeGreaterThan(90);
  });
});
