import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCityLocation, getCityLocationAsync, CITY_LOCATIONS } from "../../src/reinfo/city-locations";

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

describe("getCityLocationAsync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("静的テーブルに登録済みならAPIを呼ばずに返す", async () => {
    const loc = await getCityLocationAsync("13104");
    expect(loc).not.toBeNull();
    expect(loc!.lat).toBeCloseTo(35.69, 1);
  });

  it("未登録でcityNameなしならnullを返す", async () => {
    const loc = await getCityLocationAsync("99999");
    expect(loc).toBeNull();
  });

  it("未登録でcityNameありなら国土地理院APIにフォールバックする", async () => {
    vi.doMock("../../src/reinfo/geocode", () => ({
      geocodeCityName: vi.fn().mockResolvedValue({ lat: 34.9587, lng: 137.0851 }),
    }));

    const { getCityLocationAsync: fn } = await import("../../src/reinfo/city-locations");
    const loc = await fn("23212", "安城市");
    expect(loc).not.toBeNull();
    expect(loc!.lat).toBeCloseTo(34.96, 1);
  });

  it("ジオコーディング失敗時にnullを返す", async () => {
    vi.doMock("../../src/reinfo/geocode", () => ({
      geocodeCityName: vi.fn().mockResolvedValue(null),
    }));

    const { getCityLocationAsync: fn } = await import("../../src/reinfo/city-locations");
    const loc = await fn("99999", "存在しない市");
    expect(loc).toBeNull();
  });
});
