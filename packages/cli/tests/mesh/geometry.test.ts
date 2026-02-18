import { describe, it, expect } from "vitest";
import {
  latLngToMeshCode,
  meshCodeToCenter,
  detectMeshLevel,
  isValidMeshCode,
  meshCodesInRadius,
  getAdjacentMeshCodes,
} from "../../src/mesh/geometry";

describe("latLngToMeshCode", () => {
  // 東京駅付近: 35.6812, 139.7671
  it("3次メッシュコードを算出する（東京駅付近）", () => {
    const code = latLngToMeshCode(35.6812, 139.7671, 3);
    expect(code).toBe("53394611");
  });

  it("1次メッシュコードを算出する", () => {
    const code = latLngToMeshCode(35.6812, 139.7671, 1);
    expect(code).toBe("5339");
  });

  it("2次メッシュコードを算出する", () => {
    const code = latLngToMeshCode(35.6812, 139.7671, 2);
    expect(code).toBe("533946");
  });

  // 渋谷駅付近: 35.6580, 139.7016
  // 1次:53,39 → 2次:q=3,v=5 → 3次:r=8,w=6 = "53393586"
  it("渋谷駅付近の3次メッシュを算出する", () => {
    const code = latLngToMeshCode(35.6580, 139.7016, 3);
    expect(code).toBe("53393586");
  });

  // 大阪駅付近: 34.7025, 135.4959
  // 1次:52,35 → 2次:q=0,v=3 → 3次:r=4,w=9 = "52350349"
  it("大阪駅付近の3次メッシュを算出する", () => {
    const code = latLngToMeshCode(34.7025, 135.4959, 3);
    expect(code).toBe("52350349");
  });

  // 札幌駅付近: 43.0687, 141.3508
  // 1次:64,41 → 2次:q=4,v=2 → 3次:r=8,w=8 = "64414288"
  it("札幌駅付近の3次メッシュを算出する", () => {
    const code = latLngToMeshCode(43.0687, 141.3508, 3);
    expect(code).toBe("64414288");
  });
});

describe("meshCodeToCenter", () => {
  it("3次メッシュコードから中心座標を算出する", () => {
    // "53394611": SW corner: lat=53/1.5+4*5/60+1*30/3600, lng=39+100+6*7.5/60+1*45/3600
    const swLat = 53 / 1.5 + 4 * (5 / 60) + 1 * (30 / 3600);
    const swLng = 139 + 6 * (7.5 / 60) + 1 * (45 / 3600);
    const center = meshCodeToCenter("53394611");
    expect(center.lat).toBeCloseTo(swLat + 15 / 3600, 5);
    expect(center.lng).toBeCloseTo(swLng + 22.5 / 3600, 5);
  });

  it("1次メッシュコードから中心座標を算出する", () => {
    // "5339": SW: lat=53/1.5=35.333, lng=139, cell: 40min×1度
    const center = meshCodeToCenter("5339");
    expect(center.lat).toBeCloseTo(53 / 1.5 + 20 / 60, 3);
    expect(center.lng).toBeCloseTo(139 + 0.5, 3);
  });

  it("2次メッシュコードから中心座標を算出する", () => {
    // "533946": SW: lat=53/1.5+4*5/60, lng=139+6*7.5/60, cell: 5min×7.5min
    const swLat = 53 / 1.5 + 4 * (5 / 60);
    const swLng = 139 + 6 * (7.5 / 60);
    const center = meshCodeToCenter("533946");
    expect(center.lat).toBeCloseTo(swLat + 2.5 / 60, 4);
    expect(center.lng).toBeCloseTo(swLng + 3.75 / 60, 4);
  });

  it("ラウンドトリップ: latLng→meshCode→center は近い値になる", () => {
    const lat = 35.6812;
    const lng = 139.7671;
    const code = latLngToMeshCode(lat, lng, 3);
    const center = meshCodeToCenter(code);
    // 3次メッシュは約1km²なので、中心との差は小さい
    expect(Math.abs(center.lat - lat)).toBeLessThan(0.01);
    expect(Math.abs(center.lng - lng)).toBeLessThan(0.01);
  });
});

describe("detectMeshLevel", () => {
  it("4桁コードを1次メッシュと判定する", () => {
    expect(detectMeshLevel("5339")).toBe(1);
  });

  it("6桁コードを2次メッシュと判定する", () => {
    expect(detectMeshLevel("533946")).toBe(2);
  });

  it("8桁コードを3次メッシュと判定する", () => {
    expect(detectMeshLevel("53394611")).toBe(3);
  });

  it("9桁コードを半メッシュと判定する", () => {
    expect(detectMeshLevel("533946111")).toBe("half");
  });

  it("不正な桁数はnullを返す", () => {
    expect(detectMeshLevel("123")).toBeNull();
    expect(detectMeshLevel("12345")).toBeNull();
    expect(detectMeshLevel("1234567890")).toBeNull();
  });
});

describe("isValidMeshCode", () => {
  it("有効なメッシュコードを判定する", () => {
    expect(isValidMeshCode("5339")).toBe(true);
    expect(isValidMeshCode("533946")).toBe(true);
    expect(isValidMeshCode("53394611")).toBe(true);
    expect(isValidMeshCode("533946111")).toBe(true);
  });

  it("数字以外を含むコードは無効", () => {
    expect(isValidMeshCode("5339AB")).toBe(false);
    expect(isValidMeshCode("")).toBe(false);
  });

  it("不正な桁数は無効", () => {
    expect(isValidMeshCode("123")).toBe(false);
    expect(isValidMeshCode("12345")).toBe(false);
  });
});

describe("meshCodesInRadius", () => {
  it("指定地点の半径内メッシュコードを返す", () => {
    // 東京駅付近、半径500mで複数メッシュが返る
    const codes = meshCodesInRadius(35.6812, 139.7671, 500, 3);
    expect(codes.length).toBeGreaterThan(0);
    // 中心メッシュが含まれる
    expect(codes).toContain("53394611");
  });

  it("半径0mでは中心メッシュのみ返る", () => {
    const codes = meshCodesInRadius(35.6812, 139.7671, 0, 3);
    expect(codes).toHaveLength(1);
    expect(codes[0]).toBe("53394611");
  });

  it("半径1000mでは中心の周囲を含む", () => {
    const codes = meshCodesInRadius(35.6812, 139.7671, 1000, 3);
    expect(codes.length).toBeGreaterThanOrEqual(4);
    // 重複なし
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("getAdjacentMeshCodes", () => {
  it("3次メッシュの隣接8メッシュを返す", () => {
    const codes = getAdjacentMeshCodes("53394611");
    expect(codes).toHaveLength(8);
    // 元のコードは含まない
    expect(codes).not.toContain("53394611");
  });

  it("全コードが有効なメッシュコードである", () => {
    const codes = getAdjacentMeshCodes("53394611");
    for (const code of codes) {
      expect(isValidMeshCode(code)).toBe(true);
    }
  });
});
