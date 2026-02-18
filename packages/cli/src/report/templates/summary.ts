import {
  escapeHtml,
  generateComparisonNarrative,
  CATEGORY_COLORS,
  getCityColor,
} from "@townlens/core";
import type {
  CityScoreResult,
  ConfidenceLevel,
  IndicatorCategory,
  IndicatorDefinition,
} from "@townlens/core";
import { renderRadarChart, RadarChartData } from "./charts/radar";

export interface SummaryModel {
  readonly results: ReadonlyArray<CityScoreResult>;
  readonly presetLabel: string;
  readonly definitions: ReadonlyArray<IndicatorDefinition>;
}

function confidenceBadge(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return `<span class="badge badge-${level}">${labels[level]}</span>`;
}

function rankMedal(rank: number): string {
  if (rank === 1) return `<span style="font-size:24px;">\ud83e\udd47</span>`;
  if (rank === 2) return `<span style="font-size:24px;">\ud83e\udd48</span>`;
  if (rank === 3) return `<span style="font-size:24px;">\ud83e\udd49</span>`;
  return `<span style="font-size:20px;font-weight:700;color:#64748b;">${rank}\u4f4d</span>`;
}

/** カテゴリ別平均スコアを算出 */
function computeCategoryAverages(
  result: CityScoreResult,
  definitions: ReadonlyArray<IndicatorDefinition>,
): ReadonlyArray<{
  readonly category: IndicatorCategory;
  readonly avgScore: number;
}> {
  const categories = [
    ...new Set(definitions.map((d) => d.category)),
  ] as IndicatorCategory[];
  return categories.map((cat) => {
    const catDefs = definitions.filter((d) => d.category === cat);
    const scores = catDefs
      .map((d) => result.choice.find((c) => c.indicatorId === d.id)?.score)
      .filter((s): s is number => s !== undefined);
    const avg =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    return { category: cat, avgScore: avg };
  });
}

/** レーダーチャート用データを構築 */
function buildRadarData(
  results: ReadonlyArray<CityScoreResult>,
  definitions: ReadonlyArray<IndicatorDefinition>,
): RadarChartData {
  const categories = [
    ...new Set(definitions.map((d) => d.category)),
  ] as IndicatorCategory[];

  return {
    labels: categories.map((cat) => CATEGORY_COLORS[cat].label),
    datasets: results.map((r, i) => {
      const avgs = computeCategoryAverages(r, definitions);
      return {
        name: r.cityName,
        values: categories.map(
          (cat) => avgs.find((a) => a.category === cat)?.avgScore ?? 0,
        ),
        color: getCityColor(i),
      };
    }),
    categoryColors: categories.map((cat) => CATEGORY_COLORS[cat].primary),
  };
}

export function renderSummary(model: SummaryModel): string {
  const sorted = [...model.results].sort((a, b) => a.rank - b.rank);

  // レーダーチャート（3カテゴリ以上で表示）
  const radarData = buildRadarData(model.results, model.definitions);
  const radarSvg = renderRadarChart(radarData, { size: 340, showLegend: true });

  // ランキングカード
  const rankingCards = sorted
    .map((r) => {
      const cityIdx = model.results.findIndex(
        (res) => res.areaCode === r.areaCode,
      );
      const cityColor = getCityColor(cityIdx);
      const scoreColor =
        r.compositeScore >= 70
          ? "#10b981"
          : r.compositeScore >= 40
            ? "#f59e0b"
            : "#f43f5e";

      return `
        <div class="ranking-card" style="border-left:5px solid ${cityColor};flex:1;min-width:140px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            ${rankMedal(r.rank)}
            <span style="font-size:16px;font-weight:700;color:#1e293b;">${escapeHtml(r.cityName)}</span>
          </div>
          <div style="font-size:32px;font-weight:800;color:${scoreColor};line-height:1.1;">${r.compositeScore.toFixed(1)}</div>
          <div style="font-size:11px;color:#64748b;margin:4px 0 8px 0;">\u7dcf\u5408\u30b9\u30b3\u30a2</div>
          ${confidenceBadge(r.confidence.level)}
          ${r.notes.length > 0 ? `<div class="note" style="margin-top:6px;">${escapeHtml(r.notes[0])}</div>` : ""}
        </div>`;
    })
    .join("\n");

  return `
    <section class="page">
      <h2>\u7d50\u8ad6\u30b5\u30de\u30ea</h2>
      <p class="meta">\u30d7\u30ea\u30bb\u30c3\u30c8: ${escapeHtml(model.presetLabel)} / \u5019\u88dc\u5185\u6bd4\u8f03\u30b9\u30b3\u30a2\u306b\u57fa\u3065\u304f\u30e9\u30f3\u30ad\u30f3\u30b0</p>

      <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap;">
        ${radarSvg ? `<div class="chart-container" style="flex-shrink:0;">${radarSvg}</div>` : ""}
        <div style="display:flex;flex-direction:column;gap:12px;flex:1;min-width:200px;">
          ${rankingCards}
        </div>
      </div>

      <div class="narrative" style="margin-top:16px;">
        <h3>\u7dcf\u5408\u8a55\u4fa1</h3>
        <p>${escapeHtml(generateComparisonNarrative(model.results, model.definitions))}</p>
      </div>

      <div class="note" style="margin-top:12px;">
        \u203b \u7dcf\u5408\u30b9\u30b3\u30a2\u306f\u5019\u88dc\u5185\u3067\u306e\u76f8\u5bfe\u6bd4\u8f03\u5024\uff080-100\uff09\u3067\u3059\u3002\u5168\u56fd\u57fa\u6e96\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002<br>
        \u203b \u4fe1\u983c\u5ea6\u306f\u30c7\u30fc\u30bf\u306e\u9bae\u5ea6\u30fb\u6b20\u640d\u7387\u306b\u57fa\u3065\u304f\u53c2\u8003\u5024\u3067\u3059\u3002
      </div>
    </section>`;
}
