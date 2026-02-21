import { describe, it, expect } from "vitest";
import { findNearbyCities } from "../../src/lib/nearby-cities";

describe("findNearbyCities", () => {
  it("世田谷区の近隣都市を距離順で返す", () => {
    const results = findNearbyCities("13112", 6);

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(6);

    // 自身を含まない
    expect(results.every((r) => r.code !== "13112")).toBe(true);

    // 距離が昇順
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distance).toBeGreaterThanOrEqual(
        results[i - 1].distance,
      );
    }
  });

  it("各結果に必要なフィールドが含まれる", () => {
    const results = findNearbyCities("13112", 3);

    for (const city of results) {
      expect(city.code).toMatch(/^\d{5}$/);
      expect(city.name.length).toBeGreaterThan(0);
      expect(city.prefecture.length).toBeGreaterThan(0);
      expect(city.distance).toBeGreaterThanOrEqual(0);
    }
  });

  it("世田谷区の近隣は都内の区が上位に来る", () => {
    const results = findNearbyCities("13112", 3);

    // 世田谷区から最も近い都市は東京都内の区のはず
    expect(results[0].prefecture).toBe("東京都");
  });

  it("未登録の市区町村コードでは空配列を返す", () => {
    const results = findNearbyCities("99999");
    expect(results).toEqual([]);
  });

  it("limit で返却件数を制限できる", () => {
    const results = findNearbyCities("13112", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("大阪市の近隣は関西の都市が上位に来る", () => {
    const results = findNearbyCities("27100", 5);

    expect(results.length).toBeGreaterThan(0);
    // 大阪市の近隣上位は大阪府内の都市のはず
    const osakaCount = results.filter(
      (r) => r.prefecture === "大阪府",
    ).length;
    expect(osakaCount).toBeGreaterThan(0);
  });
});
