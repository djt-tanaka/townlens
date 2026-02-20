import { describe, it, expect } from "vitest";
import {
  CATEGORY_COLORS,
  CITY_COLORS,
  getCategoryColor,
  getCategoryForIndicator,
  getCityColor,
  renderCategoryBadge,
  renderCategoryLegend,
} from "../../src/charts/colors";
import { IndicatorDefinition } from "../../src/scoring/types";

const definitions: ReadonlyArray<IndicatorDefinition> = [
  { id: "population_total", label: "総人口", unit: "人", direction: "higher_better", category: "childcare", precision: 0 },
  { id: "condo_price_median", label: "中古マンション価格", unit: "万円", direction: "lower_better", category: "price", precision: 0 },
];

describe("CATEGORY_COLORS", () => {
  it("6カテゴリ全てが定義されている", () => {
    expect(Object.keys(CATEGORY_COLORS)).toEqual(
      expect.arrayContaining(["childcare", "education", "price", "safety", "disaster", "transport"]),
    );
  });

  it("各カテゴリにprimary/light/dark/emoji/labelが含まれる", () => {
    for (const color of Object.values(CATEGORY_COLORS)) {
      expect(color.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(color.light).toMatch(/^#[0-9a-f]{6}$/);
      expect(color.dark).toMatch(/^#[0-9a-f]{6}$/);
      expect(color.emoji).toBeTruthy();
      expect(color.label).toBeTruthy();
    }
  });
});

describe("CITY_COLORS", () => {
  it("7色以上が定義されている", () => {
    expect(CITY_COLORS.length).toBeGreaterThanOrEqual(7);
  });
});

describe("getCategoryColor", () => {
  it("指定カテゴリのカラーを返す", () => {
    const color = getCategoryColor("childcare");
    expect(color.primary).toBe("#10b981");
    expect(color.label).toBe("子育て");
  });
});

describe("getCategoryForIndicator", () => {
  it("指標IDからカテゴリを解決する", () => {
    expect(getCategoryForIndicator("population_total", definitions)).toBe("childcare");
    expect(getCategoryForIndicator("condo_price_median", definitions)).toBe("price");
  });

  it("存在しない指標IDはundefinedを返す", () => {
    expect(getCategoryForIndicator("nonexistent", definitions)).toBeUndefined();
  });
});

describe("getCityColor", () => {
  it("インデックスに対応する色を返す", () => {
    expect(getCityColor(0)).toBe(CITY_COLORS[0]);
    expect(getCityColor(1)).toBe(CITY_COLORS[1]);
  });

  it("配列長を超えるインデックスはループする", () => {
    expect(getCityColor(CITY_COLORS.length)).toBe(CITY_COLORS[0]);
  });
});

describe("renderCategoryBadge", () => {
  it("カテゴリバッジHTMLを生成する", () => {
    const html = renderCategoryBadge("childcare");
    expect(html).toContain("category-badge");
    expect(html).toContain("#10b981");
    expect(html).toContain("子育て");
  });
});

describe("renderCategoryLegend", () => {
  it("複数カテゴリの凡例を横並びで生成する", () => {
    const html = renderCategoryLegend(["childcare", "price"]);
    expect(html).toContain("子育て");
    expect(html).toContain("住宅価格");
    expect(html).toContain("display:flex");
  });
});
