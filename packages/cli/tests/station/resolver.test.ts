/**
 * 駅名ファジー解決のテスト。
 */
import { describe, it, expect } from "vitest";
import { resolveStation, resolveStations } from "../../src/station/resolver";

describe("resolveStation", () => {
  it("完全一致で駅を解決する", () => {
    const result = resolveStation("渋谷");
    expect(result.stationName).toBe("渋谷");
    expect(result.entries.length).toBeGreaterThanOrEqual(1);
  });

  it("「駅」サフィックスを除去して解決する", () => {
    const result = resolveStation("渋谷駅");
    expect(result.stationName).toBe("渋谷");
  });

  it("「えき」サフィックスを除去して解決する", () => {
    const result = resolveStation("しぶやえき");
    expect(result.stationName).toBe("渋谷");
  });

  it("カタカナ入力で解決する（完全一致）", () => {
    const result = resolveStation("シブヤ");
    expect(result.stationName).toBe("渋谷");
  });

  it("ひらがな入力で解決する（完全一致）", () => {
    const result = resolveStation("しぶや");
    expect(result.stationName).toBe("渋谷");
  });

  it("全角入力を半角化して解決する", () => {
    const result = resolveStation("　渋谷　");
    expect(result.stationName).toBe("渋谷");
  });

  it("部分一致で解決する（前方一致優先）", () => {
    const result = resolveStation("新宿");
    expect(result.stationName).toBe("新宿");
  });

  it("存在しない駅名でエラーをスローする", () => {
    expect(() => resolveStation("幻の駅")).toThrow();
  });

  it("エラーメッセージに候補を含む", () => {
    try {
      resolveStation("幻の駅");
    } catch (error: any) {
      expect(error.message).toContain("解決できません");
    }
  });

  it("路線名のフィルタリングが可能", () => {
    const result = resolveStation("品川", "JR東海道新幹線");
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].lineName).toBe("JR東海道新幹線");
  });

  it("路線フィルタに一致しない場合エラー", () => {
    expect(() => resolveStation("品川", "存在しない路線")).toThrow();
  });
});

describe("resolveStations", () => {
  it("複数駅を一括解決する", () => {
    const results = resolveStations(["渋谷", "新宿", "東京"]);
    expect(results).toHaveLength(3);
    expect(results[0].stationName).toBe("渋谷");
    expect(results[1].stationName).toBe("新宿");
    expect(results[2].stationName).toBe("東京");
  });

  it("1つでも解決できない場合エラーをスローする", () => {
    expect(() => resolveStations(["渋谷", "幻の駅"])).toThrow();
  });
});
