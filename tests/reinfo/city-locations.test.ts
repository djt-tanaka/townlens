import { describe, it, expect } from "vitest";
import { getCityLocation, CITY_LOCATIONS } from "../../src/reinfo/city-locations";

describe("getCityLocation", () => {
  it("登録済みの市区町村コードで座標を返す", () => {
    const loc = getCityLocation("13104");
    expect(loc).not.toBeNull();
    expect(loc!.lat).toBeCloseTo(35.69, 1);
    expect(loc!.lng).toBeCloseTo(139.70, 1);
  });

  it("未登録の市区町村コードでnullを返す", () => {
    expect(getCityLocation("99999")).toBeNull();
  });

  it("全エントリが有効な緯度経度を持つ", () => {
    for (const [code, loc] of CITY_LOCATIONS) {
      expect(loc.lat).toBeGreaterThan(20);
      expect(loc.lat).toBeLessThan(50);
      expect(loc.lng).toBeGreaterThan(120);
      expect(loc.lng).toBeLessThan(150);
    }
  });

  it("5桁の市区町村コードが格納されている", () => {
    for (const code of CITY_LOCATIONS.keys()) {
      expect(code).toMatch(/^\d{5}$/);
    }
  });
});
