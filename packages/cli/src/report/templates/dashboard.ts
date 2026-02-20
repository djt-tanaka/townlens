import { escapeHtml, CATEGORY_COLORS, getCityColor, starColor } from "@townlens/core";
import type { CityScoreResult, IndicatorCategory, IndicatorDefinition } from "@townlens/core";
import { renderHorizontalBarChart, BarChartItem } from "./charts/bar";

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

          // スター評価情報（全国ベースライン）
          const starInfo = model.results
            .map((r) => {
              const is = r.indicatorStars?.find((s) => s.indicatorId === def.id);
              if (!is) return null;
              const filled = "\u2605";
              const empty = "\u2606";
              return `${escapeHtml(r.cityName)}: ${filled.repeat(is.stars)}${empty.repeat(5 - is.stars)}`;
            })
            .filter(Boolean)
            .join(" / ");

          // パーセンタイル情報（フォールバック）
          const percentileInfo = !starInfo
            ? model.results
                .map((r) => {
                  const bs = r.baseline.find((b) => b.indicatorId === def.id);
                  return bs
                    ? `${escapeHtml(r.cityName)}: ${bs.percentile.toFixed(1)}%`
                    : null;
                })
                .filter(Boolean)
                .join(" / ")
            : "";

          return `
            <div class="indicator-card" style="border-left:3px solid ${catColor.primary};">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
                <strong style="font-size:14px;">${escapeHtml(def.label)}</strong>
                <span class="note">${escapeHtml(def.unit)}</span>
              </div>
              ${barSvg}
              ${starInfo ? `<div class="note" style="margin-top:4px;">\u5168\u56fd\u8a55\u4fa1: ${starInfo}</div>` : ""}
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
      <p class="meta">\u5168\u56fd\u30d9\u30fc\u30b9\u30e9\u30a4\u30f3\u57fa\u6e96\u306e5\u6bb5\u968e\u30b9\u30bf\u30fc\u8a55\u4fa1\u306b\u3088\u308b\u6307\u6a19\u5225\u306e\u90fd\u5e02\u6bd4\u8f03</p>
      ${sections}
      <div class="note" style="margin-top:12px;">
        \u203b \u30b9\u30bf\u30fc\u8a55\u4fa1\u306f\u5168\u56fd\u5e02\u533a\u753a\u6751\u306e\u7d71\u8a08\u5206\u5e03\u3092\u57fa\u6e96\u3068\u3057\u305f5\u6bb5\u968e\u8a55\u4fa1\u3067\u3059\u3002\u30d0\u30fc\u30c1\u30e3\u30fc\u30c8\u306f\u5019\u88dc\u5185\u6bd4\u8f03\u30b9\u30b3\u30a2\u3067\u3059\u3002
      </div>
    </section>`;
}
