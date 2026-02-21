import { describe, it, expect } from "vitest";
import {
  RANKING_PRESET_META,
  findRankingPresetMeta,
  isValidPresetSlug,
} from "@/lib/ranking-presets";

describe("RANKING_PRESET_META", () => {
  it("3つのプリセットが定義されている", () => {
    expect(RANKING_PRESET_META).toHaveLength(3);
  });

  it("各プリセットに必須フィールドが存在する", () => {
    for (const meta of RANKING_PRESET_META) {
      expect(meta.name).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.iconName).toBeTruthy();
      expect(meta.slug).toBeTruthy();
    }
  });

  it("childcare / price / safety の3種類が含まれる", () => {
    const names = RANKING_PRESET_META.map((m) => m.name);
    expect(names).toContain("childcare");
    expect(names).toContain("price");
    expect(names).toContain("safety");
  });
});

describe("findRankingPresetMeta", () => {
  it("存在するプリセット名でメタ情報を返す", () => {
    const meta = findRankingPresetMeta("childcare");
    expect(meta).toBeDefined();
    expect(meta?.name).toBe("childcare");
    expect(meta?.label).toBe("子育てしやすい街");
  });

  it("price プリセットを返す", () => {
    const meta = findRankingPresetMeta("price");
    expect(meta).toBeDefined();
    expect(meta?.name).toBe("price");
  });

  it("safety プリセットを返す", () => {
    const meta = findRankingPresetMeta("safety");
    expect(meta).toBeDefined();
    expect(meta?.name).toBe("safety");
  });

  it("存在しないプリセット名で undefined を返す", () => {
    expect(findRankingPresetMeta("invalid")).toBeUndefined();
    expect(findRankingPresetMeta("")).toBeUndefined();
  });
});

describe("isValidPresetSlug", () => {
  it("有効なスラグで true を返す", () => {
    expect(isValidPresetSlug("childcare")).toBe(true);
    expect(isValidPresetSlug("price")).toBe(true);
    expect(isValidPresetSlug("safety")).toBe(true);
  });

  it("無効なスラグで false を返す", () => {
    expect(isValidPresetSlug("invalid")).toBe(false);
    expect(isValidPresetSlug("")).toBe(false);
    expect(isValidPresetSlug("CHILDCARE")).toBe(false);
  });
});
