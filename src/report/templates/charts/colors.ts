import { IndicatorCategory, IndicatorDefinition } from "../../../scoring/types";
import { escapeHtml } from "../../../utils";

/** カテゴリカラーの定義 */
export interface CategoryColor {
  readonly primary: string;
  readonly light: string;
  readonly dark: string;
  readonly emoji: string;
  readonly label: string;
}

/** カテゴリごとのカラー定義（子育て世帯向けの温かいパレット） */
export const CATEGORY_COLORS: Readonly<Record<IndicatorCategory, CategoryColor>> = {
  childcare: {
    primary: "#10b981",
    light: "#d1fae5",
    dark: "#065f46",
    emoji: "\u{1F476}",
    label: "\u5b50\u80b2\u3066",
  },
  price: {
    primary: "#0ea5e9",
    light: "#e0f2fe",
    dark: "#075985",
    emoji: "\u{1F3e0}",
    label: "\u4f4f\u5b85\u4fa1\u683c",
  },
  safety: {
    primary: "#f43f5e",
    light: "#ffe4e6",
    dark: "#9f1239",
    emoji: "\u{1F6e1}\uFE0F",
    label: "\u5b89\u5168",
  },
  disaster: {
    primary: "#8b5cf6",
    light: "#ede9fe",
    dark: "#5b21b6",
    emoji: "\u{1F30a}",
    label: "\u707d\u5bb3",
  },
  transport: {
    primary: "#f59e0b",
    light: "#fef3c7",
    dark: "#92400e",
    emoji: "\u{1F683}",
    label: "\u4ea4\u901a",
  },
};

/** 都市ごとのチャートカラー（最大7都市対応） */
export const CITY_COLORS: ReadonlyArray<string> = [
  "#0ea5e9",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

/** カテゴリカラーを取得 */
export function getCategoryColor(category: IndicatorCategory): CategoryColor {
  return CATEGORY_COLORS[category];
}

/** 指標IDからカテゴリを解決 */
export function getCategoryForIndicator(
  indicatorId: string,
  definitions: ReadonlyArray<IndicatorDefinition>,
): IndicatorCategory | undefined {
  return definitions.find((d) => d.id === indicatorId)?.category;
}

/** 都市インデックスからチャートカラーを取得 */
export function getCityColor(index: number): string {
  return CITY_COLORS[index % CITY_COLORS.length];
}

/** カテゴリバッジHTMLを生成 */
export function renderCategoryBadge(category: IndicatorCategory): string {
  const c = CATEGORY_COLORS[category];
  return `<span class="category-badge" style="background:${c.light};color:${c.dark};border:1px solid ${c.primary}33;">${c.emoji} ${escapeHtml(c.label)}</span>`;
}

/** 全カテゴリの凡例バッジを横並びで生成 */
export function renderCategoryLegend(
  categories: ReadonlyArray<IndicatorCategory>,
): string {
  const badges = categories.map((cat) => renderCategoryBadge(cat)).join("");
  return `<div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">${badges}</div>`;
}
