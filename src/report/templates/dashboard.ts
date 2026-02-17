import {
  CityScoreResult,
  IndicatorCategory,
  IndicatorDefinition,
} from "../../scoring/types";
import { escapeHtml } from "../../utils";
import { renderHorizontalBarChart, BarChartItem } from "./charts/bar";
import { CATEGORY_COLORS, getCityColor } from "./charts/colors";

export interface DashboardModel {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
}

/** 指標をカテゴリ別にグループ化 */
function groupByCategory(
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  readonly category: IndicatorCategory;
  readonly defs: ReadonlyArray<IndicatorDefinition>;
}> {
  const seen = new Set<IndicatorCategory>();
  const groups: Array<{
    readonly category: IndicatorCategory;
    readonly defs: ReadonlyArray<IndicatorDefinition>;
  }> = [];

  for (const def of definitions) {
    if (!seen.has(def.category)) {
      seen.add(def.category);
      groups.push({
        category: def.category,
        defs: definitions.filter((d) => d.category === def.category),
      });
    }
  }
  return groups;
}

/** 指標ごとのバーチャートアイテムを構築 */
function buildBarItems(
  def: IndicatorDefinition,
  results: ReadonlyArray<CityScoreResult>,
): ReadonlyArray<BarChartItem> {
  return results.map((r, i) => {
    const cs = r.choice.find((c) => c.indicatorId === def.id);
    return {
      label: r.cityName,
      value: cs?.score ?? 0,
      color: getCityColor(i),
    };
  });
}

export function renderDashboard(model: DashboardModel): string {
  const groups = groupByCategory(model.definitions);

  const sections = groups
    .map((group) => {
      const catColor = CATEGORY_COLORS[group.category];

      const indicatorCharts = group.defs
        .map((def) => {
          const barItems = buildBarItems(def, model.results);
          const barSvg = renderHorizontalBarChart(barItems, {
            width: 500,
            barHeight: 24,
            gap: 8,
            labelWidth: 90,
          });

          // パーセンタイル情報
          const percentileInfo = model.results
            .map((r) => {
              const bs = r.baseline.find((b) => b.indicatorId === def.id);
              return bs
                ? `${escapeHtml(r.cityName)}: ${bs.percentile.toFixed(1)}%`
                : null;
            })
            .filter(Boolean)
            .join(" / ");

          return `
            <div class="indicator-card" style="border-left:3px solid ${catColor.primary};">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
                <strong style="font-size:14px;">${escapeHtml(def.label)}</strong>
                <span class="note">${escapeHtml(def.unit)}</span>
              </div>
              ${barSvg}
              ${percentileInfo ? `<div class="note" style="margin-top:4px;">\u30d1\u30fc\u30bb\u30f3\u30bf\u30a4\u30eb: ${percentileInfo}</div>` : ""}
            </div>`;
        })
        .join("\n");

      return `
        <div class="category-section">
          <div class="category-header" style="background:${catColor.light};color:${catColor.dark};">
            <span style="font-size:20px;">${catColor.emoji}</span>
            ${escapeHtml(catColor.label)}
          </div>
          ${indicatorCharts}
        </div>`;
    })
    .join("\n");

  return `
    <section class="page">
      <h2>\u6307\u6a19\u30c0\u30c3\u30b7\u30e5\u30dc\u30fc\u30c9</h2>
      <p class="meta">\u5019\u88dc\u5185\u6bd4\u8f03\u30b9\u30b3\u30a2\uff08Choice Score: 0-100\uff09\u306b\u3088\u308b\u6307\u6a19\u5225\u306e\u90fd\u5e02\u6bd4\u8f03</p>
      ${sections}
      <div class="note" style="margin-top:12px;">
        \u203b \u5019\u88dc\u30bb\u30c3\u30c8\u5185\u3067\u306e\u76f8\u5bfe\u30d1\u30fc\u30bb\u30f3\u30bf\u30a4\u30eb\u3067\u3059\u3002
      </div>
    </section>`;
}
